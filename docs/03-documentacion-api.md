[⬅ Volver al índice](../README.md)

# Cómo está documentada la API

Además de esta documentación en Markdown, el proyecto expone una
documentación **interactiva** generada automáticamente a partir del código
(Swagger / OpenAPI), donde se puede ver y probar cada endpoint sin salir del
navegador.

## Documentación interactiva (Swagger)

Con la app corriendo, abrí **http://localhost:3000/docs**. Ahí están todos
los endpoints agrupados por categoría (Auth, MFA, Users, Roles, Audit logs),
con ejemplos de qué mandar en cada request y qué respuestas puede devolver
cada uno.

Para probar endpoints protegidos desde la UI:
1. Hacé login (`POST /auth/login`) y copiá el `token` de la respuesta.
2. Tocá el botón **Authorize** (arriba a la derecha) y pegalo sin el
   prefijo `Bearer` (Swagger lo agrega solo).
3. A partir de ahí, "Try it out" en cualquier endpoint protegido ya manda
   ese token automáticamente.

Está apagada por defecto: para usarla en local agregá
`SWAGGER_ENABLED=true` a tu `.env` (en producción dejala sin definir o en
`false`, así no se expone el esquema completo de la API) — no reemplaza ningún control de acceso, solo genera
documentación.

## Referencia en Markdown

Si preferís una lista simple de rutas sin levantar la app, está en
[Referencia de endpoints](08-endpoints.md).

---

[⬅ Volver al índice](../README.md) · Anterior: [Tecnologías](02-tecnologias.md) · Siguiente: [Login y doble factor (MFA)](04-login-mfa.md)
