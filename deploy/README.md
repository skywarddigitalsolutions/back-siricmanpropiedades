# Runbook de deploy — Siricman Propiedades

Esta carpeta contiene todo lo necesario para correr el sitio público, la API
y la base de datos en el VPS de producción, detrás de HTTPS automático con
Caddy. Las imágenes de Docker se construyen en GitHub Actions y se publican
en GHCR (GitHub Container Registry); el servidor solo las descarga
(`docker compose pull`), nunca las compila. Esto es importante porque el
disco del VPS es limitado (30 GB) y compilar en el servidor dejaría capas y
caché de build ocupando espacio.

> El ejemplo de variables se llama `env.production.example` (sin punto
> inicial, para no confundirlo con un `.env` real). En el servidor se copia
> como `.env`.

## 1. Una sola vez: preparar las imágenes en GitHub

1. Cuando el `main` de cada repo (front y back) recibe un merge, se dispara
   automáticamente el workflow `docker-publish.yml`. También podés
   dispararlo a mano desde la pestaña **Actions** de GitHub
   (`Run workflow` → `workflow_dispatch`).
2. Andá a la pestaña **Actions** de cada repositorio y confirmá que el job
   `build-and-push` terminó en verde. Si falla, el log del job indica el
   paso que dio error.
3. Las imágenes quedan publicadas como paquetes privados por defecto. Como
   el servidor no tiene credenciales para autenticarse contra GHCR, hay que
   hacerlas públicas una única vez:
   - Entrá a la página del repositorio en GitHub → columna derecha,
     sección **Packages** → hacé clic en el paquete (tiene el mismo nombre
     que el repo).
   - **Package settings** (o el ícono de engranaje) → **Change visibility**
     → **Public** → confirmá escribiendo el nombre del paquete.
   - Repetí esto para el paquete del front y el del back.

## 2. En el servidor: primera puesta en marcha

Conectate por SSH (alias configurado: `ssh siricman`, puerto `5941`, usuario
`matias`).

```bash
mkdir -p ~/siricman
cd ~/siricman
```

Copiá a esa carpeta, desde tu máquina, los archivos `compose.yml` y
`Caddyfile` de esta carpeta (`deploy/`) del repo back. Por ejemplo, con
`scp` desde tu máquina (no desde el servidor):

```bash
scp -P 5941 deploy/compose.yml deploy/Caddyfile siricman:~/siricman/
```

Creá el archivo de variables reales a partir del ejemplo (podés copiar el
contenido de `env.production.example` con `scp` directamente como `.env`, o
pegarlo a mano con un editor como `nano`):

```bash
scp -P 5941 deploy/env.production.example siricman:~/siricman/.env
```

O bien, a mano:

```bash
cd ~/siricman
nano .env   # pegá el contenido del ejemplo y completá cada CHANGE_ME
```

Generá los secretos con `openssl` (disponible en cualquier Linux moderno) y
pegalos en los campos correspondientes del `.env`:

```bash
openssl rand -hex 32   # usalo para JWT_SECRET, MFA_ENCRYPTION_KEY y
                        # POSTGRES_PASSWORD / DB_PASSWORD (uno distinto por cada uno)
```

Las contraseñas `SEED_*_PASSWORD` son contraseñas de login, y la API exige
entre 6 y 50 caracteres con al menos una mayúscula, una minúscula y un
número. `openssl rand -hex 32` no sirve para estas (64 caracteres, sin
mayúsculas). Generá cada una con:

```bash
echo "Sm$(openssl rand -hex 12)"   # 26 caracteres: mayúscula, minúscula y números
```

Completá también `SITE_DOMAIN`, `API_DOMAIN` y `ACME_EMAIL` con los datos
reales del dominio. Recordá que `POSTGRES_USER` / `POSTGRES_PASSWORD` /
`POSTGRES_DB` deben tener los mismos valores que `DB_USER` / `DB_PASSWORD`
/ `DB_NAME` — son el mismo usuario y contraseña, leídos por dos servicios
distintos (Postgres y la API) con dos nombres de variable distintos.

Para el primer deploy, dejá `RUN_SEED=true` con contraseñas fuertes y
únicas en `SEED_ADMIN_PASSWORD`, `SEED_MANAGER_PASSWORD` y
`SEED_USER_PASSWORD` (la API rechaza sembrar en producción si detecta las
contraseñas de ejemplo públicas del repo). Después del primer arranque
exitoso, cambiá `RUN_SEED=false` en el `.env` y reiniciá los contenedores
(la siembra corre una sola vez, pero no tiene sentido dejarla habilitada
con contraseñas ya usadas).

Levantá todo:

```bash
docker compose pull
docker compose up -d
```

## 3. Verificación

```bash
docker compose ps                 # los 4 servicios deben estar "healthy" o "running"
docker compose logs -f api        # confirmá que corrieron las migraciones y no hay errores
docker compose logs -f caddy      # confirmá que obtuvo el certificado TLS sin errores

curl -I https://<dominio>              # debe responder 200 desde el front
curl -I https://api.<dominio>/api      # debe responder desde la API (404/401 son normales sin ruta)
curl -I http://www.<dominio>           # debe redirigir (301/308) a https://<dominio>

# Postgres no debe ser alcanzable desde afuera del servidor:
docker compose port db 5432            # no debe imprimir nada (no hay puerto publicado)
```

## 4. Actualizar a una versión nueva

Cada vez que quieras llevar al servidor los últimos cambios ya publicados
en GHCR:

```bash
cd ~/siricman
docker compose pull
docker compose up -d
docker image prune -f   # borra las imágenes viejas que quedaron sueltas, para cuidar el disco
```

Si la versión nueva agrega fotos de propiedades, aplicá primero la sección
6 ("Fotos de propiedades") antes de este paso.

## 5. Primer ingreso como admin

El primer login del usuario admin sembrado requiere configurar MFA (TOTP)
obligatoriamente. Seguí la guía en `docs/04-login-mfa.md` del repo back.

## 6. Fotos de propiedades (volumen de medios)

Las fotos se guardan en el volumen de Docker `media_data`. La API lo usa con
permisos de escritura y Caddy lo sirve en modo solo lectura bajo
`https://api.<dominio>/media/...`. No se publica ningún puerto nuevo.

Pasos (una sola vez, antes o junto con la versión que incluye las fotos):

1. Copiar al servidor los archivos actualizados `compose.yml` y `Caddyfile`:
   `scp -P 5941 deploy/compose.yml deploy/Caddyfile siricman:~/siricman/`
2. Agregar al `.env` del servidor:
   `MEDIA_PUBLIC_BASE_URL=https://api.<dominio>/media`
   (sin barra final; la API no arranca en producción si falta).
3. Aplicar los cambios: `docker compose pull && docker compose up -d`.
4. Verificar:
   - `docker compose logs api` no muestra errores de `MEDIA_*` ni de escritura.
   - `docker compose exec api sh -c 'ls -ld /app/storage/media'` muestra al
     usuario `node` como dueño.
   - Después de subir una foto desde el panel:
     `curl -I https://api.<dominio>/media/properties/<id>/<imagen>-thumb.webp`
     responde `200` con `Cache-Control: public, max-age=31536000, immutable`.
5. Control de espacio: `docker system df -v | grep media_data` o
   `docker compose exec api du -sh /app/storage/media`.

Importante: el respaldo diario de la base (`pg_dump`) no incluye las fotos.
Si se elimina el volumen (`docker volume rm siricman_media_data`), las fotos
se pierden de forma definitiva.
