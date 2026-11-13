import type { Anime } from "@/types"

const ANILIST_API_URL = "https://graphql.anilist.co"

export type FuenteMedia = "anilist" | "tenrai" | "kitsu"

export interface AnilistMedia {
  id: number
  fuente?: FuenteMedia
  idMal?: number | null
  title: {
    romaji?: string
    english?: string
    native?: string
    userPreferred?: string
  }
  description?: string
  startDate?: { year?: number; month?: number; day?: number }
  endDate?: { year?: number; month?: number; day?: number }
  season?: string
  seasonYear?: number
  type?: string
  format?: string
  status?: string
  episodes?: number
  nextAiringEpisode?: { episode?: number; airingAt?: number } | null
  duration?: number
  chapters?: number
  volumes?: number
  genres?: string[]
  tags?: Array<{ name: string }>
  synonyms?: string[]
  averageScore?: number
  popularity?: number
  trailer?: { id?: string; site?: string } | null
  studios?: { nodes?: Array<{ name?: string }> } | null
  coverImage?: {
    large?: string
    medium?: string
    color?: string
  }
  bannerImage?: string
}

interface AnilistResponse<T> {
  data?: { Page?: { media?: T[] }; Media?: T | null }
  errors?: Array<{ message: string }>
}

const MEDIA_FIELDS = `
          id
          idMal
          title {
            romaji
            english
            native
            userPreferred
          }
          description
          startDate { year month day }
          endDate { year month day }
          season
          seasonYear
          type
          format
          status
          episodes
          nextAiringEpisode { episode airingAt }
          duration
          genres
          tags { name }
          synonyms
          averageScore
          popularity
          trailer { id site }
          studios(isMain: true) { nodes { name } }
          coverImage { large medium color }
          bannerImage
`

function dormir(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function postAnilist(
  query: string,
  variables: Record<string, unknown>
): Promise<AnilistResponse<AnilistMedia>> {
  let ultimoError = "Error desconocido de AniList"

  for (let intento = 1; intento <= 4; intento++) {
    const response = await fetch(ANILIST_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ query, variables }),
      next: { revalidate: 3600 },
    })

    if (response.status === 429) {
      const esperaMs = 2000 * intento
      ultimoError = "AniList limitó las peticiones (429)"
      await dormir(esperaMs)
      continue
    }

    if (!response.ok) {
      ultimoError = `AniList respondió con estado ${response.status}`
      await dormir(1500 * intento)
      continue
    }

    return (await response.json()) as AnilistResponse<AnilistMedia>
  }

  throw new Error(ultimoError)
}

export async function fetchAnilistMedia(
  variables: Record<string, unknown>,
  query?: string
): Promise<AnilistMedia[]> {
  const graphqlQuery = `
    query ($page: Int, $perPage: Int, $search: String, $type: MediaType, $format: MediaFormat, $status: MediaStatus, $genre: String, $sort: [MediaSort], $status_in: [MediaStatus], $format_in: [MediaFormat]) {
      Page(page: $page, perPage: $perPage) {
        media(
          search: $search
          type: $type
          format: $format
          status: $status
          genre: $genre
          sort: $sort
          status_in: $status_in
          format_in: $format_in
        ) {
${MEDIA_FIELDS}
        }
      }
    }
  `

  const hayBusqueda = !!query && query.trim().length > 0

  const fetchVars: Record<string, unknown> = {
    page: variables.page || 1,
    perPage: variables.perPage || 50,
    type: "ANIME",
    sort: hayBusqueda ? null : (variables.sort as string[] | undefined) || ["POPULARITY_DESC"],
  }

  if (hayBusqueda) {
    fetchVars.search = query!.trim()
  }
  if (variables.statusIn) {
    fetchVars.status_in = variables.statusIn
  }
  if (variables.formatIn) {
    fetchVars.format_in = variables.formatIn
  }

  const json = await postAnilist(graphqlQuery, fetchVars)

  if (json.errors) {
    const errorMessages = json.errors.map((e) => e.message).join(", ")
    throw new Error(`Error de AniList: ${errorMessages}`)
  }

  return json.data?.Page?.media || []
}

function mapEstado(status?: string): string | undefined {
  switch (status) {
    case "RELEASING":
      return "en emisión"
    case "FINISHED":
      return "emitido"
    case "CANCELLED":
      return "cancelado"
    case "HIATUS":
      return "hiatus"
    case "UPCOMING":
      return "próximamente"
    default:
      return undefined
  }
}

export function mapAnilistToAnime(media: AnilistMedia): Omit<Anime, "id"> {
  const titleEn = media.title.english || media.title.romaji || media.title.native || ""
  const titleEs = media.title.userPreferred || titleEn

  const year = media.startDate?.year || media.seasonYear
  const genero = media.genres?.filter((g): g is string => typeof g === "string") || []
  const poster_url = media.coverImage?.large || media.coverImage?.medium
  const banner_url = media.bannerImage

  const sinopsisEn = media.description ? stripHtml(media.description) : undefined
  const sinopsisEs = sinopsisEn

  const esFuenteAlternativa = media.fuente === "tenrai" || media.fuente === "kitsu"
  const slug = generateSlug(titleEs, media.id)
  const puntuacion =
    typeof media.averageScore === "number" && media.averageScore > 0
      ? Math.round(media.averageScore) / 10
      : undefined
  const estudio = media.studios?.nodes?.[0]?.name
  const trailer_url =
    media.trailer?.site === "youtube" && media.trailer.id
      ? `https://www.youtube.com/watch?v=${media.trailer.id}`
      : undefined
  const episodios_count = computeTotalEpisodes(media)

  return {
    slug,
    anilist_id: esFuenteAlternativa ? null : media.id,
    mal_id: typeof media.idMal === "number" ? media.idMal : null,
    title_es: titleEs,
    title_en: titleEn,
    sinopsis_es: sinopsisEs,
    sinopsis_en: sinopsisEn,
    poster_url,
    banner_url,
    genero,
    anio: year,
    estado: mapEstado(media.status),
    tipo: media.format,
    estudio,
    puntuacion,
    episodios_count,
    trailer_url,
  }
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim()
}

function generateSlug(title: string, id: number): string {
  return `${id}-${title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100)}`
}

export async function fetchPopularAnimes(perPage: number = 24): Promise<AnilistMedia[]> {
  return fetchAnilistMedia({ perPage })
}

export function computeTotalEpisodes(
  media: Pick<AnilistMedia, "episodes" | "nextAiringEpisode" | "status">,
  existingCount: number = 0
): number {
  const declarado = typeof media.episodes === "number" && media.episodes > 0 ? media.episodes : 0
  const alAire = media.nextAiringEpisode?.episode
  const emitidos = typeof alAire === "number" && alAire > 1 ? alAire - 1 : 0

  const total = Math.max(declarado, emitidos, existingCount)
  if (total > 0) return total
  // Animes por estrenar: aún no tienen episodios (no inventar 12)
  if (media.status === "UPCOMING") return 0
  return 12
}

export const CATALOG_FORMATS = ["TV", "TV_SHORT", "MOVIE", "SPECIAL", "OVA", "ONA"]
export const CATALOG_STATUSES = ["RELEASING", "FINISHED", "CANCELLED", "HIATUS"]

export async function fetchCatalogPage(
  page: number,
  perPage: number = 50
): Promise<AnilistMedia[]> {
  return fetchAnilistMedia({
    page,
    perPage,
    statusIn: CATALOG_STATUSES,
    formatIn: CATALOG_FORMATS,
    sort: ["POPULARITY_DESC"],
  })
}

export async function searchAnimes(query: string, perPage: number = 20): Promise<AnilistMedia[]> {
  return fetchAnilistMedia({ perPage }, query)
}

export async function fetchAnimeById(anilistId: number): Promise<AnilistMedia | null> {
  const graphqlQuery = `
    query ($id: Int) {
      Media(id: $id, type: ANIME) {
        id
        idMal
        title { romaji english native userPreferred }
        description
        startDate { year month day }
        endDate { year month day }
        season seasonYear
        type format status episodes
        nextAiringEpisode { episode airingAt }
        duration
        genres tags { name }
        synonyms averageScore popularity
        trailer { id site }
        studios(isMain: true) { nodes { name } }
        coverImage { large medium color }
        bannerImage
      }
    }
  `

  const json = await postAnilist(graphqlQuery, { id: anilistId })

  if (json.errors) {
    return null
  }

  return json.data?.Media || null
}
