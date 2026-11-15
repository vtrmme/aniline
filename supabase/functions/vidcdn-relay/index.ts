// @ts-nocheck
const CLAVE = Deno.env.get("RELAY_KEY") || ""
const PERMITIDOS = ["vid-cdn.xyz"]

function permitido(hostname: string): boolean {
  return PERMITIDOS.some((h) => hostname === h || hostname.endsWith("." + h))
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204 })
  }

  const cabeceraClave = req.headers.get("x-relay-key") || ""
  if (!CLAVE || cabeceraClave !== CLAVE) {
    return new Response("no autorizado", { status: 403 })
  }

  const u = new URL(req.url)
  const target = u.searchParams.get("url")
  if (!target) {
    return new Response("falta url", { status: 400 })
  }

  let t: URL
  try {
    t = new URL(target)
  } catch {
    return new Response("url inválida", { status: 400 })
  }

  if (t.protocol !== "https:" || !permitido(t.hostname)) {
    return new Response("host no permitido", { status: 403 })
  }

  const headers = new Headers()
  const ua = req.headers.get("user-agent")
  if (ua) headers.set("user-agent", ua)
  const range = req.headers.get("range")
  if (range) headers.set("range", range)
  const accept = req.headers.get("accept")
  if (accept) headers.set("accept", accept)

  const upstream = await fetch(t.toString(), {
    method: req.method === "HEAD" ? "HEAD" : "GET",
    headers,
    redirect: "follow",
  })

  const salida = new Headers()
  for (const nombre of [
    "content-type",
    "content-length",
    "content-range",
    "accept-ranges",
  ]) {
    const valor = upstream.headers.get(nombre)
    if (valor) salida.set(nombre, valor)
  }

  return new Response(upstream.body, {
    status: upstream.status,
    headers: salida,
  })
})
