[⬅ Volver al índice](../README.md)

# Referencia de endpoints

> Esta es una referencia rápida en texto. Para probar los endpoints desde
> el navegador, con ejemplos y respuestas en vivo, usá la documentación
> interactiva: [Cómo está documentada la API](03-documentacion-api.md).

## Auth (`/api/auth`)

| Método | Ruta | Descripción | Auth |
|--------|------|-------------|------|
| POST | `/api/auth/login` | Login → retorna token de sesión | Público (5 req/min por IP + 5 fallos/15min por cuenta) |
| GET | `/api/auth/check-status` | Renovar token (rota: revoca el usado) | Autenticado |
| POST | `/api/auth/logout` | Revoca el token actual | Autenticado |
| POST | `/api/auth/mfa/enable` | Inicia el alta de MFA (requiere password), devuelve el QR/secreto | Token completo o `mfa_setup` (5 req/min) |
| POST | `/api/auth/mfa/confirm` | Confirma el alta con un código, activa MFA | Token completo o `mfa_setup` (5 req/min) |
| POST | `/api/auth/mfa/verify` | Segundo paso del login | Token `mfa_verify` (5 req/min) |
| POST | `/api/auth/mfa/disable` | Desactiva MFA (bloqueado para admin) | Autenticado (5 req/min) |

**Login - Request:**
```json
{
  "userName": "admin",
  "password": "Admin1234!"
}
```

**Login - Response:**
```json
{
  "id": "uuid",
  "userName": "admin",
  "isActive": true,
  "roles": ["admin"],
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

Detalle completo del flujo de login y MFA: [Login y doble factor (MFA)](04-login-mfa.md).

## Users (`/api/users`) - Solo admin

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/users` | Crear usuario con rol |
| GET | `/api/users` | Listar usuarios (`?isActive=true&limit=10&offset=0`) |
| GET | `/api/users/:id` | Obtener usuario por ID |
| PATCH | `/api/users/:id/activate` | Activar usuario |
| PATCH | `/api/users/:id/deactivate` | Desactivar usuario |
| PATCH | `/api/users/:id/reset-password` | Resetear contraseña |

**Crear usuario - Request:**
```json
{
  "userName": "nuevo_usuario",
  "password": "Password1!",
  "roleId": "uuid-del-rol"
}
```

## Roles (`/api/roles`) - Solo admin

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/roles` | Todos los roles |
| GET | `/api/roles/available` | Roles asignables (excluye admin) |
| GET | `/api/roles/:id` | Obtener rol por ID |

## Audit logs (`/api/audit-logs`) - Solo admin

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/audit-logs` | Historial de acciones (`?entityType=user&actorId=uuid&limit=20&offset=0`) |

---

[⬅ Volver al índice](../README.md) · Anterior: [Auditoría y retención de datos](07-auditoria-retencion.md) · Siguiente: [Guía para extender el proyecto](09-guia-desarrollo.md)
