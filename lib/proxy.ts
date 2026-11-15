interface InicioPeticion {
  method?: string
  headers?: HeadersInit
  body?: BodyInit | null
  signal?: AbortSignal
}

function urlViaProxy(url: string): string {
  const base = process.env.ANIZONE_PROXY_URL
  if (!base) return url
  const limpio = base.replace(/\/+$/, "")
  const separador = limpio.includes("?") ? "&" : "?"
  const clave = process.env.ANIZONE_PROXY_KEY
  const conClave = clave
    ? `${separador}key=${encodeURIComponent(clave)}&`
    : `${separador}`
  return `${limpio}${conClave}url=${encodeURIComponent(url)}`
}

export async function fetchViaProxy(
  url: string,
  init: InicioPeticion = {}
): Promise<Response> {
  const base = process.env.ANIZONE_PROXY_URL
  if (!base) {
    return fetch(url, init)
  }
  return fetch(urlViaProxy(url), {
    method: init.method || "GET",
    headers: init.headers,
    body: init.method && init.method !== "GET" ? init.body : init.body ?? null,
    signal: init.signal,
  })
}
