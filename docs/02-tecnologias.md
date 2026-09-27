[⬅ Volver al índice](../README.md)

# Tecnologías

Stack usado por el proyecto y para qué sirve cada pieza:

- **NestJS** v11 — framework de backend (organiza el código en módulos, controladores y servicios)
- **TypeORM** + **PostgreSQL** — acceso a la base de datos, con el esquema versionado mediante migraciones
- **Passport** + **passport-jwt** — validación de la sesión en cada pedido
- **@nestjs/jwt** — firma y verificación de los tokens de sesión
- **@nestjs/throttler** — límite de intentos por minuto (anti fuerza bruta / abuso)
- **@nestjs/schedule** — tareas programadas (limpieza automática de datos viejos)
- **@nestjs/swagger** — documentación interactiva de la API (`/docs`)
- **otplib** — generación y verificación de los códigos del doble factor (TOTP)
- **helmet** — cabeceras HTTP de seguridad
- **bcrypt** — hashing de contraseñas (nunca se guardan en texto plano)
- **class-validator** + **class-transformer** — validación de los datos que llegan en cada request

---

[⬅ Volver al índice](../README.md) · Anterior: [Puesta en marcha](01-setup.md) · Siguiente: [Documentación de la API](03-documentacion-api.md)
