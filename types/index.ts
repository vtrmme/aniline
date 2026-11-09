export interface Anime {
  id: string
  slug: string
  title_es: string
  title_en?: string
  sinopsis_es?: string
  sinopsis_en?: string
  poster_url?: string
  banner_url?: string
  genero?: string[]
  anio?: number
  estado?: string
}

export interface Episode {
  id: string
  anime_id: string
  numero: number
  title_es?: string
  title_en?: string
  video_url?: string | null
  youtube_url?: string | null
  orden?: number
}

export interface WatchlistItem {
  id: string
  user_id: string
  anime_id: string
  estado: "para_ver" | "viendo" | "visto"
  created_at: string
}
