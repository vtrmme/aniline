import type { Anime } from "@/types"

const ANILIST_API_URL = "https://graphql.anilist.co"

interface AnilistMedia {
  id: number
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
  duration?: number
  chapters?: number
  volumes?: number
  genres?: string[]
  tags?: Array<{ name: string }>
  synonyms?: string[]
  averageScore?: number
  popularity?: number
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

export async function fetchAnilistMedia(
  variables: Record<string, unknown>,
  query?: string
): Promise<AnilistMedia[]> {
  const graphqlQuery = `
    query ($page: Int, $perPage: Int, $search: String, $type: MediaType, $format: MediaFormat, $status: MediaStatus, $genre: String, $sort: [MediaSort]) {
      Page(page: $page, perPage: $perPage) {
        media(
          search: $search
          type: $type
          format: $format
          status: $status
          genre: $genre
          sort: $sort
        ) {
          id
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
          duration
          genres
          tags { name }
          synonyms
          averageScore
          popularity
          coverImage { large medium color }
          bannerImage
        }
      }
    }
  `

  const fetchVars: Record<string, unknown> = {
    page: variables.page || 1,
    perPage: variables.perPage || 50,
    type: "ANIME",
    sort: ["POPULARITY_DESC", "TRENDING_DESC"],
  }

  if (query && query.trim()) {
    fetchVars.search = query.trim()
  }

  const response = await fetch(ANILIST_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      query: graphqlQuery,
      variables: fetchVars,
    }),
    next: { revalidate: 3600 },
  })

  const json: AnilistResponse<AnilistMedia> = await response.json()

  if (json.errors) {
    const errorMessages = json.errors.map((e) => e.message).join(", ")
    throw new Error(`Error de AniList: ${errorMessages}`)
  }

  return json.data?.Page?.media || []
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

  const slug = generateSlug(titleEs, media.id)

  return {
    slug,
    anilist_id: media.id,
    title_es: titleEs,
    title_en: titleEn,
    sinopsis_es: sinopsisEs,
    sinopsis_en: sinopsisEn,
    poster_url,
    banner_url,
    genero,
    anio: year,
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

export async function searchAnimes(query: string, perPage: number = 20): Promise<AnilistMedia[]> {
  return fetchAnilistMedia({ perPage }, query)
}

export async function fetchAnimeById(anilistId: number): Promise<AnilistMedia | null> {
  const graphqlQuery = `
    query ($id: Int) {
      Media(id: $id, type: ANIME) {
        id
        title { romaji english native userPreferred }
        description
        startDate { year month day }
        endDate { year month day }
        season seasonYear
        type format status episodes duration
        genres tags { name }
        synonyms averageScore popularity
        coverImage { large medium color }
        bannerImage
      }
    }
  `

  const response = await fetch(ANILIST_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      query: graphqlQuery,
      variables: { id: anilistId },
    }),
    next: { revalidate: 3600 },
  })

  const json: AnilistResponse<AnilistMedia> = await response.json()

  if (json.errors) {
    return null
  }

  return json.data?.Media || null
}
