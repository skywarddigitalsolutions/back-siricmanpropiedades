import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from './entities/audit-log.entity';
import { AuditAction } from './enums/audit-action.enum';
import { AuditActor } from './interfaces/audit-actor.interface';

export interface RecordAuditEntry {
  actor?: AuditActor | null;
  action: AuditAction;
  entityType: string;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
}

export interface FindAuditLogsFilters {
  entityType?: string;
  actorId?: string;
  limit?: number;
  offset?: number;
}

@Injectable()
export class AuditLogService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
  ) {}

  /**
   * Registra una acción auditable. Nunca debe lanzar hacia arriba: un fallo
   * al auditar no debería tumbar la operación de negocio que la originó.
   */
  async record(entry: RecordAuditEntry): Promise<void> {
    const log = this.auditLogRepository.create({
      actorId: entry.actor?.id ?? null,
      actorUserName: entry.actor?.userName ?? null,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId ?? null,
      metadata: entry.metadata ?? null,
    });

    await this.auditLogRepository.save(log);
  }

  async findAll(filters?: FindAuditLogsFilters): Promise<AuditLog[]> {
    const query = this.auditLogRepository
      .createQueryBuilder('log')
      .orderBy('log.createdAt', 'DESC');

    if (filters?.entityType)
      query.andWhere('log.entityType = :entityType', {
        entityType: filters.entityType,
      });
    if (filters?.actorId)
      query.andWhere('log.actorId = :actorId', { actorId: filters.actorId });
    if (filters?.limit) query.take(filters.limit);
    if (filters?.offset) query.skip(filters.offset);

    return query.getMany();
  }
}
