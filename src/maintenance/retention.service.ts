import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { LessThan, Repository } from 'typeorm';
import { RevokedToken } from '../auth/entities/revoked-token.entity';
import { AuditLog } from '../audit/entities/audit-log.entity';

/**
 * Limpieza periódica de tablas que crecen indefinidamente.
 * Sin esto, revoked_tokens y audit_logs acumulan filas para siempre.
 */
@Injectable()
export class RetentionService {
  private readonly logger = new Logger(RetentionService.name);
  private readonly auditLogRetentionDays: number;

  constructor(
    @InjectRepository(RevokedToken)
    private readonly revokedTokenRepository: Repository<RevokedToken>,
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
    configService: ConfigService,
  ) {
    this.auditLogRetentionDays = Number(
      configService.get<string>('AUDIT_LOG_RETENTION_DAYS', '365'),
    );
  }

  /**
   * Un token revocado ya no sirve para nada una vez que expiró igual
   * (JwtStrategy lo hubiera rechazado por expiración de todos modos).
   */
  @Cron(CronExpression.EVERY_HOUR)
  async purgeExpiredRevokedTokens(): Promise<void> {
    const result = await this.revokedTokenRepository.delete({
      expiresAt: LessThan(new Date()),
    });

    if (result.affected)
      this.logger.log(`Purged ${result.affected} expired revoked token(s)`);
  }

  /**
   * Retención configurable de audit_logs vía AUDIT_LOG_RETENTION_DAYS.
   */
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async purgeOldAuditLogs(): Promise<void> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - this.auditLogRetentionDays);

    const result = await this.auditLogRepository.delete({
      createdAt: LessThan(cutoff),
    });

    if (result.affected)
      this.logger.log(
        `Purged ${result.affected} audit log(s) older than ${this.auditLogRetentionDays} days`,
      );
  }
}
