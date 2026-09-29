import { Inject, Injectable } from '@nestjs/common';
import { MEDIA_CONFIG, MediaConfig } from './media.config';

/** Builds the public URL for a stored media key. */
@Injectable()
export class MediaUrlBuilder {
  constructor(@Inject(MEDIA_CONFIG) private readonly config: MediaConfig) {}

  toUrl(key: string): string {
    const base = this.config.publicBaseUrl.replace(/\/+$/, '');
    const path = key.replace(/^\/+/, '');
    return `${base}/${path}`;
  }
}
