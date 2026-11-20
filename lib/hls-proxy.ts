const HOSTS_PERMITIDOS = /(^|\.)vid-cdn\.xyz$/i

export function srcValido(valor: string | null): URL | null {
  if (!valor) return null
  try {
    const url = new URL(valor)
    if (url.protocol !== "https:") return null
    if (!HOSTS_PERMITIDOS.test(url.hostname)) return null
    return url
  } catch {
    return null
  }
}

function reescribirUri(cruda: string, base: URL): string | null {
  let destino = cruda
  if (!cruda.startsWith("http")) {
    try {
      destino = new URL(cruda, base).toString()
    } catch {
      return null
    }
  }
  try {
    const url = new URL(destino)
    if (url.protocol !== "https:" || !HOSTS_PERMITIDOS.test(url.hostname)) {
      return null
    }
    return `/api/stream/anizone/seg?src=${encodeURIComponent(url.toString())}`
  } catch {
    return null
  }
}

export function reescribirPlaylist(texto: string, base: URL): string {
  const lineas = texto.split("\n")
  const salida: string[] = []

  for (const lineaOriginal of lineas) {
    const linea = lineaOriginal.trim()
    if (linea === "") {
      salida.push("")
      continue
    }
    if (!linea.startsWith("#")) {
      const reescrita = reescribirUri(linea, base)
      salida.push(reescrita ?? linea)
      continue
    }
    salida.push(
      linea.replace(/URI="([^"]+)"/g, (m, uri: string) => {
        const reescrita = reescribirUri(uri, base)
        return reescrita ? `URI="${reescrita}"` : m
      })
    )
  }

  return salida.join("\n")
}