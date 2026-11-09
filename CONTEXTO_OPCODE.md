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
- **i18n:** ES / EN (contexto `contexts/LanguageContext.tsx`, key `aniline-lang` en localStorage)
- **Vídeos:** Supabase Storage bucket `episode-videos` (signed URLs para subir y reproducir)
- **Despliegue:** Vercel (URL: `https://aniline.vercel.app/`)
- **Idioma de UI y mensajes de error:** Español

---

## 2. Estructura de carpetas y archivos clave

```
app/
├── page.tsx                          # Home: lista popular + filtros + paginación
├── layout.tsx                        # Layout raíz + metadata SEO
├── globals.css                       # Tailwind + variables dark mode
├── sitemap.ts                        # Sitemap dinámico desde Supabase
├── robots.txt                        # Robots.txt
├── buscar/page.tsx                   # Buscador con debounce, filtros y paginación
├── anime/[slug]/page.tsx             # Detalle ampliado: tráiler, estudio, score, similares
├── anime/[slug]/[episode]/page.tsx   # Reproductor Plyr + historial + retomar
├── lista/page.tsx                    # Watchlist con cambiar estado/puntuación
├── perfil/page.tsx                   # Perfil con estadísticas
├── api/
│   ├── auth/[...nextauth]/route.ts   # NextAuth (Google provider)
│   ├── animes/sync/route.ts          # Sync AniList → Supabase (con rate limit)
│   ├── historial/route.ts            # Historial de reproducción (GET/POST)
│   ├── perfil/stats/route.ts         # Estadísticas de usuario (GET)
│   ├── watchlist/route.ts            # Watchlist CRUD (GET/POST/DELETE)
│   ├── watchlist/mine/route.ts       # Watchlist del usuario (GET)
│   └── videos/
│       ├── upload/route.ts           # Signed URL subida (con rate limit)
│       └── play/route.ts             # Signed URL reproducción (1h)
components/
├── Navbar.tsx                        # Nav, auth, idioma, dark mode, menú móvil
├── AnimeCard.tsx                     # Tarjeta de anime
└── SkeletonAnimeCard.tsx             # Esqueleto de carga
contexts/
└── LanguageContext.tsx               # Contexto de idioma (localStorage aniline-lang)
lib/
├── supabase.ts                       # createClient + createServerClient
├── anilist.ts                        # Cliente GraphQL de AniList
├── translations.ts                   # Traducciones ES/EN (claves expandidas)
├── utils.ts                          # Utilidad cn()
└── rate-limit.ts                     # Rate limiting en memoria
types/
└── index.ts                          # Interfaces Anime, Episode, WatchlistItem, HistorialItem, PerfilStats
scripts/
└── sync-animes.ts                    # Script sincronización AniList → Supabase
.env.local                            # Variables de entorno locales (NO commitear)
.env.example                          # Plantilla de variables de entorno
supabase_setup.sql                    # SQL setup inicial Supabase
supabase_storage_setup.sql            # SQL bucket episode-videos
AGENTS.md                             # Instrucciones originales del repo
CONTEXTO_OPCODE.md                    # ← este archivo
```

---

## 3. Variables de entorno

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

### En Vercel (Settings → Environment Variables)

Misma lista que arriba, salvo:

- `NEXTAUTH_URL=https://aniline.vercel.app/`  (producción)
- `SUPABASE_SERVICE_ROLE_KEY` **sin** prefijo `NEXT_PUBLIC_` (solo servidor)

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
npx tsx scripts/sync-animes.ts  # Sincroniza animes desde AniList a Supabase
npx vercel         # Desplegar preview en Vercel
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
4. Actualizar el campo `video_url` del episodio con el `path` devuelto.
5. Al reproducir, llamar `GET /api/videos/play?path=...` → devuelve `videoUrl` firmada temporal (1 hora).

Toda función de servidor que escriba en Supabase debe usar `createServerClient()` (con `SUPABASE_SERVICE_ROLE_KEY`), no `createClient()`.

---

## 6. Endpoints API

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/auth/[...nextauth]` | GET/POST | NextAuth (Google login, callback, signout) |
| `/api/animes/sync` | POST | Sincroniza animes desde AniList a Supabase (rate limit: 2/hora) |
| `/api/historial` | GET/POST | Historial de reproducción (ver + registrar episodio visto) |
| `/api/perfil/stats` | GET | Estadísticas de usuario (animes vistos/viendo/para ver, género favorito) |
| `/api/videos/upload` | POST | Signed URL de subida a Supabase Storage (rate limit: 5/min) |
| `/api/videos/play` | GET | Signed URL temporal de reproducción (`?path=...`) |
| `/api/watchlist` | GET/POST/DELETE | Watchlist CRUD |
| `/api/watchlist/mine` | GET | Watchlist completa del usuario |

---

## 7. Páginas y rutas

| Ruta | Descripción |
|------|-------------|
| `/` | Home: lista popular con filtros (género, año, estado, orden) y paginación |
| `/buscar` | Buscador con debounce, filtros y paginación |
| `/anime/[slug]` | Detalle ampliado: tráiler, estudio, puntuación, descripción, episodios, similares |
| `/anime/[slug]/[episode]` | Reproductor Plyr + historial + botón "retomar" |
| `/lista` | Watchlist con cambio de estado y puntuación |
| `/perfil` | Estadísticas del usuario |

---

## 8. Tipos TypeScript (`types/index.ts`)

Interfaces principales: `Anime`, `Episode`, `WatchlistItem`, `HistorialItem`, `PerfilStats`. `Anime` incluye `created_at`, `updated_at`, `tipo`, `estudio`, `puntuacion`, `episodios_count`, `trailer_url`, `descripcion`.

---

## 9. Mejoras implementadas (v2)

1. ✅ Dark mode con toggle en Navbar (persistido en localStorage `aniline-theme`)
2. ✅ Filtros y paginación en Home y Buscar
3. ✅ Detalle de anime ampliado (tráiler YouTube, banner, estudio, score, similares)
4. ✅ Watchlist funcional (cambiar estado, puntuación, filtrar)
5. ✅ Historial de reproducción + botón "Retomar"
6. ✅ Perfil de usuario con estadísticas
7. ✅ SEO: sitemap.xml dinámico, robots.txt, metadata Open Graph/Twitter
8. ✅ Componente SkeletonAnimeCard para estados de carga
9. ✅ Rate limiting en APIs de upload (5/min) y sync (2/hora)
10. ✅ Metadata dinámica y Open Graph en layout

---

## 10. Estado actual del despliegue en Vercel

- Proyecto vinculado a Vercel.
- URL de producción: `https://aniline.vercel.app/`
- Variables de entorno ya configuradas en Vercel.
- **PENDIENTE:** redirect URI de Google en Google Cloud Console (ver sección 3).
- Último commit: `a757fdd feat: sincronización AniList, videos YouTube, watchlist y correcciones`
- Build: ✅ OK. Lint: ✅ OK (0 errores).

---

## 11. Cómo actuar cuando el usuario pida algo

1. Leer `CONTEXTO_OPCODE.md` y `AGENTS.md`.
2. Verificar el archivo que se va a editar antes de tocarlo (usar `Read`).
3. Respetar reglas estrictas (tipos explícitos, no `any`, errores en español).
4. Si toca variables de servidor/Supabase, usar `createServerClient()`.
5. Si toca login de Google en producción, asegurar redirect URI en Google Cloud Console.
6. Tras cambios, ejecutar `npm run build` y `npm run lint` para verificar.
7. No commitear a menos que el usuario lo pida explícitamente.

---

## 12. Qué debe hacer el usuario (pendiente)

1. **Google Cloud Console:** Agregar `https://aniline.vercel.app/api/auth/callback/google` como redirect URI autorizado en las credenciales OAuth del cliente actual.
2. **Subir a GitHub:** `git add .` → `git commit -m "feat: v2 mejoras completas"` → `git push`.
3. **Desplegar en Vercel:** `npx vercel --prod` (o redeploy desde dashboard si está conectado a GitHub).
4. **Verificar:** Probar login de Google en `https://aniline.vercel.app/`.
