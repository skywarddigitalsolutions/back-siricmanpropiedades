import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

/**
 * Registro de tokens JWT revocados (logout).
 * Se identifica cada token por su claim "jti" (único por token emitido).
 */
@Entity({ name: 'revoked_tokens' })
export class RevokedToken {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', unique: true })
  jti: string;

  @Column({ name: 'expires_at', type: 'timestamp without time zone' })
  expiresAt: Date;

  @CreateDateColumn({
    name: 'revoked_at',
    type: 'timestamp without time zone',
    default: () => 'now()',
  })
  revokedAt: Date;
}
