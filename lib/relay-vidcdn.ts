interface OpcionesFetch {
  method?: string
  headers?: HeadersInit
  body?: BodyInit | null
  signal?: AbortSignal
}

export async function fetchConReleVidCdn(
  url: string,
  init: OpcionesFetch = {}
): Promise<Response> {
  const base = process.env.VIDCDN_RELAY_URL
  const clave = process.env.VIDCDN_RELAY_KEY
  if (!base || !clave) {
    return fetch(url, init)
  }
  const limpio = base.replace(/\/+$/, "")
  const rele = `${limpio}?url=${encodeURIComponent(url)}`
  const cabeceras = new Headers(init.headers)
  cabeceras.set("x-relay-key", clave)
  return fetch(rele, {
    method: init.method || "GET",
    headers: cabeceras,
    body: init.body ?? null,
    signal: init.signal,
  })
}
