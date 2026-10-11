# PROMPT: Construir "openletter"

## 0. Rol y objetivo

Eres un ingeniero full-stack senior con ojo de diseñador. Vas a construir **openletter**, una app web en español para crear cartas digitales románticas con formato "story" vertical, efectos de máquina de escribir, partículas flotantes y canción de Spotify. Cada carta creada recibe un **enlace público único** (`/c/[id]`).

Condiciones no negociables:

1. **Base de datos:** PostgreSQL en **Neon** (serverless).
2. **Imágenes:** **UploadThing** (el de Theo, `uploadthing.com`). Las fotos se suben directo del navegador a UploadThing, nunca pasan por las funciones de Vercel.
3. **Caducidad:** cada carta **dura exactamente 7 días**. Pasado ese tiempo se borra de Neon **y** sus imágenes se borran de UploadThing.
4. **Despliegue:** Vercel. Todo debe funcionar igual en local (`localhost:3000`) y en producción.
5. **Réplica fiel** del diseño y los efectos descritos abajo. Si algo no está especificado, decide con criterio y documéntalo en el README.

Entrega código completo, sin placeholders ni `TODO`. Al final, ejecuta la app, crea una carta de prueba y verifica todo el flujo (ver sección 14).

---

## 1. Stack (versiones)

| Capa | Tecnología |
|---|---|
| Framework | Next.js (última estable) con App Router, TypeScript estricto |
| Estilos | Tailwind CSS (última estable) |
| Animación | `motion` (antes framer-motion) |
| Base de datos | Neon Postgres, driver `@neondatabase/serverless` |
| ORM / migraciones | Drizzle ORM + drizzle-kit (`drizzle-orm/neon-http`) |
| Imágenes | `uploadthing` y `@uploadthing/react` (v7 o superior) |
| Validación | `zod` (cliente y servidor) |
| IDs | `nanoid` con alfabeto propio |
| Iconos | `lucide-react` |
| Formularios | `react-hook-form` + `@hookform/resolvers/zod` |
| Fechas | `date-fns` con locale `es` |
| Fuentes | `next/font/google`: **Inter** y una script manuscrita (**Caveat**; alternativas Kalam o Dancing Script, elige la que más se parezca a la referencia) |
| Hosting | Vercel (con Vercel Cron) |

Antes de escribir código de UploadThing, Neon y Vercel Cron, **consulta la documentación vigente** (docs.uploadthing.com, neon.com/docs, vercel.com/docs/cron-jobs). Las APIs cambian; si algo de este prompt difiere de la doc oficial, gana la doc oficial y lo anotas en el README.

---

## 2. Estructura del proyecto

```
openletter/
├─ drizzle/                         # migraciones generadas
├─ drizzle.config.ts
├─ vercel.json                      # cron
├─ next.config.ts                   # remotePatterns de UploadThing
├─ .env.example
├─ README.md
├─ scripts/
│  ├─ seed.ts                       # carta de ejemplo
│  └─ cleanup-local.ts              # corre la limpieza a mano
└─ src/
   ├─ app/
   │  ├─ layout.tsx                 # fuentes, metadata, <html lang="es">
   │  ├─ page.tsx                   # landing mínima con CTA "Crear carta"
   │  ├─ crear/
   │  │  ├─ page.tsx
   │  │  └─ exito/[id]/page.tsx     # enlace + copiar + eliminar
   │  ├─ c/[id]/
   │  │  ├─ page.tsx                # server component: carga y valida expiración
   │  │  ├─ not-found.tsx
   │  │  └─ expirada/page.tsx
   │  └─ api/
   │     ├─ uploadthing/
   │     │  ├─ core.ts              # FileRouter
   │     │  └─ route.ts
   │     ├─ cartas/route.ts         # POST crear
   │     ├─ cartas/[id]/route.ts    # DELETE con manageToken
   │     └─ cron/cleanup/route.ts   # limpieza de caducadas
   ├─ components/
   │  ├─ wizard/                    # WizardShell, StepWho, StepContent, StepMedia, FieldCounter, ExpandableTextarea, PhotoUploader, SpotifyField
   │  └─ viewer/                    # LetterViewer, PhoneFrame, BlurBackground, Particles, DotNav, TypewriterText, SectionCover, SectionMessage, SectionCard, SectionPhoto, SectionChapter, SectionSong, ExpandModal, PolaroidPeek
   ├─ db/
   │  ├─ index.ts                   # cliente drizzle + neon
   │  └─ schema.ts
   ├─ lib/
   │  ├─ env.ts                     # validación de variables con zod
   │  ├─ ids.ts                     # nanoid
   │  ├─ spotify.ts                 # parseo de enlaces
   │  ├─ schemas.ts                 # zod compartidos
   │  ├─ ratelimit.ts               # límite por IP (hash) en DB
   │  ├─ expiry.ts                  # TTL y helpers
   │  ├─ uploadthing.ts             # generateReactHelpers + UTApi singleton
   │  └─ dates.ts                   # formato "11 de octubre de 2025", días juntos
   └─ styles/globals.css
```

---

## 3. Variables de entorno (`.env.example`)

```bash
# Neon (cadena POOLED para la app, DIRECTA para migraciones)
DATABASE_URL="postgresql://...-pooler.../neondb?sslmode=require"
DATABASE_URL_UNPOOLED="postgresql://.../neondb?sslmode=require"

# UploadThing (dashboard → API Keys → copiar UPLOADTHING_TOKEN)
UPLOADTHING_TOKEN=""

# Vercel Cron: Vercel envía "Authorization: Bearer <CRON_SECRET>"
CRON_SECRET=""            # genera con: openssl rand -hex 32

# App
NEXT_PUBLIC_APP_URL="http://localhost:3000"
LETTER_TTL_DAYS="7"
IP_HASH_SALT=""           # openssl rand -hex 16
```

`src/lib/env.ts` valida todo con zod y falla al arrancar con un mensaje claro si falta algo. Ninguna variable secreta con prefijo `NEXT_PUBLIC_`.

---

## 4. Base de datos (Neon + Drizzle)

Usa `drizzle-orm/neon-http` con `neon(process.env.DATABASE_URL)`. Para insertar carta + fotos de forma atómica usa `db.batch([...])` (el driver HTTP no soporta transacciones interactivas). Los IDs se generan en la app antes del insert para poder encadenar el batch.

### Tabla `letters`

| Columna | Tipo | Notas |
|---|---|---|
| `id` | `varchar(12)` PK | nanoid, alfabeto sin ambiguos: `23456789abcdefghijkmnpqrstuvwxyz`, 10 caracteres |
| `recipient_name` | `varchar(150)` NOT NULL | |
| `nickname` | `varchar(150)` NULL | |
| `special_date` | `date` NULL | |
| `sender_name` | `varchar(150)` NULL | |
| `main_message` | `text` NOT NULL | máx. 1200 caracteres |
| `love_text` | `text` NULL | "Lo que más amo de ti", máx. 1200 |
| `story_text` | `text` NULL | "Nuestra historia", máx. 1200 |
| `dreams_text` | `text` NULL | "Sueños juntos", máx. 1200 |
| `spotify_track_id` | `varchar(22)` NULL | validado `^[A-Za-z0-9]{22}$` |
| `manage_token_hash` | `varchar(64)` NOT NULL | SHA-256 del token de gestión |
| `ip_hash` | `varchar(64)` NOT NULL | SHA-256(ip + IP_HASH_SALT), nunca la IP en claro |
| `created_at` | `timestamptz` NOT NULL default now() | |
| `expires_at` | `timestamptz` NOT NULL | `created_at + LETTER_TTL_DAYS` |

Índices: `expires_at` y `(ip_hash, created_at)`.

### Tabla `photos`

| Columna | Tipo | Notas |
|---|---|---|
| `id` | `uuid` PK default gen_random_uuid() | |
| `letter_id` | `varchar(12)` FK → `letters.id` **ON DELETE CASCADE** | |
| `ut_key` | `text` NOT NULL | `key` de UploadThing, necesario para borrar |
| `url` | `text` NOT NULL | `ufsUrl` de UploadThing |
| `position` | `integer` NOT NULL | orden 0..n |
| `caption` | `varchar(120)` NULL | descripción |
| `taken_on` | `date` NULL | "AÑADIR FECHA" |
| `place` | `varchar(120)` NULL | "Añadir lugar" |

Índice en `letter_id`.

### Tabla `rate_events` (límite de abuso sin servicios extra)

`id serial`, `ip_hash varchar(64)`, `kind varchar(16)` (`upload` | `create`), `created_at timestamptz default now()`. Índice `(ip_hash, kind, created_at)`. Se limpia en el cron (borrar > 2 días).

### Migraciones

- `drizzle.config.ts` usa `DATABASE_URL_UNPOOLED`.
- Scripts: `db:generate`, `db:migrate`, `db:studio`.
- En Vercel: `"vercel-build": "drizzle-kit migrate && next build"`.

---

## 5. UploadThing

### 5.1 FileRouter (`src/app/api/uploadthing/core.ts`)

- Ruta `letterImage`: solo imágenes (`image/jpeg`, `png`, `webp`), `maxFileSize: "8MB"`, `maxFileCount: 10`.
- `middleware`: calcula `ipHash` desde `x-forwarded-for`, consulta `rate_events` y rechaza con `UploadThingError("Demasiadas subidas, intenta más tarde")` si supera **40 subidas por IP por hora**. Registra el evento. Devuelve `{ ipHash }`.
- `onUploadComplete`: devuelve `{ key: file.key, url: file.ufsUrl, name: file.name }`. Usa `ufsUrl` (el campo `url` está deprecado en versiones recientes).
- Ruta handler: `createRouteHandler({ router: ourFileRouter })` exportado como `GET` y `POST`.

### 5.2 Cliente (`src/lib/uploadthing.ts`)

- `generateReactHelpers<OurFileRouter>()` exporta `useUploadThing`.
- Singleton `new UTApi()` (solo servidor) para borrar archivos.
- **Antes de subir**, comprime en el navegador con canvas (lado máximo 1920 px, JPEG/WebP calidad 0.85) para ahorrar cuota. Corrige la orientación EXIF.

### 5.3 `next.config.ts`

```ts
images: { remotePatterns: [
  { protocol: "https", hostname: "*.ufs.sh" },
  { protocol: "https", hostname: "utfs.io" },
]}
```

### 5.4 Flujo de subida en el wizard

1. Al soltar/seleccionar fotos se muestran miniaturas **inmediatamente** (object URL) con barra de progreso circular.
2. Se suben en paralelo a UploadThing; al terminar, cada foto guarda `{ key, url }` en el estado del formulario.
3. Si el usuario elimina una foto (✕ rojo) **antes** de crear la carta, se llama a un server action `deleteOrphanFile(key)` que usa `UTApi.deleteFiles`. Si el usuario abandona la página, el barrido de huérfanos del cron las limpia (sección 8).
4. El botón "Crear carta" se deshabilita mientras haya subidas en curso.

---

## 6. API

### `POST /api/cartas`

1. Valida el body con zod (mismo schema que el cliente). Los textos se guardan **como texto plano**; en el visor se renderizan como texto, nunca con `dangerouslySetInnerHTML`.
2. Honeypot: campo oculto `website`; si viene relleno, responde 200 falso sin guardar.
3. Límite: máximo **5 cartas por IP por día** (consulta `rate_events`).
4. Verifica que cada `ut_key` de las fotos tenga el formato esperado y que sean máx. 10.
5. Genera `id` (nanoid 10) y `manageToken` (32 bytes aleatorios en hex). Guarda solo el **hash** del token.
6. `expires_at = now() + LETTER_TTL_DAYS días`.
7. Inserta carta + fotos con `db.batch`.
8. Responde `{ id, url, manageToken, expiresAt }`. El cliente redirige a `/crear/exito/[id]#token=...` (el token va en el fragmento para que no llegue a logs del servidor).

### `DELETE /api/cartas/[id]`

Requiere header `x-manage-token`. Compara hash en tiempo constante (`timingSafeEqual`). Borra primero las imágenes en UploadThing (`utapi.deleteFiles(keys)`), y solo si tuvo éxito borra la fila (cascade elimina `photos`). Responde 204.

### `GET /api/cron/cleanup`

Ver sección 8.

---

## 7. Caducidad de 7 días: reglas

- **Lectura:** `/c/[id]` hace `select ... where id = $1`. Si `expires_at <= now()`, redirige a `/c/[id]/expirada` (mensaje cálido: "Esta carta ya cumplió su semana y se desvaneció. Puedes crear otra."). Así la carta deja de ser accesible **al instante** aunque el cron aún no haya corrido.
- **Aviso visible:** en la pantalla de éxito y como pie discreto en el visor: "Esta carta estará disponible hasta el 18 de octubre, 3:42 p. m." (date-fns, locale es, zona del visitante).
- **Borrado real:** lo hace el cron (sección 8). Es la fuente de verdad para liberar espacio.
- `LETTER_TTL_DAYS` configurable; por defecto 7.

---

## 8. Cron de limpieza (Neon + UploadThing)

`vercel.json`:

```json
{ "crons": [{ "path": "/api/cron/cleanup", "schedule": "0 3 * * *" }] }
```

Nota: en el plan Hobby de Vercel los cron solo pueden correr **una vez al día** y con precisión de ±1 hora; por eso la expiración se aplica también en lectura. En Pro puedes subirlo a cada hora (`0 * * * *`). Documéntalo en el README.

`src/app/api/cron/cleanup/route.ts`:

```ts
export const dynamic = "force-dynamic";
export const maxDuration = 60;
```

Algoritmo:

1. **Autenticación:** si `Authorization !== "Bearer " + CRON_SECRET` → 401. (En local permite correrlo con curl usando el mismo header.)
2. **Cartas caducadas:** en lotes de 50:
   1. `select id from letters where expires_at <= now() limit 50`.
   2. Recoge las `ut_key` de sus fotos.
   3. `utapi.deleteFiles(keys)` en trozos de 100 keys. Si falla, **no borres la fila** (se reintenta en la siguiente ejecución). Esto evita archivos huérfanos pagados.
   4. Borra las cartas (cascade a `photos`).
   5. Repite hasta que no queden o se agote el tiempo (corta a los ~50 s).
3. **Barrido de huérfanos en UploadThing** (fotos subidas pero nunca asociadas a una carta, o carta borrada con fallo parcial): pagina `utapi.listFiles({ limit: 500, offset })`, y borra todo archivo con `uploadedAt` mayor a `LETTER_TTL_DAYS + 1` días. Como ninguna carta vive más de 7 días, cualquier archivo más viejo que 8 días es seguro de eliminar.
4. **Limpieza de `rate_events`:** borra los de más de 2 días.
5. Responde JSON: `{ lettersDeleted, filesDeleted, orphansDeleted, rateEventsDeleted, durationMs }` y lo escribe con `console.log` para verlo en los logs de Vercel.

Además crea `scripts/cleanup-local.ts` (`npm run cleanup`) que ejecuta la misma lógica extraída a `src/lib/cleanup.ts` para probarla en local.

---

## 9. Wizard de creación (`/crear`)

### 9.1 Estilo general

- Fondo `#F4F4F6`. Contenedor centrado, `max-w-[640px]`, padding generoso.
- Título de paso enorme en Inter **light** (~64 px escritorio, ~44 px móvil), con la palabra clave en *cursiva*: "¿Para *quién* es esta carta?".
- Inputs: fondo `#EBEBEF`, borde `1px #D6D6DC`, radio 12 px, altura 50 px, texto 16 px, placeholder gris medio. Focus: borde rosa `#E0698F` + ring suave rosa 20 %.
- Labels: MAYÚSCULAS, 11 px, `font-bold`, `tracking-wide`, color gris `#6B6B76`. Los obligatorios y los títulos de sección en rosa `#E0698F`, con asterisco `*` para obligatorios.
- Contador de caracteres a la derecha de la misma línea del label (`7 / 150`), gris, 11 px, bold. Se pone rojo al llegar al límite.
- Separadores horizontales finos `#E4E4E8` entre secciones.
- **Barra inferior fija** (sticky bottom) con fondo `rgba(244,244,246,.85)`, `backdrop-blur`, bordes redondeados tipo píldora y sombra suave: botón "Atrás" (píldora blanca con borde) a la izquierda y "Siguiente →" (píldora negra, texto blanco bold, flecha) a la derecha.
- Transición entre pasos: el contenido saliente hace fade + slide a la izquierda (−24 px, 200 ms) y el entrante desde la derecha (spring suave). Respeta `prefers-reduced-motion`.
- Indicador de progreso discreto (3 puntos o línea fina rosa arriba).
- El estado del wizard se guarda en `sessionStorage` para sobrevivir recargas (excepto los archivos).

### 9.2 Paso 1: "¿Para *quién* es esta carta?"

- **Nombre de la persona especial \*** (obligatorio, máx. 150).
- Sección "CAMPOS OPCIONALES" (título rosa) con icono ✕ rosa a la derecha que la pliega/despliega con animación de altura:
  - **Apodo cariñoso** (máx. 150), placeholder "¿Cómo llamas a esa persona?".
  - **Fecha especial**: `<input type="date">` con icono de calendario a la derecha, se muestra `dd/mm/aaaa` en locale es.
  - **Tu nombre** (máx. 150).

### 9.3 Paso 2: contenido

Cuatro textareas, cada una con: label, contador, botón **⤢ expandir** arriba a la derecha (abre un modal grande para escribir cómodo y al cerrar sincroniza), handle de resize en la esquina, altura inicial ~200 px el primero y ~140 px el resto, radio 16 px.

1. **Mensaje principal** (label en gris, sentence case como en la captura)
2. **LO QUE MÁS AMO DE TI**
3. **NUESTRA HISTORIA**
4. **SUEÑOS JUNTOS**

Máx. 1200 caracteres cada una. Solo el mensaje principal es obligatorio; las secciones vacías **no se renderizan** en el visor.

### 9.4 Paso 3: fotos y música

- **FOTOS** con icono rosa en cajita rosa pálida y texto "N foto(s) añadida(s)".
  - Dropzone con borde dashed, fondo gris claro, icono de subida rosa, texto "Haz clic o arrastra tus fotos aquí". Estado `dragover`: borde rosa y fondo rosa pálido.
  - Miniaturas 120×120 con botón ✕ rojo circular en la esquina superior derecha, flechas ← → inferiores para reordenar y número de posición en el centro. Etiqueta naranja "N imagen(es)" abajo a la derecha.
  - Máx. 10 fotos, 8 MB cada una, solo imágenes.
- **AÑADIR DESCRIPCIÓN** (por foto): fila con miniatura pequeña (con un botón circular oscuro de "rotar/reemplazar" encima), input "Mi amor de vida en mi ciudad." (máx. 120 con contador `29 / 120`) y debajo dos acciones: "AÑADIR FECHA" (rosa, abre date picker) y "Añadir lugar" (gris, abre input).
- **BANDA SONORA** con icono ♫ en cajita rosa: input de URL de Spotify. Al pegar:
  - Acepta `https://open.spotify.com/track/ID`, `https://open.spotify.com/intl-es/track/ID?si=...` y `spotify:track:ID`.
  - Regex: `/track\/([A-Za-z0-9]{22})/` o `/spotify:track:([A-Za-z0-9]{22})/`.
  - Si es válido muestra chip píldora "Enlace de Spotify detectado · ID: 59oiL6uvsww8qQl3BYfdfC" (con ✓ verde sutil). Si no, error "Pega un enlace de canción de Spotify".
- Botón final "Crear carta" (reemplaza "Siguiente"), con estado de carga y manejo de error con toast.

### 9.5 Pantalla de éxito (`/crear/exito/[id]`)

- Mensaje "Tu carta está lista" con confeti sutil rosa (una sola vez).
- Tarjeta con el enlace completo (`NEXT_PUBLIC_APP_URL/c/[id]`), botón **Copiar enlace** (cambia a "¡Copiado!" 2 s), botón **Ver carta** y botón **Compartir** (Web Share API cuando exista).
- Aviso: "Disponible hasta {fecha}. Después se elimina para siempre."
- Enlace secundario "Eliminar ahora" que usa el `manageToken` del fragmento de la URL (`#token=`), con confirmación.
- Si no hay token en el fragmento, oculta el botón de eliminar.

---

## 10. Visor de la carta (`/c/[id]`): **la parte más importante**

### 10.1 Layout general

- `page.tsx` (server) carga letra + fotos desde Neon, valida expiración y pasa los datos al componente cliente `LetterViewer`.
- **Escritorio:** marco de teléfono centrado, proporción ~9:19, altura `min(92vh, 900px)`, radio 36–40 px, sombra suave grande `0 30px 80px rgba(0,0,0,.12)`, borde translúcido, sobre fondo `#F4F4F6` con un degradado muy sutil.
- **Móvil (< 640 px):** pantalla completa sin marco, usando `100dvh`.
- Contenedor interno con `scroll-snap-type: y mandatory` y `overscroll-behavior: contain`; cada sección es `100%` de la altura del marco con `scroll-snap-align: center`. Oculta la barra de scroll.
- Navegación con rueda, táctil, **teclado** (↑ ↓, PageUp/PageDown, espacio) y clic en los puntos.

### 10.2 Fondo (`BlurBackground`)

- Usa la **primera foto** como fondo a todo el marco (`object-cover`), con `filter: blur(14px) saturate(1.05)` y una capa blanca encima con opacidad ~0.78 (en el video se ve la foto desvanecida y difuminada detrás del texto).
- Zoom lento tipo Ken Burns (scale 1.05 → 1.15 en ~30 s, alternate infinito).
- **Cambia con el scroll:** en las secciones de foto la capa blanca baja a ~0.15 y el blur a 0–2 px (la foto se ve casi nítida); al volver a secciones de texto sube otra vez. Transición 600 ms. Si hay varias fotos, el fondo muestra la foto de la sección activa con crossfade.
- Si no hay fotos: degradado rosa muy pálido (`#FFF5F8` → `#FBE4EC`).

### 10.3 Partículas (`Particles`)

- ~24 partículas diminutas (3–7 px) rosas y blancas con opacidad 0.3–0.7, que derivan lentamente en diagonal con ligera oscilación senoidal y rotación, reapareciendo al salir del marco. Algunas con forma de pétalo (óvalo rotado). Implementa con `<canvas>` y `requestAnimationFrame`, restringido al marco. Pausa cuando la pestaña no está visible. Desactivadas con `prefers-reduced-motion`.

### 10.4 Navegación lateral de puntos (`DotNav`)

- Columna vertical fija a la izquierda dentro del marco (~12 px del borde), centrada verticalmente, un punto por sección existente.
- Inactivo: círculo blanco 8 px con sombra tenue. Activo: rosa `#D6457F`, 11 px, con anillo pulsante suave.
- Clic → `scrollIntoView({ behavior: "smooth" })`. `cursor: pointer`, `aria-label="Ir a {sección}"`, `aria-current` en el activo. Se actualiza con `IntersectionObserver` (umbral 0.6).

### 10.5 Fuentes y colores en el visor

- Nombres y títulos en script (Caveat, 600–700): nombre del destinatario ~56–64 px rosa `#D6457F`; títulos de tarjeta ~28–32 px negro/gris muy oscuro.
- Texto de cuerpo en script cursiva (Caveat o Kalam, ~22 px, interlineado 1.5, color `#3A3A44`).
- Metadatos (fecha, "Con todo mi amor,") en Inter 13 px gris.
- Tarjetas: `rgba(255,255,255,.88)`, `backdrop-blur-xl`, radio 28 px, sombra `0 10px 40px rgba(214,69,127,.10)`, padding 20–24 px, ancho ~86 % del marco.
- Iconos en cajita redondeada 36 px con fondo `#FBE4EC` e icono rosa.

### 10.6 Secciones (en este orden; omite las que no tengan contenido)

**1. Portada (`SectionCover`)**
Centrado vertical y horizontal. De arriba abajo: nombre del destinatario (script rosa grande), fecha especial formateada "11 de octubre de 2025" (Inter pequeña gris), "Con todo mi amor," (Inter pequeña), nombre del remitente (script rosa grande). Si hay apodo, aparece junto al nombre en una línea pequeña ("mi {apodo}"). Entrada escalonada: cada línea hace fade + translateY(12 px → 0) con 150 ms de delay entre ellas. Fondo con la foto muy difuminada.

**2. Mensaje principal (`SectionMessage`) — sin tarjeta**
Texto directamente sobre el fondo: arriba un icono de comillas `"` rosa en contorno (estilo "quote" de lucide), debajo la fecha en cursiva pequeña, luego el mensaje con **efecto máquina de escribir** (~35 ms por carácter, con pequeña variación aleatoria ±15 ms y pausa de 250 ms tras `.` `,` ) y **cursor de bloque rosa** (`▌`, ancho ~8 px, alto de la línea, `#D6457F` al 60 %) que parpadea (opacity 1 ↔ 0 cada 500 ms) al final del texto. Abajo, anclada, la firma "— Juancoquito". Botón circular **⤢** (blanco, 32 px, sombra tenue) a la derecha que abre el texto completo en modal.

**3. Lo que más amo de ti (`SectionCard`)**
Tarjeta flotante centrada verticalmente. Cabecera: icono corazón rosa (en cajita rosa pálida) centrado, título "Lo que más amo de ti" en script, botón ⤢ arriba a la derecha. Cuerpo: texto con typewriter y cursor rosa. La tarjeta aparece con spring (scale .95 → 1, opacity 0 → 1, y +16 → 0). La altura se **adapta al texto a medida que se escribe** (animación de layout suave).

**4. Nuestra historia** — misma tarjeta, icono libro (`BookOpen`).

**5. Sueños juntos** — misma tarjeta, icono estrella o cohete.

**Polaroid asomando:** en las secciones 3, 4 y 5 una foto pequeña (~64×80 px) con marco blanco, sombra e inclinación (−8°) asoma en la **esquina superior izquierda** del marco del teléfono (parcialmente fuera, como pegada). Usa fotos distintas en cada sección (rotando por el arreglo). Entra con una pequeña animación de "caída" (translate −20 px, rotate −14° → −8°).

**6. Fotos (`SectionPhoto`) — una sección por foto**
La capa del fondo se aclara y la foto se ve nítida y a pantalla completa. Abajo, sobre un degradado blanco translúcido, la descripción en script ("Mi amor de vida en mi ciudad."), y si existen, fecha (icono calendario) y lugar (icono pin) en Inter pequeña. La foto entra con un leve zoom-out (1.08 → 1.0). Si la foto tiene descripción, aparece con fade-up 300 ms después.

**7. Nuestro Capítulo (`SectionChapter`)** — solo si hay fecha especial
Tarjeta horizontal compacta, centrada: fila 1 con cajita de icono (sparkles) + título "Nuestro Capítulo" en script; fila 2 con cajita de calendario + "Fecha especial" (cursiva pequeña gris) + la fecha en script grande ("11 de octubre de 2025") + debajo, en rosa y pequeño, **"365 días juntos"** calculado con `differenceInCalendarDays(hoy, specialDate)`. El número hace conteo animado de 0 al valor (1.2 s, easeOut) al entrar en vista. Si la fecha es futura: "Faltan N días". Si es hoy: "¡Hoy es el día!".

**8. Nuestra Canción (`SectionSong`)** — solo si hay `spotify_track_id`
Tarjeta con icono ♫ en cajita rosa, título "Nuestra Canción" en script y botón ⤢. Debajo, **iframe oficial de Spotify**:
`https://open.spotify.com/embed/track/{ID}?utm_source=generator&theme=0`, `height=152`, `width=100%`, `style="border-radius:12px"`, `allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"`, `loading="lazy"`. Se monta **solo cuando la sección entra en vista**.

**Pie global:** texto minúsculo y semitransparente al fondo del marco: "Disponible hasta {fecha} · Hecho con openletter".

### 10.7 Comportamiento del typewriter

- Hook `useTypewriter(text, { active, speed })`. Arranca **solo cuando la sección es visible** (≥ 60 %), no se reinicia al volver a la sección (guarda `done` en estado del padre), y si el usuario hace clic sobre el texto se completa al instante.
- Con `prefers-reduced-motion` muestra el texto completo sin animar.
- Accesibilidad: el texto completo existe en el DOM con `aria-label` (o `sr-only`) para lectores de pantalla; el efecto es solo visual.

### 10.8 Modal de expandir

`ExpandModal`: overlay blanco translúcido con blur, tarjeta grande con scroll interno, texto completo en script, cierre con ✕, `Esc` y clic fuera. Animación de escala desde el botón que lo abrió. Foco atrapado (focus trap).

---

## 11. SEO, privacidad y seguridad

- `robots`: `noindex, nofollow` en `/c/*` y `/crear/*`.
- `generateMetadata` en `/c/[id]`: título "Una carta para {nombre}" y descripción genérica ("Alguien te escribió algo especial"). **No incluyas el contenido** de la carta en metadatos. Open Graph con imagen estática de la marca (no la foto privada).
- Cabeceras: `Referrer-Policy: strict-origin-when-cross-origin`, `X-Content-Type-Options: nosniff`, y CSP que permita `frame-src https://open.spotify.com` e imágenes de `*.ufs.sh`.
- Nunca registres en logs contenido de cartas ni IPs en claro.
- Escapa/renderiza todo como texto. Valida longitudes en servidor.
- Comparación de token con `crypto.timingSafeEqual`.

---

## 12. Landing mínima (`/`)

Una sola pantalla con la misma estética: titular grande en Inter light ("Escríbele algo que *dure*… una semana"), subtítulo corto explicando que las cartas se eliminan a los 7 días, y botón negro píldora "Crear carta →". Debajo, un enlace "Ver carta de ejemplo" a `/c/ejemplo` (la del seed, que **no caduca**: marca esa carta con `expires_at = '9999-12-31'` y exclúyela del cron).

---

## 13. Despliegue en Vercel (documenta paso a paso en el README)

1. Subir a GitHub e importar en Vercel (framework Next.js autodetectado).
2. **Neon:** crear proyecto (o usar la integración "Neon" desde Vercel Marketplace, que inyecta `DATABASE_URL` y `DATABASE_URL_UNPOOLED`). Región cercana a la región de funciones de Vercel.
3. **UploadThing:** crear app en uploadthing.com, copiar `UPLOADTHING_TOKEN`.
4. Variables en Vercel: `DATABASE_URL`, `DATABASE_URL_UNPOOLED`, `UPLOADTHING_TOKEN`, `CRON_SECRET`, `NEXT_PUBLIC_APP_URL` (dominio final), `LETTER_TTL_DAYS`, `IP_HASH_SALT`.
5. Build command: `npm run vercel-build` (migra y compila).
6. Verificar en Vercel → Settings → Cron Jobs que aparece `/api/cron/cleanup`, y lanzarlo manualmente una vez ("Run").
7. Región de funciones: la más cercana a Neon (`vercel.json` → `"regions": ["iad1"]` o la que corresponda).
8. Notas de límites: las funciones de Vercel aceptan bodies de máx. 4.5 MB; por eso las imágenes van directo a UploadThing y la API solo recibe JSON ligero.

---

## 14. Criterios de aceptación (verifícalos tú mismo)

- [ ] `npm install && npm run db:migrate && npm run dev` arranca sin errores con un `.env` válido.
- [ ] Wizard completo: validaciones, contadores, expandir textareas, reordenar y borrar fotos, detección de Spotify.
- [ ] Subir 3 fotos reales: aparecen en el dashboard de UploadThing; al crear la carta se guardan sus `ut_key` en `photos`.
- [ ] Se obtiene un enlace `/c/[id]` único, que abre en una ventana de incógnito.
- [ ] El visor muestra: fondo difuminado, partículas, puntos laterales con scroll suave, portada, typewriter con cursor rosa, tarjetas con polaroid, secciones de foto nítidas, contador de días y embed de Spotify.
- [ ] Funciona bien en móvil (iOS Safari y Chrome Android) y en escritorio dentro del marco.
- [ ] **Caducidad:** cambia manualmente `expires_at` a una fecha pasada en Neon → el enlace pasa a `/expirada` de inmediato. Ejecuta `GET /api/cron/cleanup` con el header `Authorization: Bearer $CRON_SECRET` → la fila desaparece de Neon **y** los archivos desaparecen de UploadThing. Sin el header responde 401.
- [ ] El barrido de huérfanos elimina un archivo subido sin carta cuando se simula con fecha antigua.
- [ ] `DELETE` con token correcto borra carta e imágenes; con token incorrecto → 403.
- [ ] Rate limits devuelven error claro.
- [ ] `npm run build` pasa sin errores de TypeScript ni de lint.
- [ ] Lighthouse móvil: Performance ≥ 85, Accesibilidad ≥ 95 en `/crear` y `/c/ejemplo`.

---

## 15. Orden de trabajo sugerido

1. Scaffold + Tailwind + fuentes + `env.ts`.
2. Drizzle + Neon + migraciones + seed.
3. UploadThing (router, helpers, componente `PhotoUploader`).
4. Wizard (3 pasos) + `POST /api/cartas` + pantalla de éxito.
5. Visor (marco, fondo, partículas, dots, secciones, typewriter, modal).
6. Expiración en lectura + cron + script local + `DELETE`.
7. SEO/seguridad/headers + landing.
8. Pulido de animaciones, accesibilidad, README, pruebas de la sección 14.

---

## 16. Datos de ejemplo para el seed (`/c/ejemplo`, no caduca)

- Destinatario: **Daniela** · Fecha especial: **2025-10-11** · Remitente: **Juancoquito**
- Mensaje principal: "Daniela, no hay día en que no le agradezca a la vida poder pasarla a tu lado. Te amo y me encanta poder decírtelo todos los días."
- Lo que más amo de ti: "A tu lado crecí y aprendí a amar con menos miedo. Amo la relación que hemos construido y odio que el mundo solo lleva 1 año sabiendo que la amo."
- Nuestra historia: "Hoy recuerdo la primera vez que desperté contigo en una cama. Ese día me di cuenta de que quería despertarme así por el resto de mi vida."
- Sueños juntos: "Definitivamente quiero que me sigas enseñando de pinturas que no entiendo, y de amores que se me salen de las manos bajo el cielo contaminado de Bogotá. Quiero hacerlo todo contigo, porque ahí me siento realmente yo."
- Foto: usa una imagen libre de derechos (Unsplash) subida a UploadThing, con descripción "Mi amor de vida en mi ciudad."
- Spotify track ID: `59oiL6uvsww8qQl3BYfdfC`

---

## 17. Entregables finales

1. Repositorio completo y funcional.
2. `README.md` con: qué es openletter, cómo correrlo en local, cómo configurar Neon y UploadThing, cómo desplegar en Vercel, cómo funciona la caducidad (lectura + cron), límites del plan Hobby y decisiones de diseño tomadas.
3. Un resumen final con las URLs/rutas principales y cualquier desviación de este prompt (y por qué)

