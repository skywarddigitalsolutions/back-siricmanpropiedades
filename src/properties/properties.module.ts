import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Property } from './entities/property.entity';
import { AuthModule } from '../auth/auth.module';
import { AuditModule } from '../audit/audit.module';
import { NeighborhoodsModule } from '../neighborhoods/neighborhoods.module';

/**
 * Skeleton registered now so the entity/migration land together with the
 * schema (Phase 2). Controllers and providers are wired incrementally in
 * Phases 3a (admin create/update/get), 3b (admin list), 4 (lifecycle), and
 * 5b (public read surface).
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Property]),
    NeighborhoodsModule,
    AuthModule,
    AuditModule,
  ],
  controllers: [],
  providers: [],
})
export class PropertiesModule {}
