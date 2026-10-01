/**
 * Throttle for public catalog reads (`GET /api/properties*`,
 * `GET /api/neighborhoods`), overriding the global 20 req/min. The public
 * site renders these on the Next server with a 60 s data cache, so its
 * requests arrive from the Next container's IP (no visitor IP); a higher
 * per-IP budget keeps the site working while still capping direct scraping.
 */
export const PUBLIC_READ_THROTTLE = {
  default: { limit: 300, ttl: 60_000 },
};
