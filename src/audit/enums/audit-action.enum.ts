/**
 * Acciones sensibles auditadas sobre usuarios y roles.
 * Agregar nuevas acciones acá cuando se audite un flujo nuevo.
 */
export enum AuditAction {
  USER_CREATED = 'user.created',
  USER_ACTIVATED = 'user.activated',
  USER_DEACTIVATED = 'user.deactivated',
  USER_PASSWORD_RESET = 'user.password_reset',
  ROLE_ASSIGNED = 'role.assigned',
  MFA_ENABLED = 'mfa.enabled',
  MFA_DISABLED = 'mfa.disabled',
}
