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

const CABECERAS_NAVEGADOR: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "es-ES,es;q=0.9,en;q=0.8",
  "Sec-Fetch-Dest": "document",
  "Sec-Fetch-Mode": "navigate",
  "Sec-Fetch-Site": "none",
  "Sec-Fetch-User": "?1",
  "Upgrade-Insecure-Requests": "1",
}

const BASE = "https://anizone.to"

interface EntradaCache<T> {
  valor: T
  fecha: number
}

const CADUCIDAD_SLUG_MS = 6 * 60 * 60 * 1000
const CADUCIDAD_STREAM_MS = 30 * 60 * 1000

const cacheSlugs = new Map<string, EntradaCache<string>>()
const cacheStreams = new Map<string, EntradaCache<StreamAniZone>>()

interface Galleta {
  nombre: string
  valor: string
}

async function capturarGalletas(res: Response): Promise<Galleta[]> {
  let crudas: string[] = []
  const cabeceras = res.headers as Headers & { getSetCookie?: () => string[] }
  if (typeof cabeceras.getSetCookie === "function") {
    crudas = cabeceras.getSetCookie()
  } else {
    const una = res.headers.get("set-cookie")
    if (una) crudas = [una]
  }
  return crudas.map((c) => {
    const [par] = c.split(";")
    const idx = par.indexOf("=")
    return {
      nombre: par.slice(0, idx).trim(),
      valor: par.slice(idx + 1).trim(),
    }
  })
}

function cabeceraGalletas(galletas: Galleta[]): string {
  return galletas.map((g) => `${g.nombre}=${g.valor}`).join("; ")
}

function decodificarEscapesJs(cadena: string): string {
  const sinComillas = cadena
  let intento: string | null = null
  try {
    intento = JSON.parse(`"${sinComillas.replace(/"/g, '\\"')}"`) as string
  } catch {
    intento = null
  }
  if (intento) return intento
  return sinComillas
    .replace(/\\u([0-9a-fA-F]{4})/g, (_m, hex: string) =>
      String.fromCharCode(parseInt(hex, 16))
    )
    .replace(/\\(["'\\/])/g, "$1")
}

function htmlUnescape(texto: string): string {
  const mapa: Record<string, string> = {
    "&quot;": '"',
    "&#34;": '"',
    "&#39;": "'",
    "&apos;": "'",
    "&lt;": "<",
    "&gt;": ">",
    "&amp;": "&",
  }
  return texto.replace(/&(quot|#34|#39|apos|lt|gt|amp);/g, (m) => mapa[m] ?? m)
}

interface SnapshotLivewire {
  data: Record<string, unknown>
  memo: { id: string }
}

interface RespuestaLivewire {
  components: Array<{
    effects?: { html?: string }
  }>
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

export async function probarAccesoAniZone(): Promise<number | null> {
  try {
    const res = await fetch(`${BASE}/`, {
      headers: CABECERAS_NAVEGADOR,
      signal: AbortSignal.timeout(6000),
    })
    return res.status
  } catch {
    return null
  }
}

export async function obtenerSlugAniZone(titulo: string): Promise<string | null> {
  const clave = titulo.trim().toLowerCase()
  if (!clave) return null

  const cache = cacheSlugs.get(clave)
  if (cache && Date.now() - cache.fecha < CADUCIDAD_SLUG_MS) {
    return cache.valor
  }

  const urlBusqueda = `${BASE}/anime?search=${encodeURIComponent(titulo)}`

  try {
    const resGet = await fetch(urlBusqueda, {
      headers: CABECERAS_NAVEGADOR,
      signal: AbortSignal.timeout(6000),
    })
    if (!resGet.ok) return null
    const html = await resGet.text()
    const galletas = await capturarGalletas(resGet)

    const mCsrf = html.match(/meta name="csrf-token" content="([^"]+)"/)
    if (!mCsrf) return null
    const csrf = mCsrf[1]

    const crudos = [...html.matchAll(/wire:snapshot="([^"]+)"/g)].map((m) =>
      htmlUnescape(m[1])
    )
    let snapshot: string | null = null
    for (const crudo of crudos) {
      if (!crudo.includes('"sortOptions"')) continue
      try {
        JSON.parse(crudo) as SnapshotLivewire
        snapshot = crudo
      } catch {
        // snapshot inválido: se ignora
      }
    }
    if (!snapshot) return null

    const resPost = await fetch(`${BASE}/livewire/update`, {
      method: "POST",
      headers: {
        ...CABECERAS_NAVEGADOR,
        "Content-Type": "application/json",
        Accept: "application/json",
        Referer: urlBusqueda,
        "Sec-Fetch-Dest": "empty",
        "Sec-Fetch-Mode": "cors",
        "Sec-Fetch-Site": "same-origin",
        "X-Livewire": "v3",
        "X-XSRF-TOKEN": csrf,
        Cookie: cabeceraGalletas(galletas),
      },
      body: JSON.stringify({
        _token: csrf,
        components: [
          { snapshot, updates: { search: titulo }, calls: [] },
        ],
      }),
      signal: AbortSignal.timeout(6000),
    })
    if (!resPost.ok) return null

    const json = (await resPost.json()) as RespuestaLivewire
    const htmlRespuesta = json.components?.[0]?.effects?.html || ""
    const items = itemsDeBusqueda(htmlRespuesta)
    const primero = items[0]
    if (!primero || !primero.slug) return null

    cacheSlugs.set(clave, { valor: primero.slug, fecha: Date.now() })
    return primero.slug
  } catch {
    return null
  }
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

  try {
    const res = await fetch(`${BASE}/anime/${encodeURIComponent(slug)}/${episodio}`, {
      headers: CABECERAS_NAVEGADOR,
      signal: AbortSignal.timeout(6000),
    })
    if (!res.ok) return null
    const html = await res.text()

    const crudo = extraerCuerpoJs(html, "vidstackPlayer(JSON.parse('")
    if (!crudo) return null
    const config = JSON.parse(decodificarEscapesJs(crudo)) as ConfigVidstack
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
  } catch {
    return null
  }
}
