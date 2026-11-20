export interface SubtituloSubdl {
  url: string
  formato: string
  idioma: string
}

const UA_NAVEGADOR =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"

const API_AUTO = "https://api3.subdl.com/auto"
const API_V1 = "https://api.subdl.com/api/v1/subtitles"
const DL_BASE = "https://dl.subdl.com/"

const CADUCIDAD_MS = 60 * 60 * 1000

const IDIOMAS_ES = new Set([
  "es",
  "es-es",
  "es-419",
  "es-la",
  "es-mx",
  "spanish",
  "español",
  "espanol",
])

interface ResultadoAuto {
  type?: string
  name?: string
  year?: number
  link?: string
}

interface ArchivoSubdl {
  file_n_id?: string | number
  name?: string
  release_name?: string
  season?: number | string | null
  episode?: number | string | null
  language?: string
  format?: string
  url?: string
}

interface SubtituloV1 {
  name?: string
  release_name?: string
  language?: string
  format?: string
  url?: string
  full_season?: boolean
  unpack_files?: ArchivoSubdl[]
}

interface RespuestaAuto {
  results?: ResultadoAuto[]
}

interface RespuestaV1 {
  status?: boolean
  subtitles?: SubtituloV1[]
}

interface EntradaCache<T> {
  valor: T
  fecha: number
}

const cacheAuto = new Map<string, EntradaCache<string>>()
const cacheEspanol = new Map<string, EntradaCache<SubtituloSubdl | null>>()

function normalizarUrlDescarga(url: string): string {
  if (/^https?:\/\//i.test(url)) return url
  return DL_BASE + url.replace(/^\//, "")
}

function esUrlDescargaValida(url: string): boolean {
  try {
    const u = new URL(url)
    return u.hostname === "dl.subdl.com" && u.protocol === "https:"
  } catch {
    return false
  }
}

async function obtenerSdId(titulo: string): Promise<string | null> {
  const clave = titulo.trim().toLowerCase()
  if (!clave) return null

  const cache = cacheAuto.get(clave)
  if (cache && Date.now() - cache.fecha < CADUCIDAD_MS) {
    return cache.valor
  }

  try {
    const res = await fetch(
      `${API_AUTO}?query=${encodeURIComponent(titulo)}`,
      {
        headers: { "User-Agent": UA_NAVEGADOR, Accept: "application/json" },
        signal: AbortSignal.timeout(10000),
      }
    )
    if (!res.ok) return null
    const json = (await res.json()) as RespuestaAuto
    const resultados = Array.isArray(json.results) ? json.results : []
    const tv = resultados.find((r) => r.type === "tv" && typeof r.link === "string")
    const elegido = tv || resultados.find((r) => typeof r.link === "string")
    if (!elegido || !elegido.link) return null
    const m = elegido.link.match(/\/subtitle\/(sd\d+)\//)
    if (!m) return null
    cacheAuto.set(clave, { valor: m[1], fecha: Date.now() })
    return m[1]
  } catch {
    return null
  }
}

function numeroDeEpisodio(
  archivo: ArchivoSubdl,
  episodio: number
): boolean {
  const num = Number(archivo.episode)
  if (Number.isFinite(num) && num > 0) return num === episodio
  const nombre = `${archivo.name || ""} ${archivo.release_name || ""}`
  const patrones = [
    new RegExp(`\\bE(0*${episodio})\\b`, "i"),
    new RegExp(`\\.E(0*${episodio})\\.`, "i"),
    new RegExp(`\\b${episodio}x0*1\\b`),
  ]
  return patrones.some((p) => p.test(nombre))
}

function idiomaEsEspanol(idioma: string | undefined): boolean {
  if (!idioma) return false
  const limpio = idioma.trim().toLowerCase()
  if (IDIOMAS_ES.has(limpio)) return true
  return limpio.startsWith("es") && limpio.length <= 6 && /\d/.test(limpio)
}

export async function obtenerSubtituloEspanol(
  titulo: string,
  episodio: number
): Promise<SubtituloSubdl | null> {
  const apiKey = process.env.SUBDL_API_KEY
  if (!apiKey || !apiKey.trim()) return null

  const clave = `${titulo.trim().toLowerCase()}:${episodio}`
  const cache = cacheEspanol.get(clave)
  if (cache && Date.now() - cache.fecha < CADUCIDAD_MS) {
    return cache.valor
  }

  const sdId = await obtenerSdId(titulo)
  if (!sdId) return null

  const pedir = async (idiomas: string): Promise<RespuestaV1 | null> => {
    const url = new URL(API_V1)
    url.searchParams.set("api_key", apiKey.trim())
    url.searchParams.set("sd_id", sdId)
    url.searchParams.set("type", "tv")
    url.searchParams.set("languages", idiomas)
    url.searchParams.set("unpack", "1")
    url.searchParams.set("subs_per_page", "30")
    try {
      const res = await fetch(url.toString(), {
        headers: { "User-Agent": UA_NAVEGADOR, Accept: "application/json" },
        signal: AbortSignal.timeout(10000),
      })
      if (!res.ok) return null
      return (await res.json()) as RespuestaV1
    } catch {
      return null
    }
  }

  let json = await pedir("ES")
  if (!json || !Array.isArray(json.subtitles) || json.subtitles.length === 0) {
    json = await pedir("Spanish")
  }
  if (!json || !Array.isArray(json.subtitles)) return null

  let elegido: SubtituloSubdl | null = null

  for (const sub of json.subtitles) {
    const archivos = Array.isArray(sub.unpack_files) ? sub.unpack_files : []
    for (const archivo of archivos) {
      if (!idiomaEsEspanol(archivo.language)) continue
      if (!numeroDeEpisodio(archivo, episodio)) continue
      const formato = (archivo.format || "").toLowerCase()
      if (!formato.includes("srt") && !formato.includes("ass") && !formato.includes("vtt")) {
        continue
      }
      const url = archivo.url ? normalizarUrlDescarga(archivo.url) : null
      if (!url || !esUrlDescargaValida(url)) continue
      const candidato: SubtituloSubdl = {
        url,
        formato: formato.includes("ass") ? "ass" : formato.includes("vtt") ? "vtt" : "srt",
        idioma: archivo.language || "es",
      }
      if (elegido === null) {
        elegido = candidato
      } else if (elegido.formato !== "srt" && candidato.formato === "srt") {
        elegido = candidato
      }
    }
  }

  cacheEspanol.set(clave, { valor: elegido, fecha: Date.now() })
  return elegido
}