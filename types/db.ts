export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      animes: {
        Row: {
          id: string;
          slug: string;
          anilist_id: number | null;
          mal_id: number | null;
          title_es: string | null;
          title_en: string | null;
          sinopsis_es: string | null;
          sinopsis_en: string | null;
          poster_url: string | null;
          banner_url: string | null;
          genero: string[] | null;
          anio: number | null;
          estado: string | null;
          tipo: string | null;
          estudio: string | null;
          puntuacion: number | null;
          puntuacion_mal: number | null;
          episodios_count: number | null;
          trailer_url: string | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          slug: string;
          anilist_id?: number | null;
          mal_id?: number | null;
          title_es?: string | null;
          title_en?: string | null;
          sinopsis_es?: string | null;
          sinopsis_en?: string | null;
          poster_url?: string | null;
          banner_url?: string | null;
          genero?: string[] | null;
          anio?: number | null;
          estado?: string | null;
          tipo?: string | null;
          estudio?: string | null;
          puntuacion?: number | null;
          puntuacion_mal?: number | null;
          episodios_count?: number | null;
          trailer_url?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["animes"]["Insert"]>;
        Relationships: [];
      };
      episodes: {
        Row: {
          id: string;
          anime_id: string;
          numero: number;
          title_es: string | null;
          title_en: string | null;
          sinopsis_es: string | null;
          sinopsis_en: string | null;
          video_url: string | null;
          youtube_url: string | null;
          orden: number | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          anime_id: string;
          numero: number;
          title_es?: string | null;
          title_en?: string | null;
          sinopsis_es?: string | null;
          sinopsis_en?: string | null;
          video_url?: string | null;
          youtube_url?: string | null;
          orden?: number | null;
          created_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["episodes"]["Insert"]>;
        Relationships: [];
      };
      profiles: {
        Row: {
          user_id: string;
          email: string | null;
          name: string | null;
          image: string | null;
          provider: string | null;
          username: string | null;
          avatar_url: string | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          user_id: string;
          email?: string | null;
          name?: string | null;
          image?: string | null;
          provider?: string | null;
          username?: string | null;
          avatar_url?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
        Relationships: [];
      };
      watchlists: {
        Row: {
          id: string;
          user_id: string;
          anime_id: string;
          estado: string;
          progreso: number | null;
          puntuacion: number | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          anime_id: string;
          estado: string;
          progreso?: number | null;
          puntuacion?: number | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["watchlists"]["Insert"]>;
        Relationships: [];
      };
      historial: {
        Row: {
          id: string;
          user_id: string;
          anime_id: string;
          episodio_numero: number;
          segundos: number | null;
          visto_en: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          anime_id: string;
          episodio_numero: number;
          segundos?: number | null;
          visto_en?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["historial"]["Insert"]>;
        Relationships: [];
      };
      sesiones: {
        Row: {
          id: string;
          user_id: string;
          anime_id: string;
          episodio_numero: number;
          started_at: string | null;
          ended_at: string | null;
          last_seen_at: string | null;
          segundos_visto: number | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          anime_id: string;
          episodio_numero: number;
          started_at?: string | null;
          ended_at?: string | null;
          last_seen_at?: string | null;
          segundos_visto?: number | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["sesiones"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

export type AnimeRow = Database["public"]["Tables"]["animes"]["Row"];
export type EpisodeRow = Database["public"]["Tables"]["episodes"]["Row"];
export type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
export type WatchlistRow = Database["public"]["Tables"]["watchlists"]["Row"];
export type HistorialRow = Database["public"]["Tables"]["historial"]["Row"];
export type SesionRow = Database["public"]["Tables"]["sesiones"]["Row"];
