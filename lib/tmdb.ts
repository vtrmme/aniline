const TMDB_API_URL = "https://api.themoviedb.org/3"

interface TmdbResult {
  id: number
  name?: string
  title?: string
  original_name?: string
  original_title?: string
  overview?: string
  first_air_date?: string
  release_date?: string
}

interface TmdbSearchResponse {
  results?: TmdbResult[]
}

export interface TraduccionEspanol {
  title_es: string
  sinopsis_es?: string
}

function dormir(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "")
}

function bigrams(texto: string): Set<string> {
  const set = new Set<string>()
  for (let i = 0; i < texto.length - 1; i++) {
    set.add(texto.slice(i, i + 2))
  }
  return set
}

function similitud(a: string, b: string): number {
  const na = normalizar(a)
  const nb = normalizar(b)
  if (!na || !nb) return 0
  if (na === nb) return 1
  const ba = bigrams(na)
  const bb = bigrams(nb)
  if (ba.size === 0 || bb.size === 0) return 0
  let comunes = 0
  for (const g of ba) {
    if (bb.has(g)) comunes++
  }
  return (2 * comunes) / (ba.size + bb.size)
}

function extraerAnio(fecha?: string): number | null {
  if (!fecha) return null
  const anio = Number(fecha.slice(0, 4))
  return Number.isInteger(anio) ? anio : null
}

function esFormatoPelicula(formato?: string): boolean {
  return formato === "MOVIE"
}

async function buscarEnTmdb(
  tipo: "tv" | "movie",
  query: string,
  anio: number | null
): Promise<TmdbResult[]> {
  const apiKey = process.env.TMDB_API_KEY
  if (!apiKey || !apiKey.trim()) {
    throw new Error("TMDB_API_KEY no está definida")
  }

  const url = new URL(`${TMDB_API_URL}/search/${tipo}`)
  url.searchParams.set("api_key", apiKey.trim())
  url.searchParams.set("language", "es-ES")
  url.searchParams.set("query", query)
  url.searchParams.set("include_adult", "false")
  if (anio) {
    url.searchParams.set(tipo === "tv" ? "first_air_date_year" : "year", String(anio))
  }

  const response = await fetch(url.toString(), { signal: AbortSignal.timeout(8000) })
  if (!response.ok) {
    if (response.status === 429) {
      await dormir(2000)
      return []
    }
    return []
  }

  const json = (await response.json()) as TmdbSearchResponse
  return json.results || []
}

const UMBRAL_SIMILITUD = 0.85
const MARGEN_ANIO = 1

export async function buscarEnEspanol(
  titulosCandidatos: string[],
  anio: number | null,
  formato?: string
): Promise<TraduccionEspanol | null> {
  const tipo: "tv" | "movie" = esFormatoPelicula(formato) ? "movie" : "tv"

  for (const candidato of titulosCandidatos) {
    if (!candidato || !candidato.trim()) continue

    const resultados = await buscarEnTmdb(tipo, candidato, anio)
    await dormir(200)

    let mejor: { resultado: TmdbResult; puntaje: number } | null = null

    for (const resultado of resultados) {
      const nombreEs = resultado.name || resultado.title || ""
      const nombreOriginal = resultado.original_name || resultado.original_title || ""

      const sim = Math.max(
        similitud(candidato, nombreEs),
        similitud(candidato, nombreOriginal)
      )

      const anioTmdb = extraerAnio(
        tipo === "tv" ? resultado.first_air_date : resultado.release_date
      )
      const anioOk =
        anio === null ||
        anioTmdb === null ||
        Math.abs(anioTmdb - anio) <= MARGEN_ANIO

      if (sim >= UMBRAL_SIMILITUD && anioOk && (!mejor || sim > mejor.puntaje)) {
        mejor = { resultado, puntaje: sim }
      }
    }

    if (mejor && mejor.resultado) {
      const titleEs = (mejor.resultado.name || mejor.resultado.title || "").trim()
      const sinopsis = (mejor.resultado.overview || "").trim()

      if (titleEs) {
        return {
          title_es: titleEs,
          sinopsis_es: sinopsis.length > 0 ? sinopsis : undefined,
        }
      }
    }
  }

  return null
}
