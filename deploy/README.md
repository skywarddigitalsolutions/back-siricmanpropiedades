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
openssl rand -hex 32   # usalo para JWT_SECRET, MFA_ENCRYPTION_KEY,
                        # POSTGRES_PASSWORD / DB_PASSWORD, y cada
                        # SEED_*_PASSWORD (generá uno distinto por cada uno)
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

## 5. Primer ingreso como admin

El primer login del usuario admin sembrado requiere configurar MFA (TOTP)
obligatoriamente. Seguí la guía en `docs/04-login-mfa.md` del repo back.
