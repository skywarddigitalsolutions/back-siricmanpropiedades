[⬅ Volver al índice](../README.md)

# Guía para extender el proyecto

## 1. Proteger un endpoint

```typescript
import { Controller, Get } from '@nestjs/common';
import { Auth, GetUser } from '../auth/decorators';
import { ValidRoles } from '../auth/interfaces';
import { User } from '../users/entities/user.entity';

@Controller('products')
export class ProductsController {
  // Solo admin
  @Post()
  @Auth(ValidRoles.admin)
  create() { ... }

  // Cualquier autenticado
  @Get()
  @Auth()
  findAll() { ... }

  // Admin o manager - con usuario inyectado
  @Delete(':id')
  @Auth(ValidRoles.admin, ValidRoles.manager)
  remove(@GetUser() user: User) { ... }
}
```

## 2. Agregar un nuevo rol

1. Agregar al enum `ValidRoles`:
```typescript
export enum ValidRoles {
  admin   = 'admin',
  manager = 'manager',
  user    = 'user',
  editor  = 'editor', // <-- nuevo rol
}
```

2. Agregar a `SEED_ROLES` en `src/seed/data/initial-data.ts`:
```typescript
export const SEED_ROLES = [ValidRoles.admin, ValidRoles.manager, ValidRoles.user, ValidRoles.editor];
```

3. Cambiar el nombre del seed (`SEED_NAME`) en `seed.service.ts` para que vuelva a ejecutarse:
```typescript
private readonly SEED_NAME = 'initial-seed-v2';
```

## 3. Importar `AuthModule` en otro módulo

```typescript
@Module({
  imports: [AuthModule],
  controllers: [ProductsController],
})
export class ProductsModule {}
```

## Estructura del proyecto

```
src/
├── auth/
│   ├── decorators/
│   │   ├── auth.decorator.ts        # @Auth(...roles) combinado
│   │   ├── get-user.decorator.ts    # @GetUser(field?)
│   │   ├── role-protected.decorator.ts # @RoleProtected(...roles)
│   │   └── index.ts
│   ├── dto/
│   │   └── login-user.dto.ts        # Login
│   ├── entities/
│   │   ├── revoked-token.entity.ts  # Blacklist de tokens (logout)
│   │   └── mfa-backup-code.entity.ts
│   ├── guards/
│   │   └── user-role/
│   │       └── user-role.guard.ts   # Verifica roles en metadata
│   ├── helpers/
│   │   └── meta-helpers.ts          # Constante META_ROLES
│   ├── interfaces/
│   │   ├── jwt-payload.interface.ts # { id, jti, scope? }
│   │   └── valid-roles.ts           # Enum de roles
│   ├── mfa/
│   │   ├── dto/
│   │   ├── mfa.controller.ts        # /auth/mfa/enable|confirm|verify|disable
│   │   ├── mfa.service.ts           # TOTP, backup codes, cifrado del secreto
│   │   └── mfa.module.ts
│   ├── strategies/
│   │   └── jwt.strategy.ts          # Valida token, jti revocado, rechaza tokens con scope
│   ├── auth.controller.ts           # /login, /check-status, /logout
│   ├── auth.module.ts
│   ├── auth.service.ts
│   └── login-throttle.service.ts    # Bloqueo por cuenta ante fallos repetidos
├── audit/
│   ├── entities/audit-log.entity.ts  # Registro de acciones sensibles
│   ├── enums/audit-action.enum.ts
│   ├── interfaces/audit-actor.interface.ts
│   ├── audit-log.controller.ts      # GET /api/audit-logs (admin)
│   ├── audit-log.service.ts
│   └── audit.module.ts
├── common/
│   ├── constants/
│   │   └── password.constants.ts    # Política de contraseñas compartida
│   └── utils/
│       └── crypto.util.ts           # AES-256-GCM para el secreto TOTP
├── maintenance/
│   ├── retention.service.ts         # Cron: purga revoked_tokens y audit_logs
│   └── maintenance.module.ts
├── migrations/                      # Migraciones de TypeORM (fuente de verdad del esquema)
├── roles/
│   ├── entities/role.entity.ts
│   ├── roles.controller.ts
│   ├── roles.module.ts
│   └── roles.service.ts
├── seed/
│   ├── data/initial-data.ts         # Datos iniciales
│   ├── entities/seed-history.entity.ts
│   ├── seed.module.ts
│   └── seed.service.ts              # Ejecuta al iniciar si RUN_SEED=true
├── user-roles/
│   └── entities/user-role.entity.ts # Tabla intermedia user-roles
├── users/
│   ├── dto/
│   ├── entities/user.entity.ts
│   ├── services/
│   │   ├── user-roles.service.ts    # Asignación y validación de roles
│   │   └── users.service.ts
│   ├── users.controller.ts          # CRUD de usuarios (admin)
│   └── users.module.ts
├── data-source.ts                   # DataSource para el CLI de migraciones
├── app.module.ts
└── main.ts
```

---

[⬅ Volver al índice](../README.md) · Anterior: [Referencia de endpoints](08-endpoints.md)
