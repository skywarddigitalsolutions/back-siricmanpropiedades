import * as path from 'path';
import { loadMediaConfig } from './media.config';

class FakeConfigService {
  constructor(private readonly env: Record<string, string | undefined> = {}) {}

  get<T = string>(key: string, defaultValue?: T): T {
    const value = this.env[key];
    return (value === undefined ? defaultValue : value) as T;
  }
}

describe('loadMediaConfig', () => {
  it('resolves MEDIA_ROOT to an absolute path under cwd by default', () => {
    const config = loadMediaConfig(new FakeConfigService() as any);

    expect(path.isAbsolute(config.root)).toBe(true);
    expect(config.root).toBe(path.resolve(process.cwd(), 'storage/media'));
  });

  it('resolves a configured relative MEDIA_ROOT to an absolute path', () => {
    const config = loadMediaConfig(
      new FakeConfigService({ MEDIA_ROOT: 'custom/media-dir' }) as any,
    );

    expect(config.root).toBe(path.resolve(process.cwd(), 'custom/media-dir'));
  });

  it('defaults MEDIA_PUBLIC_BASE_URL to http://localhost:<PORT>/media outside production', () => {
    const config = loadMediaConfig(
      new FakeConfigService({ NODE_ENV: 'development', PORT: '4000' }) as any,
    );

    expect(config.publicBaseUrl).toBe('http://localhost:4000/media');
  });

  it('defaults the port to 3000 when PORT is not set outside production', () => {
    const config = loadMediaConfig(
      new FakeConfigService({ NODE_ENV: 'development' }) as any,
    );

    expect(config.publicBaseUrl).toBe('http://localhost:3000/media');
  });

  it('defaults MEDIA_SERVE_STATIC to true outside production when unset', () => {
    expect(loadMediaConfig(new FakeConfigService() as any).serveStatic).toBe(
      true,
    );
    expect(
      loadMediaConfig(
        new FakeConfigService({ NODE_ENV: 'development' }) as any,
      ).serveStatic,
    ).toBe(true);
  });

  it('defaults MEDIA_SERVE_STATIC to false in production when unset', () => {
    const config = loadMediaConfig(
      new FakeConfigService({
        NODE_ENV: 'production',
        MEDIA_PUBLIC_BASE_URL: 'https://api.example.com/media',
      }) as any,
    );

    expect(config.serveStatic).toBe(false);
  });

  it('honors an explicit MEDIA_SERVE_STATIC=false outside production', () => {
    const config = loadMediaConfig(
      new FakeConfigService({
        NODE_ENV: 'development',
        MEDIA_SERVE_STATIC: 'false',
      }) as any,
    );

    expect(config.serveStatic).toBe(false);
  });

  it('trims a trailing slash from a configured MEDIA_PUBLIC_BASE_URL', () => {
    const config = loadMediaConfig(
      new FakeConfigService({
        NODE_ENV: 'production',
        MEDIA_PUBLIC_BASE_URL: 'https://api.example.com/media/',
      }) as any,
    );

    expect(config.publicBaseUrl).toBe('https://api.example.com/media');
  });

  it('throws when NODE_ENV=production and MEDIA_PUBLIC_BASE_URL is missing', () => {
    expect(() =>
      loadMediaConfig(new FakeConfigService({ NODE_ENV: 'production' }) as any),
    ).toThrow();
  });

  it('throws when NODE_ENV=production and MEDIA_PUBLIC_BASE_URL is not https', () => {
    expect(() =>
      loadMediaConfig(
        new FakeConfigService({
          NODE_ENV: 'production',
          MEDIA_PUBLIC_BASE_URL: 'http://api.example.com/media',
        }) as any,
      ),
    ).toThrow();
  });

  it('accepts a valid https MEDIA_PUBLIC_BASE_URL in production', () => {
    const config = loadMediaConfig(
      new FakeConfigService({
        NODE_ENV: 'production',
        MEDIA_PUBLIC_BASE_URL: 'https://api.example.com/media',
      }) as any,
    );

    expect(config.publicBaseUrl).toBe('https://api.example.com/media');
  });

  it('throws on an invalid MEDIA_SERVE_STATIC value', () => {
    expect(() =>
      loadMediaConfig(
        new FakeConfigService({ MEDIA_SERVE_STATIC: 'yes' }) as any,
      ),
    ).toThrow();
  });

  it('accepts MEDIA_SERVE_STATIC=true outside production', () => {
    const config = loadMediaConfig(
      new FakeConfigService({
        NODE_ENV: 'development',
        MEDIA_SERVE_STATIC: 'true',
      }) as any,
    );

    expect(config.serveStatic).toBe(true);
  });

  it('throws when MEDIA_SERVE_STATIC=true and NODE_ENV=production', () => {
    expect(() =>
      loadMediaConfig(
        new FakeConfigService({
          NODE_ENV: 'production',
          MEDIA_SERVE_STATIC: 'true',
          MEDIA_PUBLIC_BASE_URL: 'https://api.example.com/media',
        }) as any,
      ),
    ).toThrow();
  });
});
