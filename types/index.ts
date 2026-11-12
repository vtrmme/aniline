export interface Anime {
  id: string
  slug: string
  anilist_id?: number | null
  title_es: string
  title_en?: string
  sinopsis_es?: string
  sinopsis_en?: string
  descripcion?: string
  poster_url?: string
  banner_url?: string
  genero?: string[]
  anio?: number
  estado?: string
  tipo?: string
  estudio?: string
  puntuacion?: number
  episodios_count?: number
  trailer_url?: string
  created_at?: string
  updated_at?: string
}

export interface Episode {
  id: string
  anime_id: string
  numero: number
  title_es?: string
  title_en?: string
  sinopsis_es?: string
  sinopsis_en?: string
  video_url?: string | null
  youtube_url?: string | null
  orden?: number
}

export interface WatchlistItem {
  id: string
  user_id: string
  anime_id: string
  estado: "para_ver" | "viendo" | "visto"
  progreso?: number
  puntuacion?: number
  created_at: string
  updated_at?: string
  animes?: Anime
}

export interface HistorialItem {
  id: string
  user_id: string
  anime_id: string
  episodio_numero: number
  segundos?: number
  visto_en: string
  animes?: Anime
}

export interface PerfilStats {
  animes_vistos: number
  animes_viendo: number
  animes_para_ver: number
  minutos_vistos: number
  genero_favorito: string
}
