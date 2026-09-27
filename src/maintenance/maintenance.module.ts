import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RevokedToken } from '../auth/entities/revoked-token.entity';
import { AuditLog } from '../audit/entities/audit-log.entity';
import { RetentionService } from './retention.service';

@Module({
  imports: [TypeOrmModule.forFeature([RevokedToken, AuditLog])],
  providers: [RetentionService],
})
export class MaintenanceModule {}
