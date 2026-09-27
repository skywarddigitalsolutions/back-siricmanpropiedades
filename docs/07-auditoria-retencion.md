[⬅ Volver al índice](../README.md)

# Auditoría y retención de datos

## Auditoría: quién hizo qué

Las acciones sensibles sobre usuarios y roles quedan registradas en la
tabla `audit_logs` (`src/audit/`), con quién la ejecutó, qué acción fue,
sobre qué se hizo y cuándo:

| Acción | Se dispara en |
|--------|----------------|
| `user.created` | `POST /api/users` |
| `user.activated` | `PATCH /api/users/:id/activate` |
| `user.deactivated` | `PATCH /api/users/:id/deactivate` |
| `user.password_reset` | `PATCH /api/users/:id/reset-password` |
| `role.assigned` | Asignación de rol a un usuario (incluida en la creación de usuario) |

El actor se toma del usuario autenticado que ejecuta la acción; si en el
futuro alguna acción la dispara el propio sistema (por ejemplo una tarea
programada), el actor queda en `null`. Registrar la auditoría nunca
interrumpe la operación de negocio que la originó: si por algún motivo
falla el registro, la acción principal igual se completa.

Consulta: `GET /api/audit-logs?entityType=user&actorId=<uuid>&limit=20&offset=0`
(solo admin).

## Retención: qué pasa con los datos viejos

Dos tablas crecerían indefinidamente si nadie las "podara": los tokens de
sesión revocados (logout) y los registros de auditoría. Una tarea
programada (`src/maintenance/retention.service.ts`) se encarga sola:

| Tarea | Frecuencia | Qué elimina |
|-----|------------|-----------|
| Purgar tokens revocados vencidos | Cada hora | Tokens de sesión ya revocados cuya fecha de expiración natural ya pasó (de todos modos ya hubieran sido rechazados por haber vencido) |
| Purgar auditoría vieja | Diario, 3am | Registros de auditoría más viejos que `AUDIT_LOG_RETENTION_DAYS` (default 365 días) |

Si tu caso de uso necesita conservar la auditoría indefinidamente por temas
de compliance, subí `AUDIT_LOG_RETENTION_DAYS` a un valor muy alto o quitá
la tarea programada correspondiente en el código.

---

[⬅ Volver al índice](../README.md) · Anterior: [Roles y permisos](06-roles-permisos.md) · Siguiente: [Referencia de endpoints](08-endpoints.md)
