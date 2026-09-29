import {
  buildPropertyImageKeys,
  propertyMediaPrefix,
} from './property-image-keys';

describe('buildPropertyImageKeys', () => {
  it('returns the exact large/thumb key pair for a property and image id', () => {
    const propertyId = 'prop-1';
    const imageId = 'img-1';

    expect(buildPropertyImageKeys(propertyId, imageId)).toEqual({
      largeKey: 'properties/prop-1/img-1-lg.webp',
      thumbKey: 'properties/prop-1/img-1-thumb.webp',
    });
  });
});

describe('propertyMediaPrefix', () => {
  it('returns the property media directory prefix', () => {
    expect(propertyMediaPrefix('prop-1')).toBe('properties/prop-1/');
  });
});
