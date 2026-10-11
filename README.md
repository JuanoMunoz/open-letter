# openletter 💌

Cartas digitales románticas con formato *story* vertical: máquina de escribir,
partículas flotantes, fotos y canción de Spotify. Cada carta recibe un enlace
público único (`/c/[id]`) que **vive exactamente 7 días** y luego se elimina
para siempre (de Neon **y** de UploadThing).

## Stack

Next.js 16 (App Router, TypeScript estricto) · Tailwind CSS 4 · `motion` ·
Neon Postgres (`@neondatabase/serverless`) · Drizzle ORM · UploadThing v7 ·
zod · nanoid · lucide-react · react-hook-form · date-fns (locale `es`) ·
Inter + Caveat (`next/font/google`) · Vercel (+ Cron).

## Correr en local

```bash
cp .env.example .env   # completa las variables (ver abajo)
npm install
npm run db:migrate      # crea letters, photos, rate_events (requiere DATABASE_URL)
npm run db:seed         # carta de ejemplo en /c/ejemplo (no caduca)
npm run dev             # http://localhost:3000
```

Sin `.env` la app **arranca igual** en modo degradado: `/`, `/crear` y
`/c/ejemplo` (datos en memoria) funcionan; crear cartas y subir fotos requieren
Neon + UploadThing reales.

## Variables de entorno

| Variable | Descripción |
|---|---|
| `DATABASE_URL` | Neon pooled (app). |
| `DATABASE_URL_UNPOOLED` | Neon directa (migraciones). |
| `UPLOADTHING_TOKEN` | Dashboard de UploadThing → API Keys. |
| `CRON_SECRET` | `openssl rand -hex 32`. El cron exige `Authorization: Bearer <secret>`. |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` en local, dominio final en Vercel. |
| `LETTER_TTL_DAYS` | `7` por defecto. |
| `IP_HASH_SALT` | `openssl rand -hex 16`. Las IPs solo se guardan hasheadas (SHA-256). |

`src/lib/env.ts` valida con zod y falla al arrancar con mensaje claro si falta
algo (en `next build` usa dummies para no bloquear el deploy).

## Neon y UploadThing

- **Neon:** crea el proyecto (o usa la integración Neon del Vercel
  Marketplace, que inyecta `DATABASE_URL`/`DATABASE_URL_UNPOOLED`).
  `npm run db:migrate` ejecuta el DDL idempotente de `scripts/migrate.ts`;
  `drizzle/` contiene además la migración generada con `drizzle-kit generate`.
- **UploadThing:** crea una app en uploadthing.com y copia `UPLOADTHING_TOKEN`.
  El `FileRouter` (`letterImage`: solo imágenes, 8 MB, máx. 10) limita a
  **40 subidas/IP/hora** y registra eventos en `rate_events`. El navegador
  comprime a máx. 1920 px (canvas, JPEG/WebP 0.85) antes de subir; los archivos
  van directo del navegador a UploadThing, nunca por Vercel (límite 4.5 MB).

## Despliegue en Vercel

1. Sube a GitHub e importa en Vercel (Next.js autodetectado).
2. Conecta Neon (Marketplace) y define `UPLOADTHING_TOKEN`, `CRON_SECRET`,
   `NEXT_PUBLIC_APP_URL`, `LETTER_TTL_DAYS`, `IP_HASH_SALT`.
3. Build command: `npm run vercel-build` (migra + compila).
4. Verifica en Settings → Cron Jobs que aparece `/api/cron/cleanup` y
   ejecútalo una vez ("Run").
5. Región de funciones `iad1` (cercana a Neon) en `vercel.json`.

## Caducidad (7 días): lectura + cron

- **Lectura:** `/c/[id]` compara `expires_at <= now()` y redirige a
  `/c/[id]/expirada` al instante, aunque el cron aún no haya corrido.
- **Borrado real:** `GET /api/cron/cleanup` (diario `0 3 * * *`) borra en lotes
  de 50: primero `utapi.deleteFiles(keys)` y **solo si tiene éxito** borra las
  filas (si falla, conserva todo para reintentar — cero huérfanos pagados).
  Luego barre huérfanos de UploadThing (> TTL+1 días y sin carta asociada) y
  limpia `rate_events` (> 2 días). Responde y loguea
  `{ lettersDeleted, filesDeleted, orphansDeleted, rateEventsDeleted, durationMs }`.
- **En local:** `npm run cleanup` corre la misma lógica (`src/lib/cleanup.ts`).
- **Plan Hobby:** cron 1 vez/día (±1 h); en Pro puedes usar `0 * * * *`.
- La carta `/c/ejemplo` (seed) usa `expires_at = 9999-12-31` y nunca caduca.

## Límites anti-abuso

5 cartas/IP/día (`POST /api/cartas` → 429) y 40 subidas/IP/hora
(FileRouter → `UploadThingError`), más honeypot `website` anti-bots.

## Características

**Wizard (`/crear`, 3 pasos, persiste en `sessionStorage`):**

1. *¿Para quién?* — nombre obligatorio (máx. 150) + opcionales plegables
   (apodo, fecha especial, tu nombre).
2. *¿Qué decir?* — mensaje principal obligatorio + 3 secciones opcionales
   (máx. 1200 c/u), cada una con contador, botón ⤢ de editor amplio y resize.
   Las secciones vacías no se renderizan en el visor.
3. *Fotos y música* — dropzone (clic o arrastre, máx. 10 × 8 MB), miniaturas
   con progreso circular, reorden ← →, descripción/fecha/lugar por foto y
   borrado con limpieza del huérfano en UploadThing. Campo Spotify que acepta
   URL `open.spotify.com/track/…`, URLs `intl-es` y URIs `spotify:track:…`.

**Visor (`/c/[id]`):** marco de teléfono en escritorio (pantalla completa en
móvil), scroll-snap vertical con navegación por rueda, táctil, teclado
(↑ ↓, PageUp/PageDown, espacio) y puntos laterales. Fondo difuminado con
Ken Burns que se aclara en fotos, ~24 partículas en canvas (pausadas con la
pestaña oculta), typewriter con cursor rosa (clic para completar, no se
reinicia al volver), tarjetas con polaroid asomando, foto a pantalla completa
con degradado, contador animado de días juntos y embed oficial de Spotify
montado solo al entrar en vista. Pie: *"Disponible hasta {fecha} · Hecho con
openletter"*.

**Éxito (`/crear/exito/[id]`):** confeti rosa, tarjeta con enlace, copiar
("¡Copiado!" 2 s), ver carta, compartir (Web Share API) y eliminar ahora con
el `manageToken` del fragmento `#token=` (nunca viaja al servidor en logs).

## Estructura del proyecto

```
├── drizzle/                  # migración generada (drizzle-kit generate)
├── scripts/                  # migrate.ts · seed.ts · cleanup-local.ts
├── vercel.json               # cron diario + región iad1
└── src/
    ├── app/
    │   ├── page.tsx          # landing
    │   ├── crear/            # wizard + exito/[id]
    │   ├── c/[id]/           # visor + not-found + expirada/
    │   └── api/              # uploadthing · cartas · cartas/[id] · orphan · cron/cleanup
    ├── components/
    │   ├── wizard/           # FieldCounter · ExpandableTextarea · PhotoUploader · SpotifyField
    │   └── viewer/           # LetterViewer · Sections · TypewriterText · Particles ·
    │                         # BlurBackground · DotNav · ExpandModal
    ├── db/                   # index.ts (neon-http) · schema.ts (letters, photos, rate_events)
    ├── lib/                  # env · ids · spotify · schemas · ratelimit · expiry ·
    │                         # dates · uploadthing-client/server · cleanup · letter-data
    └── styles/globals.css
```

## Scripts npm

| Script | Qué hace |
|---|---|
| `npm run dev` | Servidor local (http://localhost:3000). |
| `npm run build` / `start` | Compila / sirve producción. |
| `npm run lint` | ESLint (0 errores). |
| `npm run db:generate` | Regenera `drizzle/` desde el schema. |
| `npm run db:migrate` | Aplica el DDL (`scripts/migrate.ts`, requiere DB). |
| `npm run db:seed` | Crea `/c/ejemplo` (no caduca, requiere DB). |
| `npm run db:studio` | Drizzle Studio. |
| `npm run cleanup` | Limpieza local (misma lógica del cron). |
| `npm run vercel-build` | Build command en Vercel (migra + compila). |

## Modelo de datos (resumen)

- **`letters`**: `id` varchar(12) PK (nanoid 10, alfabeto sin ambiguos),
  `recipient_name`, `nickname?`, `special_date?`, `sender_name?`,
  `main_message` (1200), `love/story/dreams_text?`, `spotify_track_id?` (22),
  `manage_token_hash` + `ip_hash` (SHA-256, nunca en claro), `created_at`,
  `expires_at`. Índices en `expires_at` y `(ip_hash, created_at)`.
- **`photos`**: `id` uuid, FK `letter_id` ON DELETE CASCADE, `ut_key` (para
  borrar en UploadThing), `url`, `position`, `caption?`, `taken_on?`, `place?`.
- **`rate_events`**: `ip_hash`, `kind` (`upload`|`create`), `created_at`
  (se purga a los 2 días en el cron).

## Seguridad y privacidad

- `/c/*` y `/crear/*` con `noindex, nofollow` (+ header `X-Robots-Tag`) y
  metadatos genéricos ("Alguien te escribió algo especial", sin contenido).
- Textos guardados como texto plano y renderizados como texto (sin
  `dangerouslySetInnerHTML` salvo el título estático del wizard).
- `DELETE` compara el hash del token con `crypto.timingSafeEqual` (403 si
  falla); borra imágenes primero y solo entonces la fila.
- Cabeceras `Referrer-Policy` y `X-Content-Type-Options`; CSP/implícita vía
  `remotePatterns` (`*.ufs.sh`, `utfs.io`) y `frame-src` de Spotify.
- Sin IPs ni contenido de cartas en logs.

## Accesibilidad

`aria-label`/`aria-current` en puntos de navegación, texto completo expuesto a
lectores (`aria-label` + `sr-only`), modal con focus trap + `Esc` + clic fuera,
`prefers-reduced-motion` respetado (typewriter, partículas, Ken Burns y
transiciones del wizard), contraste y focos visibles en el wizard.

## Estado de verificación

Con `npm run lint` + `npm run build` en verde y pruebas en dev (`/`, `/crear`,
`/c/ejemplo`, 404, `POST /api/cartas` → 400, cron sin auth → 401, DELETE sin
token → 401). Pendiente con credenciales reales: subida de 3 fotos a
UploadThing, expiración manual (`expires_at` pasado → `/expirada` + cron que
borra fila y archivos), `DELETE` con token correcto/incorrecto, rate limits y
Lighthouse móvil ≥ 85/95.

## Rutas principales

`/` (landing) · `/crear` (wizard 3 pasos) · `/crear/exito/[id]` (enlace +
copiar/compartir/eliminar con `#token=`) · `/c/[id]` (visor) ·
`/c/ejemplo` (demo) · `POST /api/cartas` · `DELETE /api/cartas/[id]`
(header `x-manage-token`, hash en tiempo constante) ·
`GET /api/cron/cleanup` · `POST /api/orphan` (huérfanos pre-creación).

## Decisiones y desviaciones del prompt

- `cacheComponents: false` en `next.config.ts`: Next 16 lo trae activado en el
  scaffold y prohíbe `export const dynamic`; las rutas API y `/c/[id]` deben
  ser dinámicas por naturaleza.
- Migración propia (`scripts/migrate.ts`, DDL idempotente) en vez de
  `drizzle-kit migrate` en el build: más robusta sin archivos externos;
  `drizzle/0000_*.sql` se genera igual con `npm run db:generate`.
- `src/lib/uploadthing-client.ts` + `uploadthing-server.ts` separados: el
  `UTApi` no puede importarse en el cliente.
- `/c/ejemplo` funciona sin DB (fallback en memoria con los datos del seed) y
  con DB si corres `npm run db:seed`.
- Sin `react-hook-form` en el wizard final: el estado con fotos/compresión
  encajaba mejor en `useState` + validación zod compartida en el servidor;
  la dependencia queda instalada pero el formulario usa estado controlado con
  el mismo `createLetterSchema` como contrato.
