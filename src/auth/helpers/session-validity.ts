/**
 * A token is stale when it was issued (JWT `iat`, whole seconds) before the
 * second in which the user last changed their password. Comparing against the
 * floored second keeps the session token issued right after the change (same
 * second) valid. A token without `iat` fails closed once a change exists.
 */
export function isIssuedBeforePasswordChange(
  iat: number | undefined,
  passwordChangedAt: Date | null | undefined,
): boolean {
  if (!passwordChangedAt) return false;
  if (iat === undefined) return true;
  return iat < Math.floor(passwordChangedAt.getTime() / 1000);
}
