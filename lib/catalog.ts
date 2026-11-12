import { createServerClient } from "@/lib/supabase"
import {
  fetchCatalogPage,
  mapAnilistToAnime,
  computeTotalEpisodes,
  type AnilistMedia,
} from "@/lib/anilist"
import type { SupabaseClient } from "@supabase/supabase-js"

export interface SyncCatalogResult {
  insertados: number
  actualizados: number
  episodiosCreados: number
  errores: number
}

export interface SyncCatalogOptions {
  meta: number
  onProgreso?: (pagina: number, procesados: number, insertados: number) => void
}

const PER_PAGE = 50
const PAUSA_ENTRE_PAGINAS_MS = 700
const LOTE_EPISODIOS = 500

function dormir(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

interface EpisodeInsert {
  anime_id: string
  numero: number
  title_es: string
  title_en: string
  video_url: string
  orden: number
}

function buildEpisodes(animeId: string, total: number, existentes: Set<number>): EpisodeInsert[] {
  const faltantes: EpisodeInsert[] = []
  for (let i = 1; i <= total; i++) {
    if (existentes.has(i)) continue
    faltantes.push({
      anime_id: animeId,
      numero: i,
      title_es: `Episodio ${i}`,
      title_en: `Episode ${i}`,
      video_url: "",
      orden: i,
    })
  }
  return faltantes
}

async function insertarEpisodios(
  supabase: SupabaseClient,
  faltantes: EpisodeInsert[]
): Promise<number> {
  for (let i = 0; i < faltantes.length; i += LOTE_EPISODIOS) {
    const lote = faltantes.slice(i, i + LOTE_EPISODIOS)
    const { error } = await supabase.from("episodes").insert(lote)
    if (error) {
      throw new Error(`Error insertando episodios: ${error.message}`)
    }
  }
  return faltantes.length
}

async function procesarMedia(
  supabase: SupabaseClient,
  media: AnilistMedia,
  resultado: SyncCatalogResult
): Promise<void> {
  const animeData = mapAnilistToAnime(media)

  const { data: existente, error: errorBusqueda } = await supabase
    .from("animes")
    .select("id, title_es, title_en, sinopsis_es, sinopsis_en")
    .eq("anilist_id", media.id)
    .maybeSingle()

  if (errorBusqueda) {
    throw new Error(errorBusqueda.message)
  }

  let animeId: string

  if (existente) {
    // No pisar textos ya traducidos (p. ej. enriquecidos por TMDB)
    const tituloSinTraducir =
      !existente.title_es || existente.title_es === existente.title_en
    const sinopsisSinTraducir =
      !existente.sinopsis_es || existente.sinopsis_es === existente.sinopsis_en

    const { error } = await supabase
      .from("animes")
      .update({
        title_es: tituloSinTraducir ? animeData.title_es : existente.title_es,
        sinopsis_es: sinopsisSinTraducir ? animeData.sinopsis_es : existente.sinopsis_es,
        title_en: animeData.title_en,
        sinopsis_en: animeData.sinopsis_en,
        poster_url: animeData.poster_url,
        banner_url: animeData.banner_url,
        genero: animeData.genero,
        anio: animeData.anio,
        estado: animeData.estado,
        tipo: animeData.tipo,
        estudio: animeData.estudio,
        puntuacion: animeData.puntuacion,
        mal_id: animeData.mal_id,
        trailer_url: animeData.trailer_url,
      })
      .eq("id", existente.id)

    if (error) {
      throw new Error(error.message)
    }

    resultado.actualizados++
    animeId = existente.id
  } else {
    const { data, error } = await supabase
      .from("animes")
      .insert(animeData)
      .select("id")
      .single()

    if (error) {
      throw new Error(error.message)
    }

    resultado.insertados++
    animeId = data.id
  }

  // Episodios: añadir solo los que falten (nunca borra video_url)
  const { data: epsData, error: epsError } = await supabase
    .from("episodes")
    .select("numero")
    .eq("anime_id", animeId)

  if (epsError) {
    throw new Error(epsError.message)
  }

  const existentes = new Set<number>(
    (epsData || []).map((e: { numero: number }) => e.numero)
  )
  const maximoExistente = existentes.size > 0 ? Math.max(...existentes) : 0
  const total = computeTotalEpisodes(media, maximoExistente)

  if (total > 0) {
    const faltantes = buildEpisodes(animeId, total, existentes)
    if (faltantes.length > 0) {
      resultado.episodiosCreados += await insertarEpisodios(supabase, faltantes)
    }
  }

  await supabase
    .from("animes")
    .update({ episodios_count: total })
    .eq("id", animeId)
}

export async function syncCatalog(
  opciones: SyncCatalogOptions
): Promise<SyncCatalogResult> {
  const supabase = createServerClient()
  const resultado: SyncCatalogResult = {
    insertados: 0,
    actualizados: 0,
    episodiosCreados: 0,
    errores: 0,
  }

  let procesados = 0
  let pagina = 1
  let paginasVacias = 0

  while (procesados < opciones.meta && paginasVacias < 2) {
    let items: AnilistMedia[]
    try {
      items = await fetchCatalogPage(pagina, PER_PAGE)
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error desconocido"
      console.error(`Error en página ${pagina}: ${message}`)
      resultado.errores++
      break
    }

    if (items.length === 0) {
      paginasVacias++
      pagina++
      continue
    }
    paginasVacias = 0

    for (const media of items) {
      if (procesados >= opciones.meta) break
      try {
        await procesarMedia(supabase, media, resultado)
      } catch (err) {
        const message = err instanceof Error ? err.message : "Error desconocido"
        console.error(`Error procesando anime ${media.id}: ${message}`)
        resultado.errores++
      }
      procesados++
    }

    opciones.onProgreso?.(pagina, procesados, resultado.insertados)
    pagina++
    await dormir(PAUSA_ENTRE_PAGINAS_MS)
  }

  return resultado
}
