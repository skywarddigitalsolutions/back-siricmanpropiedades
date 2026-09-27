import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

/**
 * Código de un solo uso para recuperar acceso si el usuario pierde su
 * dispositivo TOTP. Se generan 10 al confirmar el alta de MFA y se
 * muestran una única vez en texto plano; acá solo se guarda el hash.
 */
@Entity({ name: 'mfa_backup_codes' })
export class MfaBackupCode {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'code_hash', type: 'varchar', length: 255 })
  codeHash: string;

  @Column({
    name: 'used_at',
    type: 'timestamp without time zone',
    nullable: true,
  })
  usedAt: Date | null;

  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamp without time zone',
    default: () => 'now()',
  })
  createdAt: Date;
}
