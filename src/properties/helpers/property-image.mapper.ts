import { PropertyImage } from '../entities/property-image.entity';
import { MediaUrlBuilder } from '../../media/media-url.builder';

/**
 * Admin-facing shape of an image, used by upload, reorder, and admin
 * `GET /:id`. Never includes `largeKey`/`thumbKey` or any filesystem path —
 * only the built public URLs.
 */
export interface PropertyImageResponse {
  id: string;
  position: number;
  url: string;
  width: number;
  height: number;
  thumbnailUrl: string;
  thumbnailWidth: number;
  thumbnailHeight: number;
  createdAt: Date;
}

/**
 * Public-facing shape of a gallery image. Omits `id` and `position`: order
 * is the array order in the response, per the resolved spec (Reconciliation
 * Note 1 — the cover is `images[0]`, not a separate field on detail).
 */
export interface PublicPropertyImage {
  url: string;
  width: number;
  height: number;
  thumbnailUrl: string;
  thumbnailWidth: number;
  thumbnailHeight: number;
}

export function toPropertyImageResponse(
  image: PropertyImage,
  urls: MediaUrlBuilder,
): PropertyImageResponse {
  return {
    id: image.id,
    position: image.position,
    url: urls.toUrl(image.largeKey),
    width: image.width,
    height: image.height,
    thumbnailUrl: urls.toUrl(image.thumbKey),
    thumbnailWidth: image.thumbWidth,
    thumbnailHeight: image.thumbHeight,
    createdAt: image.createdAt,
  };
}

export function toPublicPropertyImage(
  image: PropertyImage,
  urls: MediaUrlBuilder,
): PublicPropertyImage {
  return {
    url: urls.toUrl(image.largeKey),
    width: image.width,
    height: image.height,
    thumbnailUrl: urls.toUrl(image.thumbKey),
    thumbnailWidth: image.thumbWidth,
    thumbnailHeight: image.thumbHeight,
  };
}
