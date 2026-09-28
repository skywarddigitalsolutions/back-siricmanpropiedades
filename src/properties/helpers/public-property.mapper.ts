import { Property } from '../entities/property.entity';
import {
  Currency,
  DealStatus,
  MarketingTag,
  Operation,
  PropertyType,
} from '../enums/property.enums';

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
