/**
 * Datos mínimos del usuario que ejecuta una acción auditable.
 * Se usa este tipo reducido (en vez de la entidad User completa) para no
 * acoplar los servicios de auditoría al resto del dominio.
 */
export interface AuditActor {
  id: string;
  userName: string;
}
