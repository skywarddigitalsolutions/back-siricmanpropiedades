import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { AuditAction } from '../enums/audit-action.enum';

/**
 * Registro inmutable de acciones sensibles (alta/baja de usuarios, reseteo
 * de password, asignación y creación de roles). No se actualiza ni se borra
 * salvo por la política de retención (ver RetentionService).
 */
@Entity({ name: 'audit_logs' })
@Index(['entityType', 'entityId'])
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Usuario que ejecutó la acción. Null si la disparó el sistema (seed). */
  @Index()
  @Column({ name: 'actor_id', type: 'uuid', nullable: true })
  actorId: string | null;

  /**
   * Copia del userName del actor al momento de la acción. Se desnormaliza
   * a propósito para que el log siga siendo legible aunque el usuario actor
   * sea desactivado o eliminado en el futuro.
   */
  @Column({
    name: 'actor_user_name',
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  actorUserName: string | null;

  @Column({ type: 'varchar', length: 50 })
  action: AuditAction;

  @Column({ name: 'entity_type', type: 'varchar', length: 50 })
  entityType: string;

  @Column({ name: 'entity_id', type: 'uuid', nullable: true })
  entityId: string | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown> | null;

  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamp without time zone',
    default: () => 'now()',
  })
  createdAt: Date;
}
