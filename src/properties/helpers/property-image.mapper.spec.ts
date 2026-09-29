import { PropertyImage } from '../entities/property-image.entity';
import {
  toPropertyImageResponse,
  toPublicPropertyImage,
} from './property-image.mapper';
import type { MediaUrlBuilder } from '../../media/media-url.builder';

function makeImage(overrides: Partial<PropertyImage> = {}): PropertyImage {
  return {
    id: 'img-1',
    propertyId: 'prop-1',
    property: undefined,
    position: 0,
    largeKey: 'properties/prop-1/img-1-lg.webp',
    thumbKey: 'properties/prop-1/img-1-thumb.webp',
    width: 1920,
    height: 1080,
    thumbWidth: 480,
    thumbHeight: 270,
    largeBytes: 100_000,
    thumbBytes: 20_000,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  };
}

function makeUrlBuilder(): MediaUrlBuilder {
  return {
    toUrl: jest.fn((key: string) => `https://media.example.com/${key}`),
  } as unknown as MediaUrlBuilder;
}

describe('toPropertyImageResponse', () => {
  it('projects the admin shape with id, position, and both rendition URLs', () => {
    const urls = makeUrlBuilder();
    const image = makeImage();

    const response = toPropertyImageResponse(image, urls);

    expect(response).toEqual({
      id: 'img-1',
      position: 0,
      url: 'https://media.example.com/properties/prop-1/img-1-lg.webp',
      width: 1920,
      height: 1080,
      thumbnailUrl:
        'https://media.example.com/properties/prop-1/img-1-thumb.webp',
      thumbnailWidth: 480,
      thumbnailHeight: 270,
      createdAt: image.createdAt,
    });
  });

  it('never includes a storage key or filesystem path', () => {
    const response = toPropertyImageResponse(makeImage(), makeUrlBuilder());

    const serialized = JSON.stringify(response);
    expect(serialized).not.toContain('largeKey');
    expect(serialized).not.toContain('thumbKey');
    expect(serialized).toContain('https://media.example.com');
  });
});

describe('toPublicPropertyImage', () => {
  it('projects the public shape without id or position', () => {
    const urls = makeUrlBuilder();
    const image = makeImage({ id: 'img-2', position: 3 });

    const response = toPublicPropertyImage(image, urls);

    expect(response).toEqual({
      url: 'https://media.example.com/properties/prop-1/img-1-lg.webp',
      width: 1920,
      height: 1080,
      thumbnailUrl:
        'https://media.example.com/properties/prop-1/img-1-thumb.webp',
      thumbnailWidth: 480,
      thumbnailHeight: 270,
    });
    expect(response).not.toHaveProperty('id');
    expect(response).not.toHaveProperty('position');
  });

  it('never includes a storage key or filesystem path', () => {
    const response = toPublicPropertyImage(makeImage(), makeUrlBuilder());

    const serialized = JSON.stringify(response);
    expect(serialized).not.toContain('largeKey');
    expect(serialized).not.toContain('thumbKey');
  });
});
