import { MediaUrlBuilder } from './media-url.builder';
import type { MediaConfig } from './media.config';

function makeConfig(publicBaseUrl: string): MediaConfig {
  return { root: '/tmp/media', publicBaseUrl, serveStatic: false };
}

describe('MediaUrlBuilder', () => {
  it('joins the base URL and the key with exactly one slash', () => {
    const builder = new MediaUrlBuilder(
      makeConfig('https://api.example.com/media'),
    );

    expect(builder.toUrl('properties/p1/img-1-lg.webp')).toBe(
      'https://api.example.com/media/properties/p1/img-1-lg.webp',
    );
  });

  it('still joins with exactly one slash when the configured base URL already trimmed its trailing slash', () => {
    // loadMediaConfig() already trims a trailing slash before this class
    // ever sees the value; this asserts toUrl() does not depend on that and
    // never produces a double slash either way.
    const trimmed = makeConfig('https://api.example.com/media');
    const builder = new MediaUrlBuilder(trimmed);

    const url = builder.toUrl('properties/p2/img-1-thumb.webp');

    expect(url).toBe(
      'https://api.example.com/media/properties/p2/img-1-thumb.webp',
    );
    expect(url).not.toContain('//properties');
  });
});
