/**
 * TypeScript enums mirroring the six native Postgres enum types created by
 * `1790500000001-CreateProperties`. Values MUST match exactly so TypeORM's
 * entity metadata (`enum: X, enumName: '...'`) matches the migration.
 */

export enum Operation {
  SALE = 'sale',
  RENT = 'rent',
}

export enum PropertyType {
  APARTMENT = 'apartment',
  HOUSE = 'house',
  PH = 'ph',
  LAND = 'land',
  COMMERCIAL = 'commercial',
  OFFICE = 'office',
  GARAGE = 'garage',
}

export enum Currency {
  USD = 'USD',
  ARS = 'ARS',
}

export enum PublicationStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  ARCHIVED = 'archived',
}

export enum DealStatus {
  AVAILABLE = 'available',
  RESERVED = 'reserved',
  SOLD = 'sold',
  RENTED = 'rented',
}

export enum MarketingTag {
  NEW = 'new',
  OPPORTUNITY = 'opportunity',
  NONE = 'none',
}
