import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { IsNull, Repository } from 'typeorm';
import { authenticator } from 'otplib';
import { randomBytes } from 'crypto';
import * as bcrypt from 'bcrypt';
import { User } from '../../users/entities/user.entity';
import { MfaBackupCode } from '../entities/mfa-backup-code.entity';
import { encryptSecret, decryptSecret } from '../../common/utils/crypto.util';
import { AuditLogService } from '../../audit/audit-log.service';
import { AuditAction } from '../../audit/enums/audit-action.enum';
import { AuditActor } from '../../audit/interfaces/audit-actor.interface';

const BACKUP_CODES_COUNT = 10;
// Pasos TOTP de 30 s (otplib por defecto).
const TOTP_STEP_MS = 30_000;
const MAX_TRACKED_TOTP_USERS = 10_000;

@Injectable()
export class MfaService {
  private readonly encryptionKey: string;
  private readonly issuer: string;
  /**
   * Último paso TOTP aceptado por usuario (anti-replay: un código ya usado,
   * o de un paso anterior, no sirve de nuevo dentro de la ventana de ±1
   * paso). En memoria a propósito: la ventana dura ~90 s, así que reiniciar
   * el proceso solo reabre un replay de esa ventana, y evita una migración.
   * Igual que LoginThrottleService, asume una sola instancia.
   */
  private readonly lastTotpStep = new Map<string, number>();

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(MfaBackupCode)
    private readonly backupCodeRepository: Repository<MfaBackupCode>,
    private readonly auditLogService: AuditLogService,
    configService: ConfigService,
  ) {
    const key = configService.get<string>('MFA_ENCRYPTION_KEY');
    if (!key || !/^[0-9a-fA-F]{64}$/.test(key)) {
      throw new Error(
        'MFA_ENCRYPTION_KEY must be configured as a 64-character hex string (32 bytes)',
      );
    }
    this.encryptionKey = key;
    this.issuer = configService.get<string>('MFA_ISSUER', 'BaseAuth');

    // Tolerancia de +-1 paso (30s) para compensar pequeños desfasajes de reloj.
    authenticator.options = { window: 1 };
  }

  /**
   * Inicia el alta de MFA: genera un secreto nuevo (sin confirmar todavía)
   * y devuelve la URI otpauth:// para que el frontend renderice el QR.
   * Exige la contraseña: un token de sesión robado no alcanza para
   * inscribir un secreto ajeno y bloquear al dueño real de la cuenta.
   */
  async startEnrollment(
    userId: string,
    password: string,
  ): Promise<{ secret: string; otpauthUrl: string }> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: {
        id: true,
        userName: true,
        password: true,
        mfaEnabled: true,
      },
    });
    if (!user) throw new NotFoundException('User not found');
    if (user.mfaEnabled)
      throw new BadRequestException('MFA is already enabled');

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid)
      throw new UnauthorizedException('Invalid credentials');

    const secret = authenticator.generateSecret();
    user.mfaSecret = encryptSecret(secret, this.encryptionKey);
    await this.userRepository.save(user);

    return {
      secret,
      otpauthUrl: authenticator.keyuri(user.userName, this.issuer, secret),
    };
  }

  /**
   * Confirma el alta con un código válido, activa MFA y genera los
   * códigos de respaldo (se devuelven en texto plano una única vez).
   */
  async confirmEnrollment(
    userId: string,
    code: string,
    actor: AuditActor,
  ): Promise<{ backupCodes: string[] }> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: { id: true, userName: true, mfaSecret: true, mfaEnabled: true },
    });
    if (!user) throw new NotFoundException('User not found');
    if (user.mfaEnabled)
      throw new BadRequestException('MFA is already enabled');
    if (!user.mfaSecret)
      throw new BadRequestException(
        'No pending MFA enrollment. Call /auth/mfa/enable first',
      );

    const secret = decryptSecret(user.mfaSecret, this.encryptionKey);
    if (!this.verifyTotp(userId, secret, code)) {
      throw new BadRequestException('Invalid code');
    }

    user.mfaEnabled = true;
    user.mfaConfirmedAt = new Date();
    await this.userRepository.save(user);

    const backupCodes = await this.generateBackupCodes(userId);

    await this.auditLogService.record({
      actor,
      action: AuditAction.MFA_ENABLED,
      entityType: 'user',
      entityId: userId,
    });

    return { backupCodes };
  }

  /**
   * Desactiva MFA. Requiere password + un código válido (TOTP o backup).
   * Las cuentas admin no pueden desactivarlo (ver README, regla de negocio).
   */
  async disable(
    userId: string,
    password: string,
    code: string,
    actor: AuditActor,
  ): Promise<void> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: { id: true, password: true, mfaSecret: true, mfaEnabled: true },
      relations: ['userRoles', 'userRoles.role'],
    });
    if (!user) throw new NotFoundException('User not found');
    if (!user.mfaEnabled) throw new BadRequestException('MFA is not enabled');

    const isAdmin = user.userRoles.some(
      (userRole) => userRole.role?.name.toLowerCase() === 'admin',
    );
    if (isAdmin)
      throw new BadRequestException('Admin accounts must keep MFA enabled');

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid)
      throw new UnauthorizedException('Invalid credentials');

    const isCodeValid = await this.verifyCodeOrBackupCode(user, code);
    if (!isCodeValid) throw new UnauthorizedException('Invalid code');

    user.mfaEnabled = false;
    user.mfaSecret = null;
    user.mfaConfirmedAt = null;
    await this.userRepository.save(user);
    await this.backupCodeRepository.delete({ userId });

    await this.auditLogService.record({
      actor,
      action: AuditAction.MFA_DISABLED,
      entityType: 'user',
      entityId: userId,
    });
  }

  /** Usado por el paso 2 del login (POST /auth/mfa/verify). */
  async verifyLoginCode(userId: string, code: string): Promise<boolean> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: { id: true, mfaSecret: true, mfaEnabled: true },
    });
    if (!user?.mfaEnabled || !user.mfaSecret) return false;

    return this.verifyCodeOrBackupCode(user, code);
  }

  private async verifyCodeOrBackupCode(
    user: Pick<User, 'id' | 'mfaSecret'>,
    code: string,
  ): Promise<boolean> {
    if (user.mfaSecret) {
      const secret = decryptSecret(user.mfaSecret, this.encryptionKey);
      if (this.verifyTotp(user.id, secret, code)) return true;
    }
    return this.consumeBackupCode(user.id, code);
  }

  /**
   * Verifica un TOTP y, si es válido, exige que su paso sea mayor al último
   * aceptado para el usuario. Chequeo y registro son síncronos (sin await
   * en el medio), así que dos requests simultáneos no pueden aceptar el
   * mismo paso.
   */
  private verifyTotp(userId: string, secret: string, code: string): boolean {
    const delta = authenticator.checkDelta(code, secret);
    if (delta === null) return false;

    const step = Math.floor(Date.now() / TOTP_STEP_MS) + delta;
    const last = this.lastTotpStep.get(userId);
    if (last !== undefined && step <= last) return false;

    this.rememberTotpStep(userId, step);
    return true;
  }

  private rememberTotpStep(userId: string, step: number): void {
    if (this.lastTotpStep.size >= MAX_TRACKED_TOTP_USERS) {
      // Los pasos viejos (fuera de la ventana de ±1) ya no protegen nada.
      const currentStep = Math.floor(Date.now() / TOTP_STEP_MS);
      for (const [id, s] of this.lastTotpStep) {
        if (s < currentStep - 2) this.lastTotpStep.delete(id);
      }
    }
    this.lastTotpStep.set(userId, step);
  }

  private async consumeBackupCode(
    userId: string,
    code: string,
  ): Promise<boolean> {
    const candidates = await this.backupCodeRepository.find({
      where: { userId, usedAt: IsNull() },
    });

    for (const candidate of candidates) {
      if (await bcrypt.compare(code, candidate.codeHash)) {
        // UPDATE condicional (usedAt IS NULL) para que dos requests
        // simultáneos no puedan consumir el mismo código: solo uno de los
        // dos UPDATE afecta la fila, el otro devuelve affected=0.
        const result = await this.backupCodeRepository.update(
          { id: candidate.id, usedAt: IsNull() },
          { usedAt: new Date() },
        );
        return (result.affected ?? 0) > 0;
      }
    }

    return false;
  }

  private async generateBackupCodes(userId: string): Promise<string[]> {
    await this.backupCodeRepository.delete({ userId });

    const plainCodes: string[] = [];
    const entities: MfaBackupCode[] = [];

    for (let i = 0; i < BACKUP_CODES_COUNT; i++) {
      const code = randomBytes(5).toString('hex');
      plainCodes.push(code);
      entities.push(
        this.backupCodeRepository.create({
          userId,
          codeHash: await bcrypt.hash(code, 10),
        }),
      );
    }

    await this.backupCodeRepository.save(entities);
    return plainCodes;
  }
}
