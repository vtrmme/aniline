export interface PistaConvertida {
  vtt: string
  formato: string
}

function formatearTiempoVtt(ms: number): string {
  const total = Math.max(0, Math.floor(ms))
  const horas = Math.floor(total / 3600000)
  const minutos = Math.floor((total % 3600000) / 60000)
  const segundos = Math.floor((total % 60000) / 1000)
  const milis = total % 1000
  const hh = String(horas).padStart(2, "0")
  const mm = String(minutos).padStart(2, "0")
  const ss = String(segundos).padStart(2, "0")
  const mmm = String(milis).padStart(3, "0")
  return `${hh}:${mm}:${ss}.${mmm}`
}

function parsearTiempoCintico(valor: string): number | null {
  const m = valor.match(/^(?:(\d+):)?(\d{1,2}):(\d{1,2})[.,](\d{1,3})$/)
  if (!m) return null
  const horas = m[1] ? Number(m[1]) : 0
  const minutos = Number(m[2])
  const segundos = Number(m[3])
  const frac = m[4].padEnd(3, "0")
  return ((horas * 3600 + minutos * 60 + segundos) * 1000) + Number(frac)
}

interface ColaVtt {
  inicio: number | null
  fin: number | null
  texto: string[]
}

function ensamblarVtt(colas: ColaVtt[]): string {
  const partes: string[] = ["WEBVTT"]
  for (const cola of colas) {
    if (cola.inicio === null || cola.fin === null) continue
    if (cola.fin <= cola.inicio) continue
    const texto = cola.texto.join("\n").trim()
    if (!texto) continue
    partes.push("")
    partes.push(
      `${formatearTiempoVtt(cola.inicio)} --> ${formatearTiempoVtt(cola.fin)}`
    )
    partes.push(texto)
  }
  return partes.join("\n") + "\n"
}

export function srtAVtt(contenido: string): string {
  const limpio = contenido.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n")
  const lineas = limpio.split("\n")
  const colas: ColaVtt[] = []
  let actual: ColaVtt | null = null

  for (const linea of lineas) {
    const mTiempo = linea.match(
      /(\d{1,3}:\d{1,2}:\d{1,2}[.,]\d{1,3})\s*-->\s*(\d{1,3}:\d{1,2}:\d{1,2}[.,]\d{1,3})/
    )
    if (mTiempo) {
      actual = {
        inicio: parsearTiempoCintico(mTiempo[1]),
        fin: parsearTiempoCintico(mTiempo[2]),
        texto: [],
      }
      colas.push(actual)
      continue
    }
    if (actual) {
      if (linea.trim() === "") {
        actual = null
      } else {
        actual.texto.push(linea.trim())
      }
    }
  }

  return ensamblarVtt(colas)
}

function limpiarTextoAss(texto: string): string {
  return texto
    .replace(/\{[^}]*\}/g, "")
    .replace(/\\[Nn]/g, "\n")
    .replace(/\\h/g, " ")
    .replace(/\\[a-zA-Z0-9]+\([^)]*\)/g, "")
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
    .join("\n")
}

function parsearTiempoAss(valor: string): number | null {
  const m = valor.match(/^(\d+):(\d{1,2}):(\d{1,2})\.(\d{1,2})$/)
  if (!m) return null
  const cs = Number(m[4].padEnd(3, "0"))
  return ((Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3])) * 1000) + cs
}

export function assAVtt(contenido: string): string {
  const limpio = contenido.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n")
  const lineas = limpio.split("\n")

  let camposTexto: string[] = []
  let indiceTexto = -1

  const colas: ColaVtt[] = []

  for (const linea of lineas) {
    if (/^Format\s*:/i.test(linea) && indiceTexto === -1) {
      const cuerpo = linea.replace(/^Format\s*:\s*/i, "")
      camposTexto = cuerpo.split(",").map((c) => c.trim().toLowerCase())
      indiceTexto = camposTexto.indexOf("text")
      continue
    }
    if (!/^Dialogue\s*:/i.test(linea)) continue
    const cuerpo = linea.replace(/^Dialogue\s*:\s*/i, "")
    const campos = cuerpo.split(",")
    if (indiceTexto < 0 || campos.length < indiceTexto + 1) continue
    const prefijo = campos.slice(0, indiceTexto)
    const texto = campos.slice(indiceTexto).join(",")
    const inicio = parsearTiempoAss((prefijo[camposTexto.indexOf("start")] ?? "").trim())
    const fin = parsearTiempoAss((prefijo[camposTexto.indexOf("end")] ?? "").trim())
    if (inicio === null || fin === null) continue
    colas.push({ inicio, fin, texto: limpiarTextoAss(texto).split("\n") })
  }

  return ensamblarVtt(colas)
}

export function aVtt(contenido: string, formato: string): string {
  const fmt = formato.toLowerCase()
  if (fmt.includes("ass") || fmt.includes("ssa")) return assAVtt(contenido)
  return srtAVtt(contenido)
}

export function esFormatoSubtituloValido(vtt: string): boolean {
  return vtt.includes("WEBVTT") && vtt.includes("-->")
}