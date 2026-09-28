import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Property } from './entities/property.entity';
import { AuthModule } from '../auth/auth.module';
import { AuditModule } from '../audit/audit.module';
import { NeighborhoodsModule } from '../neighborhoods/neighborhoods.module';
import { PropertiesService } from './services/properties.service';
import { AdminPropertiesController } from './controllers/admin-properties.controller';

/**
 * Admin create/update/get wired in Phase 3a. Admin list (3b), lifecycle
 * verbs + deal status + hard delete (4), and the public read surface (5b)
 * are wired incrementally on top of this module.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Property]),
    // NeighborhoodsModule exports TypeOrmModule (which re-exports the
    // Neighborhood repository provider), so PropertiesService can
    // @InjectRepository(Neighborhood) without registering it again here.
    NeighborhoodsModule,
    AuthModule,
    AuditModule,
  ],
  controllers: [AdminPropertiesController],
  providers: [PropertiesService],
})
export class PropertiesModule {}
