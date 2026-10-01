import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Lead } from './entities/lead.entity';
import { LeadsService } from './leads.service';
import { PublicLeadsController } from './public-leads.controller';
import { AdminLeadsController } from './admin-leads.controller';
import { AdminClientsController } from './admin-clients.controller';
import { ClientsService } from './clients.service';
import { Property } from '../properties/entities/property.entity';
import { AuthModule } from '../auth/auth.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Lead, Property]),
    AuthModule,
    AuditModule,
  ],
  controllers: [
    PublicLeadsController,
    AdminLeadsController,
    AdminClientsController,
  ],
  providers: [LeadsService, ClientsService],
})
export class LeadsModule {}
