import {
  BeforeInsert,
  BeforeUpdate,
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { UserRole } from '../../user-roles/entities/user-role.entity';

@Entity({ name: 'users' })
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_name', type: 'varchar', unique: true, length: 50 })
  userName: string;

  @Column({
    name: 'password_hash',
    type: 'varchar',
    length: 255,
    select: false,
  })
  password: string;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ name: 'mfa_enabled', type: 'boolean', default: false })
  mfaEnabled: boolean;

  /** Secreto TOTP cifrado (AES-256-GCM). Null mientras no hay alta en curso. */
  @Column({
    name: 'mfa_secret',
    type: 'varchar',
    length: 255,
    nullable: true,
    select: false,
  })
  mfaSecret: string | null;

  @Column({
    name: 'mfa_confirmed_at',
    type: 'timestamp without time zone',
    nullable: true,
  })
  mfaConfirmedAt: Date | null;

  /**
   * Last password change (self-service, admin reset or operator command).
   * JwtStrategy rejects tokens issued before it, closing every other session.
   */
  @Column({
    name: 'password_changed_at',
    type: 'timestamptz',
    nullable: true,
  })
  passwordChangedAt: Date | null;

  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamp without time zone',
    default: () => 'now()',
  })
  createdAt: Date;

  @UpdateDateColumn({
    name: 'updated_at',
    type: 'timestamp without time zone',
    default: () => 'now()',
  })
  updatedAt: Date;

  @OneToMany(() => UserRole, (userRole) => userRole.user)
  userRoles: UserRole[];

  @BeforeInsert()
  checkFieldsBeforeInsert() {
    this.userName = this.userName.toLowerCase().trim();
  }

  @BeforeUpdate()
  checkFieldsBeforeUpdate() {
    this.checkFieldsBeforeInsert();
  }
}
