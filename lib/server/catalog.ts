import { cache } from "react";
import { unstable_cache } from "next/cache";
import { createAdminSupabaseClient } from "@/lib/server/supabase";
import type { AnimeRow, EpisodeRow } from "@/types/db";

export type SortOrder = "recientes" | "puntuacion";

export interface CatalogFilters {
  q?: string;
  genero?: string;
  anio?: string;
  estado?: string;
  orden?: SortOrder;
  page?: number;
  perPage?: number;
}

export interface PagedResult<T> {
  items: T[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
}

export interface CatalogFacets {
  generos: string[];
  anios: number[];
  estados: string[];
}

export interface LatestEpisodeItem {
  numero: number;
  anime: Pick<AnimeRow, "id" | "slug" | "title_es" | "title_en" | "poster_url" | "banner_url">;
}

const DEFAULT_PER_PAGE = 24;

function sanitizeSearch(text: string): string {
  return text.trim().replace(/[(),.%]/g, " ").replace(/\s+/g, " ").slice(0, 80);
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function applyFilters(qb: any, filters: CatalogFilters): any {
  const q = filters.q ? sanitizeSearch(filters.q) : "";
  if (q) {
    qb = qb.or(`title_es.ilike.%${q}%,title_en.ilike.%${q}%`);
  }
  if (filters.genero && filters.genero !== "todos") {
    qb = qb.contains("genero", [filters.genero]);
  }
  if (filters.anio && filters.anio !== "todos") {
    const anio = Number(filters.anio);
    if (Number.isFinite(anio)) qb = qb.eq("anio", anio);
  }
  if (filters.estado && filters.estado !== "todos") {
    qb = qb.eq("estado", filters.estado);
  }
  if (filters.orden === "puntuacion") {
    qb = qb.order("puntuacion", { ascending: false, nullsFirst: false }).order("created_at", { ascending: false });
  } else {
    qb = qb.order("created_at", { ascending: false, nullsFirst: false });
  }
  return qb;
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export async function listAnimes(filters: CatalogFilters = {}): Promise<PagedResult<AnimeRow>> {
  const page = Math.max(1, filters.page || 1);
  const perPage = Math.min(48, Math.max(1, filters.perPage || DEFAULT_PER_PAGE));
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;

  const supabase = createAdminSupabaseClient();
  let qb = supabase.from("animes").select("*", { count: "exact" });
  qb = applyFilters(qb, filters);

  const { data, count, error } = await qb.range(from, to);
  if (error) {
    console.error("listAnimes error:", error.message);
    return { items: [], total: 0, page, perPage, totalPages: 1 };
  }

  const total = count || 0;
  return {
    items: (data || []) as AnimeRow[],
    total,
    page,
    perPage,
    totalPages: Math.max(1, Math.ceil(total / perPage)),
  };
}

export const getCatalogFacets = unstable_cache(
  async (): Promise<CatalogFacets> => {
    const supabase = createAdminSupabaseClient();
    const generos = new Set<string>();
    const anios = new Set<number>();
    const estados = new Set<string>();
    const pageSize = 1000;
    let from = 0;
    for (;;) {
      const { data, error } = await supabase
        .from("animes")
        .select("genero, anio, estado")
        .range(from, from + pageSize - 1);
      if (error || !data || data.length === 0) break;
      for (const row of data) {
        if (Array.isArray(row.genero)) for (const g of row.genero) if (g) generos.add(g);
        if (typeof row.anio === "number") anios.add(row.anio);
        if (row.estado) estados.add(row.estado);
      }
      if (data.length < pageSize) break;
      from += pageSize;
    }
    return {
      generos: Array.from(generos).sort((a, b) => a.localeCompare(b)),
      anios: Array.from(anios).sort((a, b) => b - a),
      estados: Array.from(estados).sort((a, b) => a.localeCompare(b)),
    };
  },
  ["catalog-facets"],
  { revalidate: 300 },
);

export const getFeaturedAnime = unstable_cache(
  async (): Promise<AnimeRow | null> => {
    const supabase = createAdminSupabaseClient();
    const { data } = await supabase
      .from("animes")
      .select("*")
      .not("banner_url", "is", null)
      .neq("banner_url", "")
      .order("puntuacion", { ascending: false, nullsFirst: false })
      .limit(1);
    if (data && data.length > 0) return data[0] as AnimeRow;
    const { data: fallback } = await supabase
      .from("animes")
      .select("*")
      .not("poster_url", "is", null)
      .order("puntuacion", { ascending: false, nullsFirst: false })
      .limit(1);
    return fallback && fallback.length > 0 ? (fallback[0] as AnimeRow) : null;
  },
  ["featured-anime"],
  { revalidate: 600 },
);

export async function getAnimeRow(opts: {
  genero?: string;
  estado?: string;
  orden?: SortOrder;
  limit?: number;
}): Promise<AnimeRow[]> {
  const supabase = createAdminSupabaseClient();
  let qb = supabase.from("animes").select("*");
  if (opts.estado) qb = qb.eq("estado", opts.estado);
  if (opts.genero) qb = qb.contains("genero", [opts.genero]);
  if (opts.orden === "puntuacion") {
    qb = qb.order("puntuacion", { ascending: false, nullsFirst: false });
  } else {
    qb = qb.order("created_at", { ascending: false });
  }
  qb = qb.limit(opts.limit || 18);
  const { data, error } = await qb;
  if (error) return [];
  return (data || []) as AnimeRow[];
}

export const getLatestEpisodes = unstable_cache(
  async (limit = 12): Promise<LatestEpisodeItem[]> => {
    const supabase = createAdminSupabaseClient();
    const { data, error } = await supabase
      .from("episodes")
      .select("numero, anime_id, created_at, animes(id, slug, title_es, title_en, poster_url, banner_url)")
      .order("created_at", { ascending: false })
      .order("numero", { ascending: false })
      .limit(200);
    if (error || !data) return [];
    const vistos = new Set<string>();
    const out: LatestEpisodeItem[] = [];
    for (const ep of data as Array<{ numero: number; animes: LatestEpisodeItem["anime"] | LatestEpisodeItem["anime"][] | null }>) {
      const anime = Array.isArray(ep.animes) ? ep.animes[0] : ep.animes;
      if (!anime || !anime.slug) continue;
      if (vistos.has(anime.slug)) continue;
      vistos.add(anime.slug);
      out.push({ numero: ep.numero, anime });
      if (out.length >= limit) break;
    }
    return out;
  },
  ["latest-episodes"],
  { revalidate: 120 },
);

export const getAnimeBySlug = cache(async (slug: string): Promise<(AnimeRow & { episodes: EpisodeRow[] }) | null> => {
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from("animes")
    .select("*, episodes(*)")
    .eq("slug", slug)
    .single();
  if (error || !data) return null;
  const row = data as AnimeRow & { episodes: EpisodeRow[] };
  row.episodes = (row.episodes || []).sort((a, b) => (a.orden ?? a.numero) - (b.orden ?? b.numero));
  return row;
});

export async function getSimilarAnimes(anime: AnimeRow, limit = 12): Promise<AnimeRow[]> {
  const genero = anime.genero?.[0];
  if (!genero) return [];
  const supabase = createAdminSupabaseClient();
  const { data } = await supabase
    .from("animes")
    .select("*")
    .contains("genero", [genero])
    .neq("id", anime.id)
    .order("puntuacion", { ascending: false, nullsFirst: false })
    .limit(limit);
  return (data || []) as AnimeRow[];
}

export async function getContinueWatching(userId: string, limit = 12): Promise<Array<{ anime: AnimeRow; episodio_numero: number }>> {
  const supabase = createAdminSupabaseClient();
  const { data: historial, error } = await supabase
    .from("historial")
    .select("anime_id, episodio_numero, visto_en")
    .eq("user_id", userId)
    .order("visto_en", { ascending: false })
    .limit(100);
  if (error || !historial || historial.length === 0) return [];

  const vistos = new Set<string>();
  const picks: Array<{ anime_id: string; episodio_numero: number }> = [];
  for (const h of historial) {
    if (!h.anime_id || vistos.has(h.anime_id)) continue;
    vistos.add(h.anime_id);
    picks.push({ anime_id: h.anime_id, episodio_numero: h.episodio_numero });
    if (picks.length >= limit) break;
  }
  if (picks.length === 0) return [];

  const ids = picks.map((p) => p.anime_id);
  const { data: animes } = await supabase.from("animes").select("*").in("id", ids);
  const byId = new Map<string, AnimeRow>();
  for (const a of (animes || []) as AnimeRow[]) byId.set(a.id, a);

  const out: Array<{ anime: AnimeRow; episodio_numero: number }> = [];
  for (const p of picks) {
    const anime = byId.get(p.anime_id);
    if (anime) out.push({ anime, episodio_numero: p.episodio_numero });
  }
  return out;
}

export function animeTitle(anime: Pick<AnimeRow, "title_es" | "title_en">, lang: "es" | "en"): string {
  if (lang === "es") return anime.title_es || anime.title_en || "Sin título";
  return anime.title_en || anime.title_es || "Untitled";
}