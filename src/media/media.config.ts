import * as path from 'path';
import { ConfigService } from '@nestjs/config';

export const MEDIA_CONFIG = Symbol('MEDIA_CONFIG');

export interface MediaConfig {
  root: string;
  publicBaseUrl: string;
  serveStatic: boolean;
}

const VALID_SERVE_STATIC_VALUES = new Set(['true', 'false']);

/**
 * Resolves and validates the `MEDIA_*` environment surface at bootstrap.
 * Fails fast (throws) on any misconfiguration, matching this codebase's
 * existing fail-fast style for required config (see `MfaService`).
 */
export function loadMediaConfig(config: ConfigService): MediaConfig {
  const nodeEnv = config.get<string>('NODE_ENV');
  const isProduction = nodeEnv === 'production';

  const root = path.resolve(
    process.cwd(),
    config.get<string>('MEDIA_ROOT', 'storage/media'),
  );

  const serveStaticRaw = config.get<string>('MEDIA_SERVE_STATIC');
  if (
    serveStaticRaw !== undefined &&
    !VALID_SERVE_STATIC_VALUES.has(serveStaticRaw)
  ) {
    throw new Error(
      `MEDIA_SERVE_STATIC must be "true" or "false" (or unset), got: ${serveStaticRaw}`,
    );
  }
  // Sin valor explícito: en desarrollo/test se sirve desde Nest (si no, las
  // fotos dan 404 sin Caddy); en producción las sirve Caddy.
  const serveStatic =
    serveStaticRaw === undefined ? !isProduction : serveStaticRaw === 'true';
  if (serveStatic && isProduction) {
    throw new Error(
      'MEDIA_SERVE_STATIC=true is not allowed when NODE_ENV=production; media is served by Caddy in production',
    );
  }

  const publicBaseUrl = resolvePublicBaseUrl(config, isProduction);

  return { root, publicBaseUrl, serveStatic };
}

function resolvePublicBaseUrl(
  config: ConfigService,
  isProduction: boolean,
): string {
  const configured = config.get<string>('MEDIA_PUBLIC_BASE_URL');

  if (!configured) {
    if (isProduction) {
      throw new Error(
        'MEDIA_PUBLIC_BASE_URL is required when NODE_ENV=production',
      );
    }
    const port = config.get<string>('PORT', '3000');
    return `http://localhost:${port}/media`;
  }

  const trimmed = configured.replace(/\/+$/, '');

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new Error(
      `MEDIA_PUBLIC_BASE_URL must be an absolute URL, got: ${configured}`,
    );
  }

  if (isProduction && parsed.protocol !== 'https:') {
    throw new Error('MEDIA_PUBLIC_BASE_URL must use https: in production');
  }

  return trimmed;
}
