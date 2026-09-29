# Delta for Property Public Catalog

## ADDED Requirements

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
