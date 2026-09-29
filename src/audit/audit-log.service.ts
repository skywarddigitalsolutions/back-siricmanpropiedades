import { Injectable, Logger } from '@nestjs/common';
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
  private readonly logger = new Logger(AuditLogService.name);

  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
  ) {}

  /**
   * Registra una acción auditable. Nunca lanza hacia arriba: si el guardado
   * en el repositorio falla, el error se captura acá, se loguea como
   * warning con el tipo/id de entidad y la acción, y `record()` igual
   * resuelve. Esto centraliza el fix para todo caller actual y futuro
   * (incluidos los `await record()` sin try/catch de `PropertiesService`),
   * en vez de requerir un wrapper local por servicio.
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

    try {
      await this.auditLogRepository.save(log);
    } catch (err) {
      this.logger.warn(
        `Failed to persist audit log entry (entityType=${entry.entityType}, entityId=${entry.entityId ?? 'null'}, action=${entry.action}): ${(err as Error).message}`,
      );
    }
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
