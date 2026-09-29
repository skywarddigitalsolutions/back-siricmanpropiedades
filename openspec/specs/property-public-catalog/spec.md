# Property Public Catalog Specification

## Purpose

Defines the unauthenticated public read surface over properties: a filtered, sorted, paginated listing and a slug-based detail view, both restricted to `published` properties, with currency-scoped price rules and address-privacy protection. This complements `property-management` (the authenticated write surface) and `neighborhoods` (the reference data used for the neighborhood filter).

## Requirements

### Requirement: Public Listing Scope

The system MUST restrict the public property listing to properties whose `publicationStatus` is `published`, and this restriction MUST be enforced by the query itself (not derived from any caller-supplied filter), so that no combination of query parameters can surface a `draft` or `archived` property.

#### Scenario: Draft and archived properties never appear publicly

- GIVEN the database contains properties with `publicationStatus` of `draft`, `published`, and `archived`
- WHEN an anonymous caller requests the public listing endpoint with no filters
- THEN the response contains only the `published` properties

#### Scenario: Caller cannot override the publication scope

- GIVEN the database contains a `draft` property
- WHEN an anonymous caller requests the public listing endpoint with any query parameter
- THEN the draft property is never included in the response, regardless of the parameters supplied

### Requirement: Public Listing Filters

The system MUST support filtering the public listing by: `operation` (`sale|rent`), `type`, `neighborhood`, minimum `rooms`, minimum `bedrooms`, minimum `bathrooms`, `hasGarage` (toggle), `creditEligible` (toggle), `petsAllowed` (toggle), minimum `coveredArea`, minimum `totalArea`, and a currency-scoped price range (`priceMin`/`priceMax`, see the currency-scoped price rule requirement). Every filter MUST be optional; when a filter is omitted, results MUST NOT be constrained on that dimension.

The filter-to-query-condition assembly MUST be implemented as a pure, unit-testable function (filters in, query conditions/parameters/ordering out), independent of the HTTP layer and the ORM query builder invocation.

#### Scenario: Filtering by operation and type

- GIVEN properties exist for both `sale` and `rent`, and for both `apartment` and `house`
- WHEN an anonymous caller requests the public listing with `operation=rent` and `type=apartment`
- THEN the response contains only published apartments listed for rent

#### Scenario: Combining multiple filters narrows results further

- GIVEN several published properties matching different combinations of neighborhood, rooms, and `hasGarage`
- WHEN an anonymous caller requests the public listing with a specific neighborhood, a minimum `rooms` value, and `hasGarage=true`
- THEN the response contains only published properties that satisfy all three conditions simultaneously

#### Scenario: Omitted filters do not constrain results

- GIVEN published properties across multiple neighborhoods
- WHEN an anonymous caller requests the public listing without a `neighborhood` filter
- THEN the response is not constrained by neighborhood

### Requirement: Currency-Scoped Price Rules

The system MUST require a `currency` parameter (`USD` or `ARS`) whenever the request includes a price-range filter (`priceMin` and/or `priceMax`) or a price-based sort (`price_asc` or `price_desc`). When `currency` is present together with a price filter or a price sort, the system MUST scope all price-based filtering, sorting, and comparison to properties whose stored `currency` exactly matches the requested `currency`; properties in the other currency MUST be excluded from that price-scoped result set rather than converted or mixed in.

#### Scenario: Price range without currency is rejected

- GIVEN a request that includes `priceMin` but omits `currency`
- WHEN the public listing endpoint is called
- THEN the response is `400 Bad Request`
- AND no property data is returned

#### Scenario: Price sort without currency is rejected

- GIVEN a request that includes `sort=price_asc` but omits `currency`
- WHEN the public listing endpoint is called
- THEN the response is `400 Bad Request`

#### Scenario: Price range with currency scopes results to that currency

- GIVEN published properties priced in both `USD` and `ARS`, some of which fall within a given numeric range
- WHEN an anonymous caller requests the public listing with `currency=USD`, `priceMin=50000`, and `priceMax=150000`
- THEN the response contains only `USD`-priced properties whose `price` falls within that range
- AND no `ARS`-priced property appears in the response, regardless of its numeric price value

#### Scenario: Price sort with currency orders and scopes by that currency

- GIVEN published properties priced in both `USD` and `ARS`
- WHEN an anonymous caller requests the public listing with `currency=ARS` and `sort=price_desc`
- THEN the response contains only `ARS`-priced properties
- AND they are ordered from highest to lowest `price`

#### Scenario: Requests without any price filter or sort do not require currency

- GIVEN a request with no `priceMin`, `priceMax`, or price-based `sort`
- WHEN the public listing endpoint is called without a `currency` parameter
- THEN the response is `200 OK` and includes published properties in both currencies

### Requirement: Public Listing Pagination and Sorting

The system MUST paginate the public listing and MUST return the response as `{ items, total }`, where `items` is the page of matching published properties and `total` is the total count of matching published properties across all pages (before pagination is applied). The system MUST support sorting by `newest` (default), `price_asc`, and `price_desc` (the latter two governed by the currency-scoped price rule).

#### Scenario: Response shape is items plus total

- GIVEN more published properties exist than fit on one page
- WHEN an anonymous caller requests the public listing with a page size smaller than the total matching count
- THEN the response body is an object with an `items` array (the current page) and a `total` number (the full matching count, not just the page size)

#### Scenario: Default sort is newest first

- GIVEN several published properties created at different times
- WHEN an anonymous caller requests the public listing without a `sort` parameter
- THEN the response orders properties from most recently created to least recently created

### Requirement: Public Property Detail by Slug

The system MUST expose an unauthenticated endpoint that returns a single property's public detail by its `slug`, restricted to properties whose `publicationStatus` is `published`. Requesting a slug that does not resolve to a published property (because it does not exist, or resolves to a `draft` or `archived` property) MUST return `404 Not Found`.

#### Scenario: Detail of a published property is returned

- GIVEN a published property with slug `"casa-en-belgrano"`
- WHEN an anonymous caller requests the detail endpoint for that slug
- THEN the response is `200 OK` with that property's public detail

#### Scenario: Detail of a draft or archived property is not found

- GIVEN a property with slug `"depto-en-caballito"` whose `publicationStatus` is `draft` or `archived`
- WHEN an anonymous caller requests the detail endpoint for that slug
- THEN the response is `404 Not Found`

#### Scenario: Detail of a nonexistent slug is not found

- GIVEN no property has slug `"no-existe"`
- WHEN an anonymous caller requests the detail endpoint for that slug
- THEN the response is `404 Not Found`

### Requirement: Address Privacy in Public Responses

The system MUST omit the property's exact `address` field from every public response (listing items and detail) whenever that property's `showExactAddress` is `false`, exposing only its `neighborhood` in that case. When `showExactAddress` is `true`, the public response MUST include the exact `address`.

#### Scenario: Exact address is hidden when disabled

- GIVEN a published property with `showExactAddress = false` and a stored `address` of `"Av. Corrientes 1234"`
- WHEN an anonymous caller requests the public listing or the property's detail
- THEN the response for that property does not include `"Av. Corrientes 1234"` or any other exact-address value
- AND the response still includes the property's `neighborhood`

#### Scenario: Exact address is shown when enabled

- GIVEN a published property with `showExactAddress = true` and a stored `address` of `"Av. Cabildo 2500"`
- WHEN an anonymous caller requests the public listing or the property's detail
- THEN the response for that property includes the exact `address` value `"Av. Cabildo 2500"`

### Requirement: Public Filter DTO Validation

DTO validation (class-validator/class-transformer, matching the codebase's existing convention): the public listing query DTO MUST validate `operation`, `type`, and `sort` as restricted to their declared enum values; MUST validate `priceMin`, `priceMax`, minimum `rooms`/`bedrooms`/`bathrooms`, minimum `coveredArea`/`totalArea`, and pagination parameters (page number, page size) as non-negative numbers normalized via `@Transform`; MUST validate the toggle filters (`hasGarage`, `creditEligible`, `petsAllowed`) as booleans normalized via `@Transform`; and MUST enforce the currency-scoped price rule (see that requirement) as a cross-field validation rather than a per-field one.

#### Scenario: Invalid enum filter value is rejected

- GIVEN a request with `operation=alquiler` (not `sale` or `rent`)
- WHEN the public listing endpoint is called
- THEN the response is `400 Bad Request`

#### Scenario: Non-numeric price filter is rejected

- GIVEN a request with `priceMin=abc` and `currency=USD`
- WHEN the public listing endpoint is called
- THEN the response is `400 Bad Request`

### Requirement: Cover Image in Public Listing

Each item in the public property listing MUST include a `coverImage` field containing the thumbnail URL of the image at `position = 0`, or `null` when the property has no images. The system MUST NOT expose internal storage keys or filesystem paths in this field. Adding `coverImage` to each item MUST NOT change the `total` count or the number of items returned per page (see Public Listing Pagination and Sorting).

#### Scenario: Listing item exposes the cover thumbnail URL

- GIVEN a published property whose image at position 0 has a thumbnail URL
- WHEN an anonymous caller requests the public listing
- THEN that property's listing item includes `coverImage` equal to that thumbnail URL

#### Scenario: Listing item for a property with no images exposes a null cover

- GIVEN a published property with no images
- WHEN an anonymous caller requests the public listing
- THEN that property's listing item includes `coverImage: null`

#### Scenario: coverImage never contains a raw storage key or filesystem path

- GIVEN a published property with at least one image
- WHEN an anonymous caller requests the public listing
- THEN the `coverImage` value is a fully-qualified public URL and contains no raw storage key or filesystem path

#### Scenario: coverImage does not affect pagination or total

- GIVEN more published properties exist than fit on one page
- WHEN an anonymous caller requests the public listing with a page size smaller than the total matching count
- THEN `total` and the number of items per page are unchanged by the presence of `coverImage` on each item

### Requirement: Image Gallery in Public Detail

The public property detail response MUST include an `images` field: the full ordered gallery (ascending `position`), each entry exposing its `large` URL, `thumb` URL, and rendition dimensions (width and height). A property with no images MUST return an empty `images` array. The system MUST NOT expose internal storage keys or filesystem paths in this field.

#### Scenario: Detail response returns the ordered gallery

- GIVEN a published property with three images at positions 0, 1, and 2
- WHEN an anonymous caller requests the detail endpoint for that property's slug
- THEN the response's `images` array is ordered ascending by position
- AND each entry exposes its `large` URL, `thumb` URL, and dimensions

#### Scenario: Detail response for a property with no images returns an empty gallery

- GIVEN a published property with no images
- WHEN an anonymous caller requests the detail endpoint for that property's slug
- THEN the response's `images` array is empty

#### Scenario: images never contains a raw storage key or filesystem path

- GIVEN a published property with at least one image
- WHEN an anonymous caller requests the detail endpoint for that property's slug
- THEN every URL in the `images` array is a fully-qualified public URL and contains no raw storage key or filesystem path
