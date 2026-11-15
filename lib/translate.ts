export interface ColaTraducida {
  tiempos: string
  lineas: string[]
}

interface BloqueVtt {
  tiempos: string
  lineas: string[]
}

export function parsearVtt(vtt: string): BloqueVtt[] {
  const bloques: BloqueVtt[] = []
  const lineas = vtt.replace(/\r\n/g, "\n").split("\n")

  let tiempos = ""
  let texto: string[] = []
  let enTexto = false

  for (const linea of lineas) {
    if (linea.includes("-->")) {
      if (tiempos && texto.length > 0) {
        bloques.push({ tiempos, lineas: texto })
      }
      tiempos = linea
      texto = []
      enTexto = true
      continue
    }
    if (linea.trim() === "") {
      if (tiempos && texto.length > 0) {
        bloques.push({ tiempos, lineas: texto })
        tiempos = ""
        texto = []
        enTexto = false
      }
      continue
    }
    if (enTexto && tiempos) {
      texto.push(linea)
    }
  }
  if (tiempos && texto.length > 0) {
    bloques.push({ tiempos, lineas: texto })
  }

  return bloques
}

interface EntradaCacheVtt {
  valor: string
  fecha: number
}

const CADUCIDAD_TRADUCCION_MS = 12 * 60 * 60 * 1000
const cacheTraducciones = new Map<string, EntradaCacheVtt>()

export function obtenerTraduccionCacheada(clave: string): string | null {
  const entrada = cacheTraducciones.get(clave)
  if (entrada && Date.now() - entrada.fecha < CADUCIDAD_TRADUCCION_MS) {
    return entrada.valor
  }
  if (entrada) {
    cacheTraducciones.delete(clave)
  }
  return null
}

export function guardarTraduccionCacheada(clave: string, vtt: string): void {
  if (cacheTraducciones.size > 40) {
    const masVieja = cacheTraducciones.keys().next().value
    if (typeof masVieja === "string") {
      cacheTraducciones.delete(masVieja)
    }
  }
  cacheTraducciones.set(clave, { valor: vtt, fecha: Date.now() })
}

async function llamarEndpointGtx(url: string): Promise<string[] | null> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; AniLine)" },
      signal: AbortSignal.timeout(15000),
    })
    if (!res.ok) return null
    const json = (await res.json()) as unknown
    if (!Array.isArray(json) || !Array.isArray(json[0])) return null
    const segmentos = json[0] as Array<unknown>
    const textos: string[] = []
    for (const seg of segmentos) {
      if (Array.isArray(seg) && typeof seg[0] === "string") {
        textos.push(seg[0])
      }
    }
    return textos.length > 0 ? textos : null
  } catch {
    return null
  }
}

async function llamarGtx(texto: string): Promise<string[] | null> {
  const q = encodeURIComponent(texto)
  const urls = [
    `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=es&dt=t&q=${q}`,
    `https://translate.google.com/translate_a/single?client=gtx&sl=auto&tl=es&dt=t&q=${q}`,
    `https://clients5.google.com/translate_a/t?client=dict-chrome-ex&sl=auto&tl=es&q=${q}`,
  ]
  for (const url of urls) {
    const resultado = await llamarEndpointGtx(url)
    if (resultado) return resultado
  }
  return null
}

async function traducirLote(
  lineas: string[]
): Promise<string[] | null> {
  const limpias = lineas.map((l) =>
    l.replace(/<[^>]+>/g, "").replace(/&/g, "and")
  )
  const unidas = limpias.join("\n")
  const textos = await llamarGtx(unidas)
  if (!textos) return null

  if (textos.length === lineas.length) {
    return textos
  }

  const juntos = textos.join("")
  if (juntos.includes("\n")) {
    const partes = juntos.split("\n")
    if (partes.length === lineas.length) {
      return partes
    }
  }

  const individuales = await Promise.all(
    limpias.map(async (linea) => {
      if (!linea.trim()) return linea
      const una = await llamarGtx(linea)
      return una ? una.join("") : linea
    })
  )
  return individuales
}

export async function traducirVttAEspanol(
  clave: string,
  vtt: string
): Promise<string> {
  const cache = obtenerTraduccionCacheada(clave)
  if (cache) return cache

  const bloques = parsearVtt(vtt)

  interface Tarea {
    bloque: number
    linea: number
    texto: string
  }

  const tareas: Tarea[] = []
  bloques.forEach((b, bi) => {
    b.lineas.forEach((l, li) => {
      if (l.trim()) {
        tareas.push({ bloque: bi, linea: li, texto: l })
      }
    })
  })

  const TAMANIO_LOTE = 900
  const lotes: Tarea[][] = []
  let actual: Tarea[] = []
  let chars = 0
  for (const tarea of tareas) {
    if (actual.length > 0 && chars + tarea.texto.length > TAMANIO_LOTE) {
      lotes.push(actual)
      actual = []
      chars = 0
    }
    actual.push(tarea)
    chars += tarea.texto.length
  }
  if (actual.length > 0) lotes.push(actual)

  let traducidas = 0
  const CONCURRENCIA = 8
  for (let i = 0; i < lotes.length; i += CONCURRENCIA) {
    const grupo = lotes.slice(i, i + CONCURRENCIA)
    const resultados = await Promise.allSettled(
      grupo.map((lote) => traducirLote(lote.map((t) => t.texto)))
    )
    for (let j = 0; j < grupo.length; j++) {
      const resultado = resultados[j]
      if (resultado.status === "fulfilled" && resultado.value) {
        const textos = resultado.value
        for (let k = 0; k < grupo[j].length && k < textos.length; k++) {
          const tarea = grupo[j][k]
          bloques[tarea.bloque].lineas[tarea.linea] = textos[k]
          traducidas++
        }
      }
    }
  }

  if (traducidas === 0 && tareas.length > 0) {
    throw new Error("No se pudo traducir el subt?tulo")
  }

  const salida: string[] = ["WEBVTT", ""]
  for (const b of bloques) {
    salida.push("")
    salida.push(b.tiempos)
    for (const l of b.lineas) {
      salida.push(l)
    }
  }

  const vttFinal = salida.join("\n") + "\n"
  guardarTraduccionCacheada(clave, vttFinal)
  return vttFinal
}
