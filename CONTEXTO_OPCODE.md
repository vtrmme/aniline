# 📋 CONTEXTO COMPLETO DEL PROYECTO AniLine (para opencode)

> Archivo de transferencia de contexto. Léelo entero antes de hacer cualquier cambio. Manténlo actualizado si algo relevante cambia.

---

## 1. Qué es este proyecto

**AniLine** — Plataforma de streaming de anime.
- **Framework:** Next.js 16.4.5 (App Router, Turbopack)
- **React:** 19.3.0
- **Estilos:** Tailwind CSS v4
- **Auth:** NextAuth v4 (Google provider)
- **Backend/BBDD:** Supabase (PostgreSQL + Storage)
- **Metadatos anime:** AniList (GraphQL)
- **Reproductor:** Plyr + hls.js (HLS opcional)
- **Servidores de vídeo:** Supabase propio + embeds por AniList ID (MegaPlay, VidPlus, VidHawk, Moviepire)
- **i18n:** ES / EN (contexto `contexts/LanguageContext.tsx`, key `aniline-lang` en localStorage)
- **Vídeos:** Supabase Storage bucket `episode-videos` (signed URLs para subir y reproducir)
- **Despliegue:** Vercel (URL: `https://aniline.vercel.app/`), deploy automático desde GitHub `main`
- **Idioma de UI y mensajes de error:** Español

---

## 2. Estructura de carpetas y archivos clave

```
app/
├── page.tsx                          # Home: últimos episodios + lista popular con filtros
├── layout.tsx                        # Layout raíz (proveedor de idioma + metadata SEO)
├── globals.css                       # Tailwind + variables dark mode
├── sitemap.ts                        # Sitemap dinámico desde Supabase
├── robots.ts                         # Robots.txt
├── buscar/page.tsx                   # Buscador con debounce por title_es
├── anime/[slug]/page.tsx             # Detalle del anime + lista de episodios
├── anime/[slug]/[episode]/page.tsx   # Selector de servidores + reproductor + progreso
├── lista/page.tsx                    # Watchlist del usuario autenticado
├── perfil/page.tsx                   # Perfil con estadísticas
├── auth/
│   ├── signin/page.tsx               # Página de login con Google
│   └── error/page.tsx                # Página de error de autenticación
├── api/
│   ├── auth/[...nextauth]/route.ts   # NextAuth (Google provider)
│   ├── animes/sync/route.ts          # Endpoint sincronizar animes AniList → Supabase
│   ├── historial/route.ts            # Historial + progreso en segundos (GET/POST)
│   ├── perfil/stats/route.ts         # Estadísticas de usuario (GET)
│   ├── stream/
│   │   ├── servers/route.ts          # Lista de servidores + URL firmada + HLS (GET)
│   │   └── resolve/route.ts          # Resolutor HLS opcional (GET)
│   ├── watchlist/route.ts            # Watchlist CRUD (GET/POST/DELETE)
│   ├── watchlist/mine/route.ts       # Watchlist del usuario autenticado (GET)
│   └── videos/
│       ├── upload/route.ts           # Signed URL para subir video a Supabase Storage
│       └── play/route.ts             # Signed URL temporal (1h) para reproducir video
components/
├── Navbar.tsx                        # Navegación, auth, cambio de idioma, menú móvil
├── AnimeCard.tsx                     # Tarjeta de anime
├── EpisodePlayer.tsx                 # Selector de servidores + Plyr/HLS/iframe
├── LatestEpisodes.tsx                # Sección "Últimos episodios" del home
├── VideoPlayer.tsx                   # Reproductor legacy (fallback)
└── SkeletonAnimeCard.tsx             # Esqueleto de carga
contexts/
└── LanguageContext.tsx               # Contexto de idioma (localStorage aniline-lang)
lib/
├── supabase.ts                       # Cliente Supabase (createClient + createServerClient)
├── anilist.ts                        # Cliente GraphQL de AniList + computeTotalEpisodes
├── streaming.ts                      # Registro de servidores/providers embed
├── translations.ts                   # Traducciones ES/EN
├── utils.ts                          # Utilidad cn()
└── rate-limit.ts                     # Rate limiting en memoria
types/
└── index.ts                          # Interfaces Anime, Episode, WatchlistItem, HistorialItem, PerfilStats
scripts/
├── sync-animes.ts                    # Sincronización AniList → Supabase (no borra videos subidos)
├── backfill-anilist-id.ts            # Rellena animes.anilist_id para slugs manuales
├── fix-episode-counts.ts             # Repara recuento de episodios (AniList nextAiringEpisode)
└── unify-duplicates.ts               # Unifica animes duplicados migrando watchlist/historial
.env.local                            # Variables de entorno locales (NO commitear, en .gitignore)
.env.example                          # Plantilla de variables de entorno
supabase_setup.sql                    # SQL setup inicial Supabase
supabase_storage_setup.sql            # SQL para crear bucket episode-videos
supabase_migration_streaming.sql      # Migración idempotente: anilist_id, segundos, UNIQUE episodes
AGENTS.md                             # Instrucciones originales del repo
CONTEXTO_OPCODE.md                    # ← este archivo (NUNCA pegar secretos reales aquí)
```

---

## 3. Variables de entorno

> ⚠️ Nunca pegues valores reales en este archivo. Usa placeholders.

### En `.env.local` (desarrollo local)

```
NEXT_PUBLIC_SUPABASE_URL=TU_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=TU_ANON_KEY
GOOGLE_CLIENT_ID=TU_GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET=TU_GOOGLE_CLIENT_SECRET
NEXTAUTH_SECRET=TU_NEXTAUTH_SECRET
NEXTAUTH_URL=http://localhost:3000
SUPABASE_SERVICE_ROLE_KEY=TU_SERVICE_ROLE_KEY
```

Opcionales:

```
STREAM_RESOLVER_URL=                # Agregador HLS propio; si se define aparece la pestaña "HD"
NEXT_PUBLIC_STREAM_PROVIDERS=       # Limitar providers embed, ej: megaplay,vidplus
```

### En Vercel (Settings → Environment Variables)

Misma lista que arriba, salvo:

- `NEXTAUTH_URL=https://aniline.vercel.app/`  (producción, no localhost)
- `SUPABASE_SERVICE_ROLE_KEY` **sin** prefijo `NEXT_PUBLIC_` (solo servidor)
- `STREAM_RESOLVER_URL` y `NEXT_PUBLIC_STREAM_PROVIDERS` solo si se usan

### Pendiente en Google Cloud Console

Ir a **Google Cloud Console → APIs y Servicios → Credenciales**, editar el cliente OAuth 2.0 del `GOOGLE_CLIENT_ID` y agregar en **URI de redireccionamiento autorizados**:

```
https://aniline.vercel.app/api/auth/callback/google
```

Sin esto, el login de Google en producción falla.

---

## 4. Comandos disponibles

```powershell
npm run dev        # Servidor de desarrollo en http://localhost:3000
npm run build      # Build de producción (verificado OK)
npm run start      # Servidor de producción
npm run lint       # ESLint (verificado OK, 0 errores)
npx tsx scripts/sync-animes.ts         # Sincroniza animes desde AniList a Supabase
npx tsx scripts/backfill-anilist-id.ts # Rellena anilist_id faltante
npx tsx scripts/fix-episode-counts.ts  # Repara número de episodios
npx tsx scripts/unify-duplicates.ts    # Unifica animes duplicados
npx vercel         # Desplegar en Vercel (desarrollo/preview)
npx vercel --prod  # Desplegar a producción en Vercel
npx vercel login   # Login en CLI de Vercel
```

Reglas estrictas del proyecto:
- Toda función debe incluir tipos explícitos en TypeScript.
- **Prohibido usar el tipo `any`.**
- Todos los mensajes de error deben devolverse en español.

---

## 5. Flujo de vídeos (Supabase Storage)

1. Ejecutar `supabase_storage_setup.sql` en el SQL Editor de Supabase para crear el bucket `episode-videos`.
2. Configurar `SUPABASE_SERVICE_ROLE_KEY` en `.env.local` y en Vercel.
3. Subir vídeos usando `POST /api/videos/upload` → devuelve `uploadUrl` y `path`.
4. Actualizar el campo `video_url` del episodio con el `path` devuelto (path dentro del bucket, no URL directa).
5. Al reproducir, llamar `GET /api/videos/play?path=...` → devuelve `videoUrl` firmada temporal (1 hora).

Toda función de servidor que escriba en Supabase debe usar `createServerClient()` (con `SUPABASE_SERVICE_ROLE_KEY`), no `createClient()`.

---

## 6. Sistema de servidores de streaming

- `GET /api/stream/servers?slug=...&episode=...&lang=sub|dub` → lista de servidores (Supabase propio, embeds por AniList ID, YouTube) + URL firmada + `hlsUrl` opcional.
- Los embeds se construyen en cliente con `lib/streaming.ts` a partir del `anilist_id` del anime (columna añadida en `supabase_migration_streaming.sql`).
- Si existe `STREAM_RESOLVER_URL`, se consulta `/watch?anilistId=&episode=&lang=` y se añade la pestaña **HD (m3u8)**.
- Progreso: nativo/HLS guarda segundos vía `/api/historial`; en embeds (cross-origin) solo botón "Marcar como visto" + guardado al salir de la pestaña.

---

## 7. Endpoints API

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/auth/[...nextauth]` | GET/POST | NextAuth (Google login, callback, signout) |
| `/api/animes/sync` | POST | Sincroniza animes desde AniList a Supabase |
| `/api/historial` | GET/POST | Historial + progreso en segundos |
| `/api/perfil/stats` | GET | Estadísticas de usuario (animes vistos/viendo/para ver, género favorito) |
| `/api/stream/servers` | GET | Servidores de un episodio + signed URL + HLS |
| `/api/stream/resolve` | GET | Resolutor HLS opcional (`?anilistId=&episode=&lang=`) |
| `/api/videos/upload` | POST | Signed URL de subida a Supabase Storage |
| `/api/videos/play` | GET | Signed URL temporal de reproducción (`?path=...`) |
| `/api/watchlist` | GET/POST/DELETE | Watchlist CRUD |
| `/api/watchlist/mine` | GET | Watchlist completa del usuario autenticado |

---

## 8. Páginas y rutas

| Ruta | Descripción |
|------|-------------|
| `/` | Home: últimos episodios + lista popular de animes |
| `/buscar` | Buscador con debounce por `title_es` |
| `/anime/[slug]` | Detalle del anime + lista de episodios |
| `/anime/[slug]/[episode]` | Selector de servidores + reproductor + progreso |
| `/lista` | Watchlist del usuario autenticado |
| `/perfil` | Estadísticas del usuario |
| `/auth/signin` | Página de login con Google |
| `/auth/error` | Página de error de autenticación |

---

## 9. Tipos TypeScript (`types/index.ts`)

Interfaces principales: `Anime` (incluye `anilist_id`), `Episode`, `WatchlistItem`, `HistorialItem` (incluye `segundos`), `PerfilStats`.

---

## 10. Mejoras implementadas

1. ✅ Dark mode con toggle en Navbar (persistido en localStorage `aniline-theme`)
2. ✅ Filtros y paginación en Home y Buscador
3. ✅ Detalle de anime ampliado (tráiler YouTube, banner, estudio, score, similares)
4. ✅ Watchlist funcional (marcar estado: para ver/viendo/visto, puntuación 1-10)
5. ✅ Historial de reproducción + progreso en segundos + botón "Retomar episodio"
6. ✅ Perfil de usuario con estadísticas
7. ✅ SEO: sitemap.xml dinámico, robots.txt, metadata Open Graph/Twitter
8. ✅ Componente SkeletonAnimeCard para estados de carga
9. ✅ Rate limiting en APIs de upload, sync, stream y resolve
10. ✅ Páginas de auth personalizadas (`/auth/signin`, `/auth/error`)
11. ✅ Metadata dinámica y Open Graph en layout
12. ✅ Selector de servidores por episodio (embeds por AniList ID + Supabase + YouTube)
13. ✅ Sección "Últimos episodios" en el home (un episodio por anime)
14. ✅ Conteo de episodios correcto para animes en emisión (AniList `nextAiringEpisode`)

---

## 11. Estado actual del despliegue en Vercel

- Código en GitHub: `vtrmme/aniline`, rama `main`
- Build: ✅ OK. Lint: ✅ OK (0 errores).
- Deploy: automático al hacer push a `main`.
- **Pendiente:** redirect URI de Google en Google Cloud Console (ver sección 3).

---

## 12. Cómo actuar cuando el usuario pida algo

1. Leer `CONTEXTO_OPCODE.md` y `AGENTS.md`.
2. Verificar el archivo que se va a editar antes de tocarlo (usar `Read`).
3. Respetar reglas estrictas (tipos explícitos, no `any`, errores en español).
4. Si toca variables de servidor/Supabase, usar `createServerClient()`.
5. Si toca login de Google en producción, asegurar redirect URI en Google Cloud Console.
6. Tras cambios, ejecutar `npm run build` y `npm run lint` para verificar.
7. No commitear a menos que el usuario lo pida explícitamente.

---

## 13. Qué debe hacer el usuario (pendiente)

1. **Google Cloud Console:** Agregar `https://aniline.vercel.app/api/auth/callback/google` como redirect URI autorizado.
2. **Hacer login en producción** para probar `/lista`.
