import { Property } from '../entities/property.entity';
import { PropertyImage } from '../entities/property-image.entity';
import {
  Currency,
  DealStatus,
  MarketingTag,
  Operation,
  PropertyType,
} from '../enums/property.enums';
import { MediaUrlBuilder } from '../../media/media-url.builder';
import {
  PublicPropertyImage,
  toPublicPropertyImage,
} from './property-image.mapper';

/**
 * Public-facing shape of a property, returned by `PublicPropertiesService`.
 * Deliberately narrower than `Property`: internal fields (`publicationStatus`,
 * `showExactAddress`, `createdAt`, `updatedAt`, `neighborhood.id`) are never
 * exposed. `id` is included because feature 8 (leads) will reference
 * properties from the public site.
 */
export interface PublicPropertyResponse {
  id: string;
  code: string;
  slug: string;
  operation: Operation;
  type: PropertyType;
  title: string;
  description: string | null;
  neighborhood: { name: string; slug: string };
  address: string | null;
  currency: Currency;
  price: number;
  expenses: number | null;
  rooms: number;
  bedrooms: number;
  bathrooms: number;
  hasGarage: boolean;
  coveredArea: number;
  totalArea: number;
  age: number;
  creditEligible: boolean;
  petsAllowed: boolean;
  immediateAvailability: boolean;
  marketingTag: MarketingTag;
  featured: boolean;
  dealStatus: DealStatus;
  services: {
    water: boolean;
    naturalGas: boolean;
    sewer: boolean;
    electricity: boolean;
    internet: boolean;
  };
  publishedAt: Date | null;
}

/**
 * Explicit whitelist projection from `Property` to `PublicPropertyResponse`.
 * `address` is `null` unless `showExactAddress` is `true` — this is the only
 * place that decides address visibility, matching
 * `specs/property-public-catalog/spec.md` -> Address Privacy in Public
 * Responses. An explicit field list (rather than `@Exclude` groups) makes it
 * impossible to leak a new entity field by omission.
 */
export function toPublicProperty(property: Property): PublicPropertyResponse {
  return {
    id: property.id,
    code: property.code,
    slug: property.slug,
    operation: property.operation,
    type: property.type,
    title: property.title,
    description: property.description,
    neighborhood: {
      name: property.neighborhood.name,
      slug: property.neighborhood.slug,
    },
    address: property.showExactAddress ? property.address : null,
    currency: property.currency,
    price: property.price,
    expenses: property.expenses,
    rooms: property.rooms,
    bedrooms: property.bedrooms,
    bathrooms: property.bathrooms,
    hasGarage: property.hasGarage,
    coveredArea: property.coveredArea,
    totalArea: property.totalArea,
    age: property.age,
    creditEligible: property.creditEligible,
    petsAllowed: property.petsAllowed,
    immediateAvailability: property.immediateAvailability,
    marketingTag: property.marketingTag,
    featured: property.featured,
    dealStatus: property.dealStatus,
    services: {
      water: property.hasWater,
      naturalGas: property.hasNaturalGas,
      sewer: property.hasSewer,
      electricity: property.hasElectricity,
      internet: property.hasInternet,
    },
    publishedAt: property.firstPublishedAt,
  };
}

/**
 * Public listing item shape: `PublicPropertyResponse` plus `coverImage`, the
 * thumbnail URL of the image at `position = 0`, or `null` when the property
 * has no images. `coverImage` is the URL itself (not an object) — per
 * `specs/property-public-catalog/spec.md`'s "Cover Image in Public Listing"
 * scenarios (e.g. "the listing item includes `coverImage` equal to that
 * thumbnail URL") and `proposal.md`'s consistent "coverImage (thumbnail URL,
 * or null)" description, both of which are authoritative over `design.md`'s
 * draft `{ url, width, height }` object shape for this field.
 */
export interface PublicPropertyListItem extends PublicPropertyResponse {
  coverImage: string | null;
}

/**
 * Public detail shape: `PublicPropertyResponse` plus the full ordered
 * `images` gallery. Deliberately has no separate `coverImage` field — the
 * cover is `images[0]` (Reconciliation Note 1 in `tasks.md`).
 */
export interface PublicPropertyDetail extends PublicPropertyResponse {
  images: PublicPropertyImage[];
}

/**
 * Listing projection used by `PublicPropertiesService.findAll`. `coverImage`
 * is derived from the property's position-0 image (or `null`), resolved by
 * the caller via `PropertyImagesRepository.findCoversByPropertyIds` — never
 * exposes `largeKey`/`thumbKey` or any filesystem path.
 */
export function toPublicPropertyListItem(
  property: Property,
  coverImage: PropertyImage | null,
  urls: MediaUrlBuilder,
): PublicPropertyListItem {
  return {
    ...toPublicProperty(property),
    coverImage: coverImage ? urls.toUrl(coverImage.thumbKey) : null,
  };
}

/**
 * Detail projection used by `PublicPropertiesService.findBySlug`. `images`
 * is the full ordered gallery (ascending position), resolved by the caller
 * via `PropertyImagesRepository.findByPropertyId` — never exposes
 * `largeKey`/`thumbKey` or any filesystem path.
 */
export function toPublicPropertyDetail(
  property: Property,
  images: PropertyImage[],
  urls: MediaUrlBuilder,
): PublicPropertyDetail {
  return {
    ...toPublicProperty(property),
    images: images.map((image) => toPublicPropertyImage(image, urls)),
  };
}
