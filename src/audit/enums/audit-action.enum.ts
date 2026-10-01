/**
 * Acciones sensibles auditadas sobre usuarios y roles.
 * Agregar nuevas acciones acá cuando se audite un flujo nuevo.
 */
export enum AuditAction {
  USER_CREATED = 'user.created',
  USER_ACTIVATED = 'user.activated',
  USER_DEACTIVATED = 'user.deactivated',
  USER_PASSWORD_RESET = 'user.password_reset',
  PASSWORD_CHANGED = 'user.password_changed',
  MFA_BACKUP_CODES_REGENERATED = 'mfa.backup_codes_regenerated',
  ROLE_ASSIGNED = 'role.assigned',
  MFA_ENABLED = 'mfa.enabled',
  MFA_DISABLED = 'mfa.disabled',
  NEIGHBORHOOD_CREATED = 'neighborhood.created',
  PROPERTY_CREATED = 'property.created',
  PROPERTY_UPDATED = 'property.updated',
  PROPERTY_PUBLISHED = 'property.published',
  PROPERTY_ARCHIVED = 'property.archived',
  PROPERTY_UNPUBLISHED = 'property.unpublished',
  PROPERTY_DEAL_STATUS_CHANGED = 'property.deal_status_changed',
  PROPERTY_DELETED = 'property.deleted',
  PROPERTY_IMAGE_UPLOADED = 'property.image_uploaded',
  PROPERTY_IMAGE_REORDERED = 'property.image_reordered',
  PROPERTY_IMAGE_DELETED = 'property.image_deleted',
  LEAD_UPDATED = 'lead.updated',
  LEAD_DELETED = 'lead.deleted',
  CLIENTS_EXPORTED = 'clients.exported',
}
