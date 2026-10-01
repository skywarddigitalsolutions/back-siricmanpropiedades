import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Lead } from './entities/lead.entity';
import { LeadsService } from './leads.service';
import { PublicLeadsController } from './public-leads.controller';
import { AdminLeadsController } from './admin-leads.controller';
import { Property } from '../properties/entities/property.entity';
import { AuthModule } from '../auth/auth.module';
import { AuditModule } from '../audit/audit.module';
import { LEAD_NOTIFIER } from './notifications/lead-notifier.port';
import { loadLeadNotificationsConfig } from './notifications/lead-notifications.config';
import { SmtpLeadNotifier } from './notifications/smtp-lead.notifier';
import { LogLeadNotifier } from './notifications/log-lead.notifier';

@Module({
  imports: [
    TypeOrmModule.forFeature([Lead, Property]),
    AuthModule,
    AuditModule,
    ConfigModule,
  ],
  controllers: [PublicLeadsController, AdminLeadsController],
  providers: [
    LeadsService,
    {
      // Email when SMTP is configured, a log line otherwise (see config).
      provide: LEAD_NOTIFIER,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const { smtp, siteUrl } = loadLeadNotificationsConfig(config);
        return smtp
          ? new SmtpLeadNotifier(smtp, siteUrl)
          : new LogLeadNotifier();
      },
    },
  ],
})
export class LeadsModule {}
