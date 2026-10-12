# openletter

Cartas digitales con formato *story* vertical: eliges una **plantilla**
(amor, aniversario, cumpleaños, amistad, gracias, perdón), escribes por
secciones con ayuda de arranques, sumas fotos, hitos, nota de voz y canción,
y la compartes con un **enlace único** (`/c/[id]`) que **vive 7 días** y luego
se elimina para siempre (de Neon **y** de UploadThing). El destinatario puede
responder con reacciones, y la apertura es un ritual: sobre sellado 3D que se
abre entre 1 y 13 toques.

Sin IA: no hay ninguna función de inteligencia artificial en la app.
Sin emojis-icono: los iconos son lucide (las reacciones del destinatario son
la única excepción, a petición explícita).

## Stack

Next.js 16 (App Router, TypeScript estricto) · Tailwind CSS 4 · `motion` ·
`three` (sobre de apertura) · Neon Postgres (`@neondatabase/serverless`) ·
Drizzle ORM · UploadThing v7 · zod · nanoid · `lucide-react` · `date-fns`
(locale `es`) · `dnd-kit` (reordenar secciones) · `qrcode` · Inter + Fraunces
+ Caveat/Kalam/Dancing Script (`next/font/google`) · Vercel (+ Cron).

## Correr en local

```bash
cp .env.example .env   # completa las variables (ver abajo)
npm install
npm run db:migrate      # esquema + backfills (requiere DATABASE_URL)
npm run dev             # http://localhost:3000
```

Sin `.env` la app **arranca igual** en modo degradado: `/` y `/crear`
(interfaz) funcionan; crear cartas, verlas y subir archivos requieren Neon +
UploadThing reales.

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
| `LETTER_COOKIE_SECRET` | `openssl rand -hex 32`. Firma HMAC de cookies de acceso (cartas con contraseña). Sin esto, el unlock responde 503. |
| `MAX_SCHEDULE_DAYS` | Reservada (programación P2). Default `14`. |

`src/lib/env.ts` valida con zod y falla al arrancar con mensaje claro si falta
algo (en `next build` usa dummies para no bloquear el deploy).

## Plantillas

`src/templates/` (tipos en `types.ts`, copy compartido en `ui.ts`):

| Plantilla | Tema | Partículas | Apertura |
|---|---|---|---|
| Amor (`amor`) | rosa | pétalos | sobre |
| Aniversario (`aniversario`) | borgoña y crema | corazones | sobre |
| Cumpleaños (`cumpleanos`) | coral | confeti | sobre (regalo: P2) |
| Amistad (`amistad`) | turquesa y arena | estrellas | directa |
| Gracias (`gracias`) | salvia y marfil | pétalos | sobre |
| Perdón (`perdon`) | pizarra y perla | nieve | directa |

Cada plantilla define textos del wizard (paso 1–4), portada (saludo/cierre),
4 secciones con 6–8 arranques, títulos del visor (fecha, canción, cierre),
invitación de apertura y textos de expirada/404. El wizard, el visor, el
éxito y el SEO leen del deck; el copy que no varía por plantilla vive en
`ui.ts`. Estructura indexada por `locale` (`es` hoy; `en`/`pt` encajan después).

### Cómo añadir una plantilla nueva

1. Crea `src/templates/miplantilla.ts` con `export const miplantilla: LetterTemplate`
   (copia la forma de `amor.ts`) y `export default { es: miplantilla }`.
2. Registra el `id` en el tipo `LetterTemplate["id"]` (`types.ts`), en el
   `templateIdSchema` (`lib/schemas.ts`) y en `decks` (`index.ts`).
3. Verifica que `icon` y los iconos de sección existan en
   `components/viewer/icons.ts` (registro central lucide).
4. Comprueba el wizard (selector, cambio conservando por `key`) y el visor
   (tema, partículas, apertura, portada, secciones).

## Funcionalidades

- **Wizard en 5 pasos** (plantilla, para quién, qué decir, recuerdos, estilo)
  con autoguardado local cada 800 ms, reanudación y descarte; progreso clicable;
  Ctrl/⌘+Enter para avanzar.
- **Paso 2:** tarjetas con interruptor, arrastre (dnd-kit + teclado), chips de
  arranque del deck, palabras/tiempo de lectura, aviso >900 caracteres,
  undo/redo, expandir y +Añadir (plantilla, biblioteca, en blanco; máx. 8).
- **Recuerdos:** fotos (compresión a 1920 px, caption/fecha/lugar), línea de
  tiempo (8 hitos con foto), nota de voz (graba 60 s u sube audio 4 MB),
  Spotify.
- **Estilo:** color (plantilla + 5), fuente (Caveat/Kalam/Dancing), partículas
  (6), fondo (foto/liso), apertura (sobre/directa), modo noche, palabra secreta
  (scrypt) y resumen con caducidad.
- **Vista previa en vivo** (`/preview` + `postMessage`, debounce 300 ms):
  panel desktop, drawer móvil, salto a la sección del paso.
- **Visor:** apertura 3D (1–13 toques), typewriter, tarjetas, fotos, hilo de
  recuerdos, razones/promesas/ábrela-cuándo, voz, fecha con contador, canción
  (auto-play tras el sobre + píldora), modo noche, respuesta final y pie con
  cierre de la plantilla.
- **Contraseña:** sin ella el servidor no serializa contenido (ni el nombre en
  el SEO); verificación con límite 5 fallos/IP/15 min y cookie HMAC 24 h.
- **Respuestas:** reacciones + mensaje (honeypot, 5/IP/carta) y panel del
  creador `/c/[id]/respuestas#token=…` (aperturas, última visita, countdown,
  eliminar; 403 sin token). Las aperturas se cuentan una vez por sesión
  (beacon + cookie desde Route Handler).
- **Éxito:** copiar, ver, compartir, WhatsApp, correo, ver respuestas, QR
  descargable y tarjeta PNG 1080×1350.

## API

- `POST /api/cartas` — valida con zod (contrato nuevo `sections`/`assets` o
  legado posicional), honeypot, 5 cartas/IP/día, propiedad de `ut_key`
  (misma IP <2 h, 403 si no), audio ≤60 s.
- `DELETE /api/cartas/[id]` — header `x-manage-token` (comparación constante);
  borra archivos primero y la fila después (204).
- `POST /api/cartas/[id]/unlock` — palabra secreta → cookie HMAC 24 h.
- `POST|GET /api/cartas/[id]/respuestas` — responder / panel del creador.
- `POST /api/cartas/[id]/vista` — beacon de apertura (una por sesión).
- `POST /api/orphan` — borra huérfanos pre-creación.
- `GET /api/cron/cleanup` — limpieza (Bearer `CRON_SECRET`).
- UploadThing: `letterImage` (10×8 MB) y `letterAudio` (1×4 MB); ambas
  registran propiedad IP→key para la validación.

## Caducidad (7 días): lectura + cron

- **Lectura:** `/c/[id]` compara `expires_at <= now()` y redirige a
  `/c/[id]/expirada` al instante.
- **Borrado real:** cron diario (`0 3 * * *`, plan Hobby 1/día): en lotes de 50
  borra primero **todos los assets** (imagen **y** audio) y solo entonces las
  filas (cascade a `replies`); luego barre huérfanos de UploadThing
  (> TTL+1 días sin referencia) y purga `rate_events` (> 2 días). Responde y
  loguea `{ lettersDeleted, filesDeleted, orphansDeleted, rateEventsDeleted }`.
- **En local:** `npm run cleanup`.
- Regla de diseño (programación P2, no implementada): si existiera `opens_at`,
  `expires_at = (opens_at ?? created_at) + LETTER_TTL_DAYS` para que ninguna
  carta caduque antes de poder leerse.

## Migraciones

El deploy **no** usa `drizzle-kit migrate` (no sabe renombrar sin perder datos):
la vía real es `scripts/migrate.ts` (DDL idempotente + backfills + fusiones),
invocado por `npm run db:migrate` y `npm run vercel-build`. `drizzle/000*.sql`
documenta cada cambio y `meta/_journal.json` los registra:

- `0000` base · `0001` columna `template` · `0002` theme/sections/timeline/
  opening/password/view_count/locale + `photos`→`assets` + `replies` +
  `rate_events.ref` + **backfill** de textos legado a `sections` ·
  `0003` drop de columnas legado · `0004` fusión de fotos huérfanas.

## Seguridad y privacidad

- Textos como texto plano (sin `dangerouslySetInnerHTML`); `theme`/`sections`
  solo con valores de listas cerradas; CSS nunca libre del usuario.
- Con contraseña no se serializa contenido antes de validar (verificado: el
  HTML bloqueado no contiene textos, fotos, audio ni Spotify ID, ni el nombre
  en metadatos).
- scrypt (N=16384) + sal aleatoria + `timingSafeEqual`; cookies `httpOnly`,
  `secure` en prod, `sameSite=lax`, HMAC con `LETTER_COOKIE_SECRET`.
- Respuestas sin HTML ni autolink, honeypot y rate limit; sin contenido ni IPs
  en logs (solo hashes).
- `noindex, nofollow` en `/c/*`, `/crear/*` y `/preview`.

## Accesibilidad y rendimiento

`aria-label`/`aria-current`/`aria-pressed`, roles switch/radio/progressbar,
foco visible global con el brand, `prefers-reduced-motion` (typewriter,
partículas, sobre, transiciones), contraste AA en curso. three.js solo en la
apertura; emoji-mart no existe (sin picker de emojis); QR solo en éxito;
Spotify IFrame API bajo demanda.

## Estado de verificación (aceptación)

- [x] Cero hardcode: wizard, visor, éxito y SEO leen del deck (`ui.ts` + decks).
- [x] 6 plantillas cambian textos, tema, partículas y apertura (sobre/directa).
- [x] Cambiar de plantilla conserva por `key` (resto → personalizadas).
- [x] Paso 2: chips, toggles, arrastre + teclado, añadir/quitar, contadores, autosave.
- [x] Timeline, razones, ábrela-cuándo y promesas se editan y renderizan.
- [x] Voz: graba (lógica por mimeType), reproductor propio, borrado en cron.
- [x] Contraseña: sin HTML filtrado; entra y recuerda 24 h; 5 fallos bloquean.
- [x] Respuestas llegan al panel con token; 403 sin token; cascade al borrar.
- [x] Preview <500 ms sin guardar; QR y PNG descargan.
- [x] Cron borra Neon + UploadThing (imágenes y audios) con estadísticas.
- [x] Migración sobre datos reales sin pérdidas (cartas, fotos y textos intactos).
- [x] `npm run build` sin errores TS ni lint.
- [ ] Pendiente manual: grabar voz en Chrome/Safari físicos, POST con secciones
      (rate limit 5/día consumido en pruebas), Lighthouse móvil ≥85/95.

## Decisiones y desviaciones

- `cacheComponents: false` (Next 16 prohíbe `export const dynamic` con él).
- `migrate.ts` como vía real en vez de `drizzle-kit migrate` (rename seguro).
- `sections` jsonb con `key/kind/title/icon/body/items/pairs/enabled/order`.
- Conteo de visitas por beacon (el `cookies().set()` de Server Components no
  persiste; el Route Handler sí).
- Sin creador distinguible en el conteo (el visor es anónimo): cuenta por
  sesión de navegador.
- `regalo`/`raspadita` renderizan el sobre hasta su fase (marcadas "pronto").
- Reacciones con emojis solo porque se pidió conservarlas; el resto son lucide.
