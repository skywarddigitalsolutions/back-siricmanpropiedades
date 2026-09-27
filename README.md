# Template base - NestJs Authentication Service

El proyecto representa un template base para proyectos NestJS con autenticación JWT y autorización por roles usando Passport. Su objetivo es servir como base para la creación de nuevos servicios de autenticación.

Incluye, además del login con roles: doble factor de autenticación (MFA)
obligatorio para administradores, revocación de sesiones, límites contra
fuerza bruta, auditoría de acciones sensibles y limpieza automática de
datos viejos.

## Índice de documentación

| Página | Contenido |
|--------|-----------|
| [🚀 Puesta en marcha](docs/01-setup.md) | Instalar, configurar variables de entorno, levantar la base con Docker, migraciones, y qué renombrar si usás este repo para un proyecto nuevo |
| [🧰 Tecnologías](docs/02-tecnologias.md) | Stack usado y para qué sirve cada pieza |
| [📖 Documentación de la API](docs/03-documentacion-api.md) | Documentación interactiva (Swagger) para probar los endpoints desde el navegador |
| [🔑 Login y doble factor (MFA)](docs/04-login-mfa.md) | Cómo inicia sesión un usuario y cómo funciona el código extra de seguridad — con diagramas |
| [🔒 Seguridad implementada](docs/05-seguridad.md) | Qué protecciones tiene el sistema, cómo funciona cada una y en qué archivo está — con diagramas |
| [👥 Roles y permisos](docs/06-roles-permisos.md) | Modelo de roles y cómo proteger endpoints según el rol |
| [🧾 Auditoría y retención de datos](docs/07-auditoria-retencion.md) | Quién hizo qué acción sensible, y cómo se limpia la base con el tiempo |
| [📋 Referencia de endpoints](docs/08-endpoints.md) | Listado completo de rutas de la API en texto plano |
| [🛠️ Guía para extender el proyecto](docs/09-guia-desarrollo.md) | Cómo proteger un endpoint propio, agregar un rol nuevo, y estructura de carpetas |

## Inicio rápido

```bash
npm install
cp .env.example .env   # ATENCION: completar JWT_SECRET y MFA_ENCRYPTION_KEY
npm run db:up           # levanta PostgreSQL en Docker
npm run start:dev
```

Guía completa, con todas las variables de entorno explicadas, en
[Puesta en marcha](docs/01-setup.md).
