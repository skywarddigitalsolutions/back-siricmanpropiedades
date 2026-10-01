import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../../users/entities/user.entity';
import { AuthService } from '../auth.service';
import { MfaService } from '../mfa/mfa.service';
import { LoginThrottleService } from '../login-throttle.service';
import { AuditLogService } from '../../audit/audit-log.service';
import { AuditAction } from '../../audit/enums/audit-action.enum';
import { AuditActor } from '../../audit/interfaces/audit-actor.interface';
import { ChangePasswordDto } from './dto/change-password.dto';

/**
 * Autoservicio del usuario autenticado: cambio de contraseña y regeneración
 * de códigos de respaldo. Vive aparte de AuthService porque necesita
 * MfaService (que a su vez depende de AuthService).
 */
@Injectable()
export class AccountService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly mfaService: MfaService,
    private readonly authService: AuthService,
    private readonly loginThrottleService: LoginThrottleService,
    private readonly auditLogService: AuditLogService,
  ) {}

  /**
   * Cambia la contraseña: exige la actual y, con MFA, un código válido
   * (respetando el bloqueo por usuario del MFA). Marca `passwordChangedAt`,
   * lo que invalida todas las demás sesiones, revoca el token usado y
   * devuelve una sesión nueva. Los errores de credenciales son 400 (no 401)
   * para que el front no los confunda con una sesión vencida.
   */
  async changePassword(
    actor: User,
    currentToken: string,
    dto: ChangePasswordDto,
  ) {
    const user = await this.loadUser(actor.id);
    const pwKey = LoginThrottleService.passwordChangeKey(user.id);
    const mfaKey = LoginThrottleService.mfaKey(user.id);

    this.loginThrottleService.assertNotLocked(pwKey);
    if (user.mfaEnabled) this.loginThrottleService.assertNotLocked(mfaKey);

    const isCurrentValid = await bcrypt.compare(
      dto.currentPassword,
      user.password,
    );
    if (!isCurrentValid) {
      this.loginThrottleService.recordFailure(pwKey);
      throw new BadRequestException('Current password is incorrect');
    }

    if (user.mfaEnabled) {
      if (!dto.code) throw new BadRequestException('MFA code is required');
      const isCodeValid = await this.mfaService.verifyLoginCode(
        user.id,
        dto.code,
      );
      if (!isCodeValid) {
        this.loginThrottleService.recordFailure(mfaKey);
        throw new BadRequestException('Invalid code');
      }
      this.loginThrottleService.recordSuccess(mfaKey);
    }

    if (dto.newPassword === dto.currentPassword)
      throw new BadRequestException(
        'New password must be different from the current one',
      );

    user.password = await bcrypt.hash(dto.newPassword, 10);
    user.passwordChangedAt = new Date();
    const saved = await this.userRepository.save(user);
    this.loginThrottleService.recordSuccess(pwKey);

    await this.auditLogService.record({
      actor: { id: user.id, userName: user.userName },
      action: AuditAction.PASSWORD_CHANGED,
      entityType: 'user',
      entityId: user.id,
    });

    // El token usado queda revocado; la sesión nueva se emite después del
    // cambio (su iat no es anterior a passwordChangedAt).
    await this.authService.logout(currentToken);
    return this.authService.buildSessionResponse(saved);
  }

  /** Nuevos códigos de respaldo (texto plano una única vez); exige un TOTP. */
  async regenerateBackupCodes(
    actor: User,
    code: string,
  ): Promise<{ backupCodes: string[] }> {
    const user = await this.loadUser(actor.id);
    if (!user.mfaEnabled) throw new BadRequestException('MFA is not enabled');

    const mfaKey = LoginThrottleService.mfaKey(user.id);
    this.loginThrottleService.assertNotLocked(mfaKey);
    const isValid = await this.mfaService.verifyTotpOnly(user.id, code);
    if (!isValid) {
      this.loginThrottleService.recordFailure(mfaKey);
      throw new BadRequestException('Invalid code');
    }
    this.loginThrottleService.recordSuccess(mfaKey);

    const auditActor: AuditActor = { id: user.id, userName: user.userName };
    const backupCodes = await this.mfaService.regenerateBackupCodes(
      user.id,
      auditActor,
    );
    return { backupCodes };
  }

  private async loadUser(id: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id },
      select: {
        id: true,
        userName: true,
        password: true,
        isActive: true,
        mfaEnabled: true,
      },
      relations: ['userRoles', 'userRoles.role'],
    });
    if (!user) throw new BadRequestException('User not found');
    return user;
  }
}
