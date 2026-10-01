import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Property } from '../../properties/entities/property.entity';
import { LeadStatus, LeadTopic, LeadType } from '../enums/lead.enums';
import type { AppraisalDetailsDto } from '../dto/create-lead.dto';

/**
 * A contact request from the public site (property inquiry, appraisal or
 * general contact). Stores only what the visitor typed: no IP or user agent.
 */
// Constraint names match migration CreateLeads, so a dev database running
// with DB_SYNCHRONIZE=true keeps the same schema as production.
@Entity({ name: 'leads' })
@Index('IDX_leads_status_created_at', ['status', 'createdAt'])
@Check('CHK_leads_contact', `"phone" IS NOT NULL OR "email" IS NOT NULL`)
export class Lead {
  @PrimaryGeneratedColumn('uuid', { primaryKeyConstraintName: 'PK_leads' })
  id: string;

  @Column({ type: 'enum', enum: LeadType, enumName: 'lead_type_enum' })
  type: LeadType;

  @Column({
    type: 'enum',
    enum: LeadStatus,
    enumName: 'lead_status_enum',
    default: LeadStatus.NEW,
  })
  status: LeadStatus;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'varchar', length: 30, nullable: true })
  phone: string | null;

  @Column({ type: 'varchar', length: 254, nullable: true })
  email: string | null;

  @Column({ type: 'text', nullable: true })
  message: string | null;

  @Column({
    type: 'enum',
    enum: LeadTopic,
    enumName: 'lead_topic_enum',
    nullable: true,
  })
  topic: LeadTopic | null;

  /** Appraisal request data (property type, address, rooms, area). */
  @Column({ type: 'jsonb', nullable: true })
  details: AppraisalDetailsDto | null;

  /** Internal notes from the admin inbox; never shown to the visitor. */
  @Column({ type: 'text', nullable: true })
  notes: string | null;

  /** Kept when the property is deleted (set to null), so the lead survives. */
  @ManyToOne(() => Property, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({
    name: 'property_id',
    foreignKeyConstraintName: 'FK_leads_property',
  })
  property: Property | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp without time zone' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp without time zone' })
  updatedAt: Date;
}
