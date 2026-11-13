# APIs de anime verificadas en vivo

Comprobadas el 13/11/2026 con peticiones reales desde este entorno.
Orden por utilidad para AniLine: primero catálogo/metadatos, luego imágenes y auxiliares.

## ✅ Funcionan (probadas hoy)

### Catálogo / metadatos de anime

| API | URL base | Auth | Tipo | Notas |
|-----|----------|------|------|-------|
| **AniList** (principal) | `https://graphql.anilist.co` | Ninguna | GraphQL | Catálogo completo: títulos, sinopsis, episodios, `nextAiringEpisode`, estudios, género, puntuación. ~30 req/min. Usa `isAdult: false` |
| **Kitsu** | `https://kitsu.io/api/edge` (alias: `https://kitsu.app/api/edge`) | Ninguna | JSON:API | Alternativa REST/JSON:API. Búsqueda `?filter[text]=...`, trending `https://kitsu.io/api/edge/trending/anime`. `page[limit]` máx. 20 |
| **Tenrai** | `https://api.tenrai.org/v1` | Ninguna | REST | Compatible con esquema Jikan (95% endpoints): `/v1/anime/1`, `/v1/top/anime`, `/v1/anime?q=...`. Sustituto directo de Jikan |
| **Shikimori** | `https://shikimori.one/api` | Ninguna | REST | Requiere cabecera `User-Agent`. `/api/animes?search=...`, `/api/animes/1`. Buena cobertura de estudios y ratings |
| **TVMaze** | `https://api.tvmaze.com` | Ninguna | REST | Series/TV (incluye anime). `/singlesearch/shows?q=`, `/shows/{id}/episodes`, `/schedule?date=`. Sin límite publicado |
| **TMDB** | `https://api.themoviedb.org/3` | API key (gratuita) | REST | Ya hay key en `.env.local` (`TMDB_API_KEY`). `/search/tv?query=`, géneros en español. Útil para enriquecer títulos ES |
| **MyAnimeList oficial** | `https://api.myanimelist.net/v2` | `X-MAL-CLIENT-ID` | REST | Funciona registrando app en myanimelist.net (gratuito). Sin key da 400 |

### Imágenes / CDN

| API | URL base | Auth | Notas |
|-----|----------|------|-------|
| **AniList CDN** | `https://s4.anilist.co` | Ninguna | Covers/banner de AniList (devuelven 200). Añadir hostname en `next.config.ts` si aparece uno nuevo |
| **Kitsu CDN** | `https://media.kitsu.io` | Ninguna | Imágenes de Kitsu |

### Auxiliares (fuera del catálogo principal)

| API | URL base | Auth | Notas |
|-----|----------|------|-------|
| **trace.moe** | `https://api.trace.moe` | Ninguna | Identifica anime desde una captura (100 req/min). `/search?url=` |
| **MangaDex** | `https://api.mangadex.org` | Ninguna (User-Agent obligatorio) | Metadatos de manga si se amplía el proyecto |
| **Studio Ghibli** | `https://ghibliapi.vercel.app` | Ninguna | Solo películas Ghibli, catálogo estático |
| **Dragon Ball API** | `https://dragonball-api.com` | Ninguna | Solo franquicia Dragon Ball |

## ❌ No funcionan (evitar o registrar)

| API | Motivo del fallo |
|-----|------------------|
| **Jikan** (`api.jikan.moe`) | Timeout / caído (0% uptime 30d según sondeos). Migrar a Tenrai |
| **AniDB GraphQL** (`graphql.anidb.net`) | Error SSL/TLS |
| **AniAPI** (`api.aniapi.com`) | 401 — requiere key |
| **AnimeChan** (`animechan.xyz`) | 404 — endpoint caído |
| **nekos.best** | 403 |
| **OMDb** | 401 — requiere key gratuita |
| **Consumet** (`api.consumet.org`) | Conexión abortada — servicio caído |
| **waifu.pics / waifu.im / nekosia** | DNS/SSL caídos |
| **Animenewsnetwork (cdn)** | Conexión abortada |
| **anilist.co/graphql (host raíz)** | 403 — usar solo `graphql.anilist.co` |

## Estrategia de respaldo recomendada

1. **Primaria:** AniList GraphQL (la que ya usa `lib/anilist.ts`)
2. **Secundaria:** Tenrai (mismo esquema que Jikan → mapeo sencillo) o Kitsu (JSON:API)
3. **Terciaria:** Shikimori (REST simple) o TVMaze (solo si el título está en su índice)
4. **Enriquecimiento ES/EN:** TMDB con la key existente
5. Caché agresiva: los metadatos cambian poco; 24h de caché corta el 95% de peticiones y tapa caídas

## Reglas comunes

- Filtrar contenido adulto: `isAdult: false` (AniList), `sfw` (Tenrai/Jikan), `ageRating` (Kitsu)
- Guardar IDs estables (`anilist_id`, `mal_id`), no títulos
- Respeta límites: AniList ~30 req/min; Tenrai/Jikan 3 req/s y 60 req/min
