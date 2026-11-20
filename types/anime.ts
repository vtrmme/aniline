export interface Anime {
  id?: string;
  slug: string;
  anilist_id?: number | null;
  mal_id?: number | null;
  title_es?: string;
  title_en?: string;
  sinopsis_es?: string;
  sinopsis_en?: string;
  poster_url?: string;
  banner_url?: string;
  genero?: string[];
  anio?: number;
  estado?: string;
  tipo?: string;
  estudio?: string;
  puntuacion?: number;
  episodios_count?: number;
  trailer_url?: string;
}