import type { AnilistMedia } from "@/lib/anilist"
import { searchAnimes, fetchCatalogPage } from "@/lib/anilist"

const TENRAI_API_URL = "https://api.tenrai.org/v1"
const KITSU_API_URL = "https://kitsu.io/api/edge"
const TENRAI_MAX_LIMIT = 25
const KITSU_MAX_LIMIT = 20

export type ProveedorCatalogo = "anilist" | "tenrai" | "kitsu"

interface TenraiGenero {
  mal_id?: number
  name?: string
  type?: string
}

interface TenraiImagen {
  image_url?: string
  small_image_url?: string
  large_image_url?: string
}

interface TenraiImagenes {
  jpg?: TenraiImagen
  webp?: TenraiImagen
}

interface TenraiTrailer {
  youtube_id?: string
  url?: string
}

interface TenraiEstudio {
  mal_id?: number
  name?: string
  type?: string
}

interface TenraiAired {
  from?: string
  to?: string | null
}

interface TenraiAnime {
  mal_id: number
  title: string
  title_english?: string | null
  title_japanese?: string | null
  episodes?: number | null
  status?: string | null
  score?: number | null
  synopsis?: string | null
  year?: number | null
  aired?: TenraiAired
  images?: TenraiImagenes
  trailer?: TenraiTrailer
  studios?: TenraiEstudio[]
  genres?: TenraiGenero[]
  type?: string | null
}

interface TenraiListaResponse {
  data?: TenraiAnime[]
  pagination?: { has_next_page?: boolean }
}

interface KitsuTitles {
  en?: string
  en_jp?: string
  ja_jp?: string
}

interface KitsuPoster {
  original?: string
  medium?: string
  small?: string
}

interface KitsuCover {
  original?: string
  large?: string
}

interface KitsuAttributes {
  titles?: KitsuTitles
  canonicalTitle?: string
  synopsis?: string | null
  status?: string | null
  episodeCount?: number | null
  averageRating?: string | null
  startDate?: string | null
  posterImage?: KitsuPoster | null
  coverImage?: KitsuCover | null
  showType?: string | null
  subtype?: string | null
  nsfw?: boolean
  youtubeVideoId?: string | null
}

interface KitsuIncluido {
  id?: string
  type?: string
  attributes?: { name?: string }
}

interface KitsuRelaciones {
  genres?: { data?: Array<{ id?: string }> }
}

interface KitsuAnime {
  id?: string
  attributes?: KitsuAttributes
  relationships?: KitsuRelaciones
}

interface KitsuListaResponse {
  data?: KitsuAnime[]
  included?: KitsuIncluido[]
  meta?: { count?: number }
}

function dormir(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function pedirConReintentos(
  url: string,
  headers: Record<string, string>,
  proveedor: string,
  reintentos: number = 3
): Promise<Response> {
  let ultimoError = `Error de red contra ${proveedor}`

  for (let intento = 1; intento <= reintentos; intento++) {
    try {
      const response = await fetch(url, {
        headers,
        signal: AbortSignal.timeout(15000),
      })

      if (response.status === 429) {
        ultimoError = `${proveedor} limitó las peticiones (429)`
        await dormir(2000 * intento)
        continue
      }

      if (!response.ok) {
        throw new Error(`${proveedor} respondió con estado ${response.status}`)
      }

      return response
    } catch (err) {
      ultimoError = err instanceof Error ? err.message : "Error de red"
      await dormir(1500 * intento)
    }
  }

  throw new Error(ultimoError)
}

function mapearEstadoTenrai(status?: string | null): string | undefined {
  switch (status) {
    case "Currently Airing":
      return "RELEASING"
    case "Finished Airing":
      return "FINISHED"
    case "Not yet aired":
      return "UPCOMING"
    default:
      return undefined
  }
}

function mapearTipoTenrai(type?: string | null): string | undefined {
  switch (type) {
    case "TV":
      return "TV"
    case "TV Short":
      return "TV_SHORT"
    case "Movie":
      return "MOVIE"
    case "OVA":
      return "OVA"
    case "ONA":
      return "ONA"
    case "Special":
      return "SPECIAL"
    case "Music":
      return "SPECIAL"
    default:
      return type ?? undefined
  }
}

function mapearTenrai(item: TenraiAnime): AnilistMedia {
  const titleEs = item.title || ""
  const añoAired = item.aired?.from ? new Date(item.aired.from).getFullYear() : undefined

  return {
    id: item.mal_id,
    fuente: "tenrai",
    idMal: item.mal_id,
    title: {
      romaji: item.title,
      english: item.title_english ?? undefined,
      native: item.title_japanese ?? undefined,
      userPreferred: titleEs,
    },
    description: item.synopsis ?? undefined,
    startDate: {
      year:
        typeof item.year === "number"
          ? item.year
          : Number.isFinite(añoAired)
            ? añoAired
            : undefined,
    },
    status: mapearEstadoTenrai(item.status),
    episodes: item.episodes ?? undefined,
    format: mapearTipoTenrai(item.type),
    genres:
      item.genres
        ?.map((g) => g.name)
        .filter((n): n is string => typeof n === "string" && n.length > 0) || [],
    averageScore: typeof item.score === "number" ? item.score * 10 : undefined,
    coverImage: {
      large:
        item.images?.jpg?.large_image_url || item.images?.webp?.large_image_url,
      medium: item.images?.jpg?.image_url || item.images?.webp?.image_url,
    },
    bannerImage: undefined,
    trailer:
      item.trailer?.youtube_id && item.trailer.youtube_id.trim().length > 0
        ? { id: item.trailer.youtube_id, site: "youtube" }
        : null,
    studios: {
      nodes:
        item.studios
          ?.map((s) => s.name)
          .filter((n): n is string => typeof n === "string" && n.length > 0)
          .map((name) => ({ name })) || [],
    },
  }
}

function mapearEstadoKitsu(status?: string | null): string | undefined {
  switch (status) {
    case "current":
      return "RELEASING"
    case "finished":
      return "FINISHED"
    case "upcoming":
      return "UPCOMING"
    case "hiatus":
      return "HIATUS"
    case "cancelled":
      return "CANCELLED"
    default:
      return undefined
  }
}

function mapearTipoKitsu(subtype?: string | null, showType?: string | null): string | undefined {
  const raw = (showType || subtype || "").toUpperCase()
  switch (raw) {
    case "TV":
      return "TV"
    case "MOVIE":
      return "MOVIE"
    case "OVA":
      return "OVA"
    case "ONA":
      return "ONA"
    case "SPECIAL":
      return "SPECIAL"
    case "MUSIC":
      return "SPECIAL"
    default:
      return raw.length > 0 ? raw : undefined
  }
}

function construirMapaGeneros(incluidos: KitsuIncluido[]): Map<string, string> {
  const mapa = new Map<string, string>()
  for (const inc of incluidos) {
    if (inc.type === "genres" && inc.id && inc.attributes?.name) {
      mapa.set(inc.id, inc.attributes.name)
    }
  }
  return mapa
}

function mapearKitsu(item: KitsuAnime, generos: Map<string, string>): AnilistMedia {
  const attrs = item.attributes
  const titleEs = attrs?.titles?.en_jp || attrs?.canonicalTitle || ""
  const rating = attrs?.averageRating ? Number(attrs.averageRating) : undefined
  const año = attrs?.startDate ? new Date(attrs.startDate).getFullYear() : undefined
  const idsGenero =
    item.relationships?.genres?.data
      ?.map((g) => g.id)
      .filter((id): id is string => typeof id === "string" && id.length > 0) || []
  const genero = idsGenero
    .map((id) => generos.get(id))
    .filter((g): g is string => typeof g === "string")

  return {
    id: Number(item.id),
    fuente: "kitsu",
    idMal: null,
    title: {
      romaji: attrs?.titles?.en_jp,
      english: attrs?.titles?.en,
      native: attrs?.titles?.ja_jp,
      userPreferred: titleEs,
    },
    description: attrs?.synopsis ?? undefined,
    startDate: {
      year: Number.isFinite(año) ? año : undefined,
    },
    status: mapearEstadoKitsu(attrs?.status),
    episodes: attrs?.episodeCount ?? undefined,
    format: mapearTipoKitsu(attrs?.subtype, attrs?.showType),
    genres: genero,
    averageScore: typeof rating === "number" && rating > 0 ? rating : undefined,
    coverImage: {
      large: attrs?.posterImage?.original,
      medium: attrs?.posterImage?.medium,
    },
    bannerImage: attrs?.coverImage?.original ?? attrs?.coverImage?.large ?? undefined,
    trailer:
      attrs?.youtubeVideoId && attrs.youtubeVideoId.trim().length > 0
        ? { id: attrs.youtubeVideoId, site: "youtube" }
        : null,
    studios: null,
  }
}

export async function fetchTenraiPage(page: number, perPage: number): Promise<AnilistMedia[]> {
  const limit = Math.min(perPage, TENRAI_MAX_LIMIT)
  const url = `${TENRAI_API_URL}/top/anime?page=${page}&limit=${limit}&sfw=true`
  const response = await pedirConReintentos(url, { Accept: "application/json" }, "Tenrai")
  const json = (await response.json()) as TenraiListaResponse
  return (json.data || []).map(mapearTenrai)
}

export async function searchTenrai(query: string, perPage: number): Promise<AnilistMedia[]> {
  const limit = Math.min(perPage, TENRAI_MAX_LIMIT)
  const url = `${TENRAI_API_URL}/anime?q=${encodeURIComponent(query)}&sfw=true&limit=${limit}`
  const response = await pedirConReintentos(url, { Accept: "application/json" }, "Tenrai")
  const json = (await response.json()) as TenraiListaResponse
  return (json.data || []).map(mapearTenrai)
}

export async function fetchKitsuPage(page: number, perPage: number): Promise<AnilistMedia[]> {
  const limit = Math.min(perPage, KITSU_MAX_LIMIT)
  const offset = (page - 1) * limit
  const url = `${KITSU_API_URL}/anime?sort=-averageRating&page[limit]=${limit}&page[offset]=${offset}&include=genres`
  const response = await pedirConReintentos(
    url,
    { Accept: "application/vnd.api+json", "Content-Type": "application/vnd.api+json" },
    "Kitsu"
  )
  const json = (await response.json()) as KitsuListaResponse
  const generos = construirMapaGeneros(json.included || [])
  return (json.data || [])
    .filter((item) => !item.attributes?.nsfw)
    .map((item) => mapearKitsu(item, generos))
}

export async function searchKitsu(query: string, perPage: number): Promise<AnilistMedia[]> {
  const limit = Math.min(perPage, KITSU_MAX_LIMIT)
  const url = `${KITSU_API_URL}/anime?filter[text]=${encodeURIComponent(query)}&page[limit]=${limit}&include=genres`
  const response = await pedirConReintentos(
    url,
    { Accept: "application/vnd.api+json", "Content-Type": "application/vnd.api+json" },
    "Kitsu"
  )
  const json = (await response.json()) as KitsuListaResponse
  const generos = construirMapaGeneros(json.included || [])
  return (json.data || [])
    .filter((item) => !item.attributes?.nsfw)
    .map((item) => mapearKitsu(item, generos))
}

export async function obtenerPaginaCatalogo(
  pagina: number,
  proveedor: ProveedorCatalogo,
  perPage: number = 50
): Promise<AnilistMedia[]> {
  if (proveedor === "tenrai") return fetchTenraiPage(pagina, perPage)
  if (proveedor === "kitsu") return fetchKitsuPage(pagina, perPage)
  return fetchCatalogPage(pagina, perPage)
}

export async function buscarAnimesConFallback(
  query: string,
  perPage: number = 20
): Promise<AnilistMedia[]> {
  try {
    return await searchAnimes(query, perPage)
  } catch (err) {
    const mensaje = err instanceof Error ? err.message : "Error desconocido"
    console.warn(`AniList falló en la búsqueda (${mensaje}); probando Tenrai...`)
  }

  try {
    return await searchTenrai(query, perPage)
  } catch (err) {
    const mensaje = err instanceof Error ? err.message : "Error desconocido"
    console.warn(`Tenrai falló en la búsqueda (${mensaje}); probando Kitsu...`)
  }

  return searchKitsu(query, perPage)
}
