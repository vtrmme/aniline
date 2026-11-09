## Repo shape

Proyecto Next.js 16 + React 19 + Tailwind v4 + Supabase + NextAuth (Google) + i18n ES/EN.
Aplicación de streaming de anime "AniLine". Todas las páginas son server/client components bajo app router.

| File | What it is |
|------|------------|
| app/page.tsx | Home: lista popular de animes desde Supabase |
| app/buscar/page.tsx | Buscador con debounce por title_es |
| app/anime/[slug]/page.tsx | Detalle del anime + lista de episodios |
| app/anime/[slug]/[episode]/page.tsx | Reproductor de episodio (Plyr) + info |
| app/lista/page.tsx | Watchlist del usuario autenticado |
| app/api/auth/[...nextauth]/route.ts | NextAuth (Google provider) |
| app/api/animes/sync/route.ts | Endpoint para sincronizar animes desde AniList a Supabase |
| app/api/videos/upload/route.ts | Endpoint para obtener signed URL de subida de video a Supabase Storage |
| app/api/videos/play/route.ts | Endpoint para obtener signed URL de reproducción de video |
| components/Navbar.tsx | Navegación, auth, cambio de idioma, menú móvil |
| components/AnimeCard.tsx | Tarjeta de anime |
| components/VideoPlayer.tsx | Reproductor Plyr |
| lib/supabase.ts | Cliente de Supabase (createClient + createServerClient) |
| lib/anilist.ts | Cliente GraphQL de AniList (metadatos de anime) |
| lib/translations.ts | Traducciones ES/EN |
| lib/utils.ts | Utilidad cn() |
| types/index.ts | Interfaces Anime, Episode, WatchlistItem |
| contexts/LanguageContext.tsx | Contexto de idioma (localStorage aniline-lang) |
| scripts/sync-animes.ts | Script de sincronización AniList → Supabase |
| supabase_storage_setup.sql | SQL para crear bucket de Supabase Storage (episode-videos) |

## Running / verifying

- `npm run dev` — servidor de desarrollo en http://localhost:3000
- `npm run build` — build de producción
- `npm run start` — servidor de producción
- `npm run lint` — ESLint
- `npx tsx scripts/sync-animes.ts` — sincroniza animes desde AniList a Supabase
- No hay tests automatizados. Verificar abriendo la página y navegando.
- `.env.local` contiene credenciales de Supabase y Google (no commitear, en .gitignore).
- `SUPABASE_SERVICE_ROLE_KEY` es necesaria para el script de sincronización y los endpoints de video (obtenerla del dashboard de Supabase → Settings → API).

## Conventions

- UI text and code comments are in Spanish (lang="es").
- localStorage keys: aniline-lang (idioma). Reuse prefixes and keep reads/writes inside try/catch.
- Shell paths need quoting if they contain spaces.
- Videos: se almacenan en Supabase Storage (bucket `episode-videos`). Usar signed URLs para subir y reproducir. El `video_url` de `episodes` almacena el path dentro del bucket, no una URL directa.
- Toda función de servidor que escriba en Supabase debe usar `createServerClient()` (con SERVICE_ROLE_KEY), no `createClient()`.

## Reglas Estrictas del Proyecto

- Toda función debe incluir tipos explícitos en TypeScript.
- Queda estrictamente prohibido usar el tipo any.
- Todos los mensajes de error deben devolverse en español.

## Flujo de trabajo para videos

1. Ejecutar `supabase_storage_setup.sql` en el SQL Editor de Supabase para crear el bucket `episode-videos`.
2. Configurar `SUPABASE_SERVICE_ROLE_KEY` en `.env.local`.
3. Subir videos usando el endpoint `POST /api/videos/upload` (devuelve `uploadUrl` y `path`).
4. Actualizar el campo `video_url` de un episodio con el `path` devuelto.
5. Al reproducir, el endpoint `GET /api/videos/play?path=...` devuelve una `videoUrl` firmada temporal (1 hora).
