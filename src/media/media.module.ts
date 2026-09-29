import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MEDIA_CONFIG, loadMediaConfig } from './media.config';
import { STORAGE_PORT } from './storage/storage.port';
import { LocalDiskStorage } from './storage/local-disk.storage';
import { IMAGE_PROCESSOR } from './images/image-processor.port';
import { SharpImageProcessor } from './images/sharp-image.processor';
import { MediaUrlBuilder } from './media-url.builder';

/**
 * Domain-agnostic media infrastructure: configuration, storage adapter,
 * image-processing adapter, and the public URL builder. Knows nothing about
 * properties or any other domain — see design.md's module-placement
 * decision.
 */
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: MEDIA_CONFIG,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => loadMediaConfig(config),
    },
    { provide: STORAGE_PORT, useClass: LocalDiskStorage },
    { provide: IMAGE_PROCESSOR, useClass: SharpImageProcessor },
    MediaUrlBuilder,
  ],
  exports: [MEDIA_CONFIG, STORAGE_PORT, IMAGE_PROCESSOR, MediaUrlBuilder],
})
export class MediaModule {}
