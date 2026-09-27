[⬅ Volver al índice](../README.md)

# Puesta en marcha

Cómo instalar, configurar y levantar el proyecto en tu máquina.

## 1. Instalación rápida

```bash
# Instalar dependencias
npm install

# Copiar y completar las variables de entorno
cp .env.example .env

# Levantar PostgreSQL en Docker (usa las variables de tu .env)
npm run db:up

# Modo desarrollo (con hot reload)
npm run start:dev

# Modo producción
npm run build
npm run start:prod
```

Antes de que `start:dev` funcione tenés que completar en `.env` al menos
`JWT_SECRET` y `MFA_ENCRYPTION_KEY` (ver [Variables de entorno](#2-variables-de-entorno)) —
la app se niega a arrancar sin ellos, a propósito.

El seed inicial crea automáticamente los roles y usuarios de prueba al
iniciar si `RUN_SEED=true`.

> **Primer login del admin sembrado por el seed:** como el doble factor (MFA)
> es obligatorio para el rol admin, el primer login con el usuario `admin`
> no entrega acceso completo de una — hay que completar el alta de MFA
> primero. El flujo completo está documentado en
> [Login y doble factor (MFA)](04-login-mfa.md).

## 2. Variables de entorno

Copiar `.env.example` a `.env` y completar:

```bash
cp .env.example .env
```

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `DB_HOST` | Host PostgreSQL | `localhost` |
| `DB_PORT` | Puerto PostgreSQL | `5432` |
| `DB_USER` | Usuario PostgreSQL | `postgres` |
| `DB_PASSWORD` | Contraseña PostgreSQL | `mypassword` |
| `DB_NAME` | Nombre de la base de datos | `auth_roles_db` |
| `DB_SYNCHRONIZE` | Auto-sincronizar esquema desde entities (solo dev local) | `false` |
| `JWT_SECRET` | Secret para firmar los tokens de sesión (mínimo 32 caracteres; la app no arranca con el placeholder del example) | String largo y aleatorio |
| `JWT_EXPIRES_IN` | Tiempo de vida de los tokens de sesión | `60m` |
| `TRUST_PROXY` | Setear en `1` detrás de un proxy/PaaS para que el límite de intentos por IP vea la IP real | vacío / `1` |
| `CORS_ORIGINS` | Orígenes permitidos por CORS, separados por coma | `http://localhost:3000` |
| `AUDIT_LOG_RETENTION_DAYS` | Días de retención de la auditoría antes de purgarla | `365` |
| `MFA_ENCRYPTION_KEY` | Clave AES-256-GCM (64 caracteres hex) para cifrar los secretos del doble factor | `openssl rand -hex 32` |
| `MFA_ISSUER` | Nombre mostrado en la app autenticadora (Google Authenticator, etc.) | `BaseAuth` |
| `SWAGGER_ENABLED` | Activa/desactiva la documentación interactiva en `/docs` | `true` / `false` |
| `RUN_SEED` | Ejecutar el seed inicial | `true` / `false` |
| `SEED_ADMIN_PASSWORD` | Contraseña del usuario admin de prueba | `Admin1234!` |
| `SEED_MANAGER_PASSWORD` | Contraseña del usuario manager de prueba | `Manager1234!` |
| `SEED_USER_PASSWORD` | Contraseña del usuario user de prueba | `User1234!` |

> Las contraseñas de seed del `.env.example` son públicas (están en el repo):
> con `NODE_ENV=production` la app **se niega a sembrar** si siguen siendo esas.

### Reglas de contraseña

Definidas una sola vez en `src/common/constants/password.constants.ts`
(las consumen todos los formularios que reciben una contraseña):
- Mínimo 6 caracteres, máximo 50
- Al menos una mayúscula
- Al menos una minúscula
- Al menos un número o carácter especial

## 3. Base de datos con Docker

`docker-compose.yml` levanta únicamente PostgreSQL (la app se sigue corriendo
con `npm run start:dev`, no dentro de un contenedor). Lee `DB_USER`,
`DB_PASSWORD`, `DB_NAME` y `DB_PORT` desde tu `.env`, así que alcanza con
tener ese archivo configurado antes de levantarla.

```bash
npm run db:up     # levanta el contenedor (docker compose up -d)
npm run db:logs   # sigue los logs de postgres
npm run db:down   # lo apaga (los datos persisten en el volumen, no se borran)
```

El volumen se llama `<name>_db_data`, donde `<name>` es el campo `name:` del
`docker-compose.yml` (ver [más abajo](#5-usar-este-repo-como-base-de-un-proyecto-nuevo)
sobre qué renombrar). Así cada proyecto clonado de este template tiene su
propio volumen aislado, sin importar en qué carpeta lo clones ni qué otros
proyectos con Postgres en Docker tengas corriendo.

Las migraciones no se ejecutan solas al levantar el contenedor de Docker;
corren cuando arranca la app Nest (`migrationsRun: true`, ver la sección
siguiente).

## 4. Migraciones

El esquema se versiona con migraciones de TypeORM (`src/migrations/`). Se
ejecutan automáticamente al levantar la app (`migrationsRun: true` en
`app.module.ts`). `synchronize` está desactivado por defecto y solo debe
habilitarse (`DB_SYNCHRONIZE=true`) en un entorno de desarrollo local
descartable.

```bash
# Generar una migración a partir de cambios en las entities
npm run migration:generate -- src/migrations/NombreDescriptivo

# Crear una migración vacía para escribirla a mano
npm run migration:create -- src/migrations/NombreDescriptivo

# Aplicar migraciones pendientes
npm run migration:run

# Revertir la última migración
npm run migration:revert
```

## 5. Usar este repo como base de un proyecto nuevo

Este repo está pensado para clonarse y arrancar un proyecto distinto cada
vez. Antes de empezar a desarrollar, renombrá lo siguiente para que no
queden rastros de "base-auth" ni choque con otros proyectos que tengas
corriendo en tu máquina (Docker en particular identifica recursos por
nombre, no por carpeta):

| Archivo | Qué cambiar | Por qué |
|---------|-------------|---------|
| `docker-compose.yml` | El campo `name:` al inicio del archivo (ej: `name: mi-proyecto`) | Prefija el contenedor, la red y el volumen de Postgres. Si no lo cambiás, el volumen de datos puede llamarse igual al de otro proyecto clonado de este mismo template y generar confusión (aunque no se pisan datos entre sí, sí puede confundir en Docker Desktop) |
| `.env` (a partir de `.env.example`) | `DB_NAME`, y si querés, `DB_USER`/`DB_PASSWORD` | Nombre de la base de datos del proyecto |
| `.env` | `DB_PORT` | Si ya tenés otro Postgres (de otro proyecto) escuchando en 5432 en tu máquina, `docker compose up` va a fallar por puerto ocupado. Usá un puerto libre por proyecto (ej: 5441) |
| `.env` | `JWT_SECRET` | Cada proyecto necesita su propio secreto; nunca reutilices el mismo entre proyectos |
| `.env` | `MFA_ISSUER` | Es el nombre que ve el usuario en su app autenticadora al escanear el QR - dejarlo en "BaseAuth" confunde si tenés varios proyectos con MFA activado |
| `package.json` | `name` y `description` | Identifica el proyecto en npm/herramientas, y aparece en `package-lock.json` |
| `src/main.ts` | `.setTitle(...)`/`.setDescription(...)` del `DocumentBuilder` (Swagger) | Es lo que aparece como título en `/docs` |
| `README.md` y `docs/` | Todo este contenido | Documentá tu proyecto real, no el template |

---

[⬅ Volver al índice](../README.md) · Siguiente: [Tecnologías](02-tecnologias.md)
