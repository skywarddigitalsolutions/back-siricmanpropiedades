[⬅ Volver al índice](../README.md)

# Roles y permisos

## Modelo de datos

```
users (1) ──── (N) user_roles (N) ──── (1) roles
```

- Un usuario puede tener múltiples roles (tabla intermedia `user_roles`)
- Cada rol tiene un nombre único (por ejemplo: `admin`, `manager`, `user`)

## Roles predefinidos (`ValidRoles` enum)

```typescript
export enum ValidRoles {
  admin   = 'admin',
  manager = 'manager',
  user    = 'user',
}
```

> Para agregar nuevos roles: modificá el enum, agregalo en `SEED_ROLES` y
> ejecutá el seed de nuevo. Paso a paso en
> [Guía para extender el proyecto](09-guia-desarrollo.md#2-agregar-un-nuevo-rol).

## Cómo proteger un endpoint según el rol

```typescript
// Cualquier usuario autenticado
@Auth()

// Solo admin
@Auth(ValidRoles.admin)

// Admin o Manager
@Auth(ValidRoles.admin, ValidRoles.manager)

// Toda una clase
@Controller('users')
@Auth(ValidRoles.admin)
export class UsersController { ... }
```

El detalle de cómo funciona `@Auth(...)` por dentro está en
[Seguridad implementada](05-seguridad.md#componentes-principales-referencia-para-desarrolladores).

## Regla de seguridad: protección del rol admin

- No se pueden crear usuarios con rol `admin` a través del endpoint
  `POST /api/users` — ese rol solo existe vía seed o acceso directo a la
  base de datos.
- No se puede desactivar al último usuario `admin` activo del sistema.

---

[⬅ Volver al índice](../README.md) · Anterior: [Seguridad implementada](05-seguridad.md) · Siguiente: [Auditoría y retención de datos](07-auditoria-retencion.md)
