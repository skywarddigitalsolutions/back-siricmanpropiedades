import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Property } from './entities/property.entity';
import { PropertyImage } from './entities/property-image.entity';
import { AuthModule } from '../auth/auth.module';
import { AuditModule } from '../audit/audit.module';
import { NeighborhoodsModule } from '../neighborhoods/neighborhoods.module';
import { MediaModule } from '../media/media.module';
import { PropertiesService } from './services/properties.service';
import { PublicPropertiesService } from './services/public-properties.service';
import { PropertyImagesRepository } from './images/property-images.repository';
import { PropertyImagesService } from './images/property-images.service';
import { AdminPropertiesController } from './controllers/admin-properties.controller';
import { PublicPropertiesController } from './controllers/public-properties.controller';
import { AdminPropertyImagesController } from './controllers/admin-property-images.controller';

/**
 * Admin create/update/get wired in Phase 3a; admin list (3b) and lifecycle
 * verbs + deal status + hard delete (4) extended the admin surface; the
 * public read surface (5b) completes the module. Phase 4 (property-images)
 * imports `MediaModule` for the storage/image-processing adapters and adds
 * the image upload surface; reorder/delete land in Phase 5.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Property, PropertyImage]),
    // NeighborhoodsModule exports TypeOrmModule (which re-exports the
    // Neighborhood repository provider), so PropertiesService can
    // @InjectRepository(Neighborhood) without registering it again here.
    NeighborhoodsModule,
    AuthModule,
    AuditModule,
    MediaModule,
  ],
  controllers: [
    AdminPropertiesController,
    PublicPropertiesController,
    AdminPropertyImagesController,
  ],
  providers: [
    PropertiesService,
    PublicPropertiesService,
    PropertyImagesRepository,
    PropertyImagesService,
  ],
})
export class PropertiesModule {}
