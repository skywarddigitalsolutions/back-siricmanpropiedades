import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../../users/entities/user.entity';
import { AuthModule } from '../auth.module';
import { MfaModule } from '../mfa/mfa.module';
import { AuditModule } from '../../audit/audit.module';
import { AccountService } from './account.service';
import { AccountController } from './account.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    AuthModule,
    MfaModule,
    AuditModule,
  ],
  controllers: [AccountController],
  providers: [AccountService],
})
export class AccountModule {}
