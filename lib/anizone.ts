export interface SubtituloAniZone {
  titulo: string
  formato: string
  idioma: string
  archivo: string
}

export interface StreamAniZone {
  m3u8: string
  subtitulos: SubtituloAniZone[]
}

const BASE = "https://anizone.to"
const PROXY_LECTURA = "https://r.jina.ai/"

interface EntradaCache<T> {
  valor: T
  fecha: number
}

const CADUCIDAD_SLUG_MS = 6 * 60 * 60 * 1000
const CADUCIDAD_STREAM_MS = 10 * 60 * 1000

const cacheSlugs = new Map<string, EntradaCache<string>>()
const cacheStreams = new Map<string, EntradaCache<StreamAniZone>>()

export interface ResultadoSlug {
  slug: string | null
  estado: number | null
}

function decodificarEscapesJs(cadena: string): string {
  let intento: string | null = null
  try {
    intento = JSON.parse(`"${cadena.replace(/"/g, '\\"')}"`) as string
  } catch {
    intento = null
  }
  if (intento) return intento
  return cadena
    .replace(/\\u([0-9a-fA-F]{4})/g, (_m, hex: string) =>
      String.fromCharCode(parseInt(hex, 16))
    )
    .replace(/\\(["'\\/])/g, "$1")
}

function extraerCuerpoJs(html: string, aguja: string): string | null {
  const indice = html.indexOf(aguja)
  if (indice < 0) return null
  const inicio = indice + aguja.length
  for (let j = inicio; j < html.length; j++) {
    if (html[j] === "\\") {
      j++
      continue
    }
    if (html[j] === "'") {
      return html.slice(inicio, j)
    }
  }
  return null
}

function itemsDeBusqueda(html: string): Array<{ slug: string; url: string }> {
  const crudo = extraerCuerpoJs(html, "items: JSON.parse('")
  if (!crudo) return []
  const decodificado = decodificarEscapesJs(crudo)
  try {
    const datos = JSON.parse(decodificado) as unknown
    if (!Array.isArray(datos)) return []
    return datos as Array<{ slug: string; url: string }>
  } catch {
    return []
  }
}

async function fetchHtmlAniZone(
  ruta: string,
  sinCache: boolean
): Promise<{ estado: number | null; html: string | null }> {
  const cabeceras: Record<string, string> = {
    "x-return-format": "html",
    Accept: "text/plain",
  }
  if (sinCache) {
    cabeceras["x-no-cache"] = "true"
  }
  const claveJina = process.env.JINA_API_KEY
  if (claveJina) {
    cabeceras.Authorization = `Bearer ${claveJina}`
  }

  try {
    const res = await fetch(`${PROXY_LECTURA}${BASE}${ruta}`, {
      headers: cabeceras,
      signal: AbortSignal.timeout(20000),
    })
    if (!res.ok) {
      return { estado: res.status, html: null }
    }
    return { estado: 200, html: await res.text() }
  } catch {
    return { estado: null, html: null }
  }
}

export async function obtenerSlugAniZone(titulo: string): Promise<ResultadoSlug> {
  const clave = titulo.trim().toLowerCase()
  if (!clave) return { slug: null, estado: null }

  const cache = cacheSlugs.get(clave)
  if (cache && Date.now() - cache.fecha < CADUCIDAD_SLUG_MS) {
    return { slug: cache.valor, estado: 200 }
  }

  const ruta = `/anime?search=${encodeURIComponent(titulo)}`
  const { estado, html } = await fetchHtmlAniZone(ruta, false)
  if (!html) return { slug: null, estado }

  const items = itemsDeBusqueda(html)
  const primero = items[0]
  if (!primero || !primero.slug) return { slug: null, estado }

  cacheSlugs.set(clave, { valor: primero.slug, fecha: Date.now() })
  return { slug: primero.slug, estado }
}

interface ConfigVidstack {
  src?: string
  subtitles?: Array<{
    title?: string
    format?: string
    language?: string
    default?: boolean
    file?: string
  }>
}

export async function obtenerStreamAniZone(
  slug: string,
  episodio: number
): Promise<StreamAniZone | null> {
  const clave = `${slug}:${episodio}`
  const cache = cacheStreams.get(clave)
  if (cache && Date.now() - cache.fecha < CADUCIDAD_STREAM_MS) {
    return cache.valor
  }

  const { html } = await fetchHtmlAniZone(
    `/anime/${encodeURIComponent(slug)}/${episodio}`,
    true
  )
  if (!html) return null

  const crudo = extraerCuerpoJs(html, "vidstackPlayer(JSON.parse('")
  if (!crudo) return null
  let config: ConfigVidstack
  try {
    config = JSON.parse(decodificarEscapesJs(crudo)) as ConfigVidstack
  } catch {
    return null
  }
  if (!config.src || !config.src.includes(".m3u8")) return null

  const subtitulos: SubtituloAniZone[] = (config.subtitles || [])
    .filter((s) => typeof s.file === "string" && s.file.length > 0)
    .map((s) => ({
      titulo: s.title || "Subtítulos",
      formato: (s.format || "srt").toLowerCase(),
      idioma: (s.language || "en").toLowerCase(),
      archivo: s.file as string,
    }))

  const valor: StreamAniZone = { m3u8: config.src, subtitulos }
  cacheStreams.set(clave, { valor, fecha: Date.now() })
  return valor
}