/**
 * "scope" ausente = token completo, válido en cualquier endpoint protegido.
 * "mfa_verify" / "mfa_setup" = token de alcance limitado emitido durante el
 * login cuando falta completar el segundo factor; JwtStrategy los rechaza
 * en cualquier ruta normal (ver auth/strategies/jwt.strategy.ts).
 */
export interface JwtPayload {
  id: string;
  jti: string;
  scope?: 'mfa_verify' | 'mfa_setup';
  /** Issued-at (seconds); added by the JWT library when signing. */
  iat?: number;
}
