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

Importante: el respaldo diario de la base (`pg_dump`, ver sección 10) no incluye
las fotos. Las fotos quedan cubiertas por el backup semanal del servidor que
hace DonWeb. Si se elimina el volumen (`docker volume rm siricman_media_data`),
solo se pueden recuperar desde ese backup semanal, y se pierden las fotos
subidas después de la última copia.

## 7. Panel de administración: sesión de administradores

A partir de la versión del front que incluye el inicio de sesión del panel (`/admin`),
el servicio `web` necesita la variable `API_INTERNAL_URL`. Ya está definida en
`compose.yml` (`http://api:3000`): el front la usa para comunicarse con la API dentro
de la red interna de Docker. No es necesario agregarla al `.env`.

Orden de actualización:

1. Copiar al servidor el `compose.yml` actualizado:
   `scp -P 5941 deploy/compose.yml siricman:~/siricman/`
2. Aplicar los cambios: `docker compose pull && docker compose up -d`.
   Aplicar el `compose.yml` antes de que exista la imagen nueva del front no causa
   problemas: la imagen anterior ignora la variable.
3. Verificar: `docker compose exec web printenv API_INTERNAL_URL` debe mostrar
   `http://api:3000`.

IP real del visitante: la API limita los intentos por IP. Las solicitudes del panel
llegan a la API desde el servidor de Next, por eso el front reenvía la IP real del
visitante en el encabezado `X-Forwarded-For`, tomada del valor que agrega Caddy.
Para que esto siga siendo seguro:

- No publicar puertos de `api` ni de `web`; solo Caddy expone 80/443.
- No configurar `trusted_proxies` en Caddy, salvo que se agregue un CDN o balanceador
  delante. En ese caso, revisar esta sección antes del cambio.
- Mantener `TRUST_PROXY=1` en el `.env` de la API.

Comprobación manual después del deploy (límites independientes por IP):

1. Desde una conexión A (por ejemplo, Wi-Fi), enviar seis intentos de login seguidos
   con un usuario inexistente (por ejemplo, `prueba-a`). El sexto debe mostrar el
   mensaje de demasiados intentos.
2. Inmediatamente, desde una conexión B (por ejemplo, datos móviles), intentar el login
   con otro usuario inexistente (`prueba-b`). Debe mostrar "Usuario o contraseña
   incorrectos", no el mensaje de demasiados intentos.
3. Si la conexión B también queda bloqueada, la IP no se está reenviando: revisar la
   configuración de Caddy y los registros de `web`.

## 8. Sitio público (inicio, resultados y ficha)

A partir de la versión del front que publica el catálogo, el servicio `web` usa la
variable `SITE_URL` para las URLs canónicas, el `sitemap.xml`, `robots.txt` y las
vistas previas al compartir. `compose.yml` la arma sola a partir de `SITE_DOMAIN`
(`https://${SITE_DOMAIN}`), así que no hay que agregar nada al `.env`.

Orden de actualización:

1. Actualizar primero la API (incluye los filtros `featured` y `code`, y el límite
   de 300 consultas por minuto para el catálogo público).
2. Copiar el `compose.yml` actualizado:
   `scp -P 5941 deploy/compose.yml siricman:~/siricman/`
3. Aplicar: `docker compose pull && docker compose up -d`.
4. Verificar:
   - `docker compose exec web printenv SITE_URL` muestra `https://<dominio>`.
   - `https://<dominio>/robots.txt` menciona el sitemap con el dominio correcto.
   - `https://<dominio>/sitemap.xml` lista las propiedades publicadas.

Por qué un límite propio para el catálogo: las páginas públicas se arman en el
servidor de Next y piden el catálogo con un caché de 60 segundos. Esas consultas
llegan a la API desde la IP del contenedor `web` (no la del visitante), así que el
límite global de 20 por minuto se agotaría enseguida. Si el sitio muestra "No
pudimos cargar las propiedades" con tráfico normal, revisar los 429 en los logs de
la API: `docker compose logs api | grep 429`.

Opcional: dar de alta el sitio en Google Search Console y enviar
`https://<dominio>/sitemap.xml`.

## 9. Consultas del sitio

La API guarda cada consulta del sitio (tabla `leads`, creada por migración al
arrancar) y las muestra en el panel, en **Consultas**. No se envían emails: las
consultas se responden por WhatsApp desde el detalle de cada una, y quien prefiera
escribir por mail usa la dirección pública que muestra el sitio.

Si un servidor tenía cargadas variables `SMTP_*`, `LEADS_NOTIFY_TO` o
`PUBLIC_SITE_URL` en el `.env`, ya no se usan y se pueden borrar.

Antispam: el formulario acepta hasta 5 envíos por minuto por IP y descarta en
silencio los envíos de bots (campo trampa). No se guarda la IP del visitante.

## 10. Respaldos diarios de la base y monitoreo

Hay dos capas de respaldo y conviene no confundirlas:

- **Respaldo diario de la base (este apartado):** un `pg_dump` por día, guardado en
  el mismo servidor, que conserva los últimos 7. Protege ante un error humano o de
  la aplicación entre dos backups semanales (propiedades borradas, una migración
  defectuosa, un `docker compose down -v`).
- **Backup semanal de DonWeb:** copia del servidor completo, incluidas las fotos
  del volumen `media_data`. Protege ante la pérdida del VPS.

### 10.1 Instalar los scripts

Desde tu máquina, copiá la carpeta `deploy/backup/` al servidor y dales permiso de
ejecución:

```bash
scp -P 5941 -r deploy/backup siricman:~/siricman/
ssh siricman 'chmod +x ~/siricman/backup/*.sh ~/siricman/backup/test/*.sh'
```

Los scripts usan LF como fin de línea (el repo lo fuerza con `.gitattributes`). Si
al ejecutarlos aparece `bad interpreter` o `\r`, el archivo llegó con CRLF: volvé a
copiarlo desde un checkout actualizado del repo.

### 10.2 Medir la base y revisar el disco (una sola vez)

```bash
cd ~/siricman
docker compose exec db sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "select pg_size_pretty(pg_database_size(current_database()))"'
df -h ~
```

Un dump comprimido ocupa una fracción del tamaño de la base; con 7 copias, el total
tiene que quedar muy por debajo del espacio libre. Anotá el tamaño de la base: si
crece mucho con el tiempo, volvé a medir.

### 10.3 Primer respaldo manual

```bash
~/siricman/backup/pg-backup.sh
ls -lh ~/siricman/backups/
```

Debe imprimir una línea `OK: siricman-AAAAMMDD-HHMMSS.dump (...)` y dejar el archivo
en `~/siricman/backups/`. El script valida el dump con `pg_restore --list` antes de
darlo por bueno; si el dump falla, no deja archivos a medias y no borra copias
anteriores.

### 10.4 Programar el respaldo diario

```bash
crontab -e
```

Agregá esta línea (todos los días a las 03:30, hora del servidor):

```cron
30 3 * * * /home/matias/siricman/backup/pg-backup.sh >> /home/matias/siricman/backups/backup.log 2>&1
```

Verificá con `crontab -l`. El primer día, revisá `~/siricman/backups/backup.log`
para confirmar que corrió. La carpeta `backups/` ya existe porque el primer
respaldo manual la creó; sin ella, cron no puede abrir el log.

Variables opcionales (se pueden anteponer en la línea de cron): `BACKUP_KEEP`
(cantidad de copias, por defecto 7) y `BACKUP_MIN_FREE_MB` (espacio libre mínimo,
por defecto 2048).

### 10.5 Protección del disco

Antes de cada dump, el script mide el espacio libre del disco donde se guardan los
respaldos. Si hay menos de `BACKUP_MIN_FREE_MB` (2 GB por defecto), **no crea ningún
archivo**, escribe una línea `SKIPPED: only N MB free (< M MB)` y termina con código
2. Así los respaldos nunca le quitan lugar al servidor ni a las fotos. Cron no
avisa por sí solo: si aparece un `SKIPPED` o un `ERROR` en `backup.log`, liberá
espacio (por ejemplo `docker image prune -f`) y corré el script a mano.

```bash
tail -n 20 ~/siricman/backups/backup.log   # últimas corridas
```

### 10.6 Ver los respaldos disponibles

```bash
ls -lh ~/siricman/backups/siricman-*.dump
```

El nombre incluye la fecha y la hora (`siricman-AAAAMMDD-HHMMSS.dump`).

### 10.7 Restaurar un respaldo

La restauración **reemplaza** la base actual. Pasos:

1. Elegí el archivo con `ls -lh ~/siricman/backups/siricman-*.dump`.
2. Ejecutá:
   ```bash
   ~/siricman/backup/pg-restore.sh ~/siricman/backups/siricman-AAAAMMDD-HHMMSS.dump
   ```
3. El script pide escribir `RESTAURAR` para continuar (con `--yes` omite la
   pregunta; usalo solo si estás completamente seguro del archivo elegido).
4. Antes de tocar nada toma un **respaldo de seguridad** de la base actual. Si ese
   respaldo falla o se omite por falta de disco, la restauración se cancela sin
   cambios.
5. Detiene la API (`docker compose stop api`), restaura con
   `pg_restore --clean --if-exists --no-owner --single-transaction` (si algo falla, la base queda como estaba) y vuelve a iniciar la API, incluso
   si la restauración falla.
6. Verificá: `docker compose ps`, `docker compose logs --tail 50 api` y el sitio y
   el panel en el navegador.

Mientras dura la restauración el sitio público y el panel muestran errores: hacela
en un horario de poco uso.

### 10.8 Qué NO cubre

- **Fotos:** el dump solo contiene la base. Las fotos están cubiertas por el backup
  semanal de DonWeb, no por el respaldo diario.
- **Copia fuera del servidor:** los dumps viven en el mismo VPS. Si el servidor se
  pierde, solo queda el backup semanal de DonWeb.

### 10.9 Monitoreo con UptimeRobot (plan gratuito)

`GET https://api.<dominio>/api/health` es público y responde `200` con
`{"status":"ok"}` si la API y la base funcionan, o `503` si la base no responde.
Verificalo primero:

```bash
curl -i https://api.<dominio>/api/health
```

Después, en [uptimerobot.com](https://uptimerobot.com):

1. Creá una cuenta gratuita.
2. **Alert contacts:** agregá tu email y confirmá el mensaje de verificación.
3. **Add New Monitor** (tipo **HTTP(s)**), dos veces:
   - Sitio: URL `https://<dominio>`.
   - API: URL `https://api.<dominio>/api/health`.
4. En ambos, intervalo de **5 minutos** (el mínimo del plan gratuito) y tu email
   como contacto de alerta.
5. Confirmá que los dos monitores aparezcan en verde (`Up`).

UptimeRobot avisa por email cuando un monitor deja de responder y cuando vuelve.
No monitorea el cron de respaldos: eso se revisa en `backup.log`.
