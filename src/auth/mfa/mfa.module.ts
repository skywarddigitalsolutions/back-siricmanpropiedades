import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../../users/entities/user.entity';
import { MfaBackupCode } from '../entities/mfa-backup-code.entity';
import { MfaService } from './mfa.service';
import { MfaController } from './mfa.controller';
import { AuthModule } from '../auth.module';
import { AuditModule } from '../../audit/audit.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, MfaBackupCode]),
    AuthModule,
    AuditModule,
  ],
  controllers: [MfaController],
  providers: [MfaService],
})
export class MfaModule {}
