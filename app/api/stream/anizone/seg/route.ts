import { NextResponse } from "next/server"
import { rateLimit } from "@/lib/rate-limit"
import { obtenerIP, usuarioAutenticado, respuestaLimite, noAutorizado, errorInterno } from "@/lib/security"
import { srcValido, reescribirPlaylist } from "@/lib/hls-proxy"
import { aVtt, esFormatoSubtituloValido } from "@/lib/subtitle-convert"
import { fetchConReleVidCdn } from "@/lib/relay-vidcdn"

interface ResultadoSrc {
  url: URL | null
  modoVtt: boolean
}

function analizar(req: Request): ResultadoSrc {
  const { searchParams } = new URL(req.url)
  const crudo = searchParams.get("src")
  const modoVtt = searchParams.get("as") === "vtt"
  if (!crudo) return { url: null, modoVtt }
  const url = srcValido(crudo)
  return { url, modoVtt }
}

function tipoContenido(url: URL, upstream: string | null): string {
  const ruta = url.pathname.toLowerCase()
  if (ruta.endsWith(".m3u8")) return "application/vnd.apple.mpegurl"
  if (ruta.endsWith(".mp4") || ruta.endsWith(".m4s")) return "video/mp4"
  if (ruta.endsWith(".ts")) return "video/mp2t"
  if (ruta.endsWith(".vtt")) return "text/vtt"
  if (ruta.endsWith(".ass")) return "text/plain"
  return upstream || "application/octet-stream"
}

export async function GET(req: Request) {
  const user_id = await usuarioAutenticado(req)
  if (!user_id) {
    return noAutorizado()
  }

  const ip = obtenerIP(req)
  const limite = await rateLimit({ clave: `azseg:${ip}`, maximo: 600, ventanaSegundos: 60 })
  if (!limite.permitido) {
    return respuestaLimite()
  }

  const { url, modoVtt } = analizar(req)
  if (!url) {
    return NextResponse.json(
      { ok: false, error: "Origen del recurso inválido" },
      { status: 400 }
    )
  }

  try {
    const rango = req.headers.get("range")
    const res = await fetchConReleVidCdn(url.toString(), {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; AniLineProxy)",
        ...(rango ? { Range: rango } : {}),
      },
      signal: AbortSignal.timeout(30000),
    })
    if (!res.ok || !res.body) {
      return NextResponse.json(
        { ok: false, error: "No se pudo obtener el recurso", estado: res.status },
        { status: 502 }
      )
    }

    if (modoVtt && /\.(ass|srt)$/i.test(url.pathname)) {
      const texto = await res.text()
      const vtt = aVtt(texto, url.pathname.toLowerCase().endsWith(".ass") ? "ass" : "srt")
      if (!esFormatoSubtituloValido(vtt)) {
        return NextResponse.json(
          { ok: false, error: "El subtítulo no se pudo convertir" },
          { status: 502 }
        )
      }
      return new NextResponse(vtt, {
        status: 200,
        headers: {
          "Content-Type": "text/vtt; charset=utf-8",
          "Cache-Control": "private, max-age=3600",
        },
      })
    }

    const esPlaylist =
      url.pathname.toLowerCase().endsWith(".m3u8") ||
      (res.headers.get("content-type") || "").includes("mpegurl")

    if (esPlaylist) {
      const texto = await res.text()
      return new NextResponse(reescribirPlaylist(texto, url), {
        status: 200,
        headers: {
          "Content-Type": "application/vnd.apple.mpegurl",
          "Cache-Control": "private, max-age=5",
        },
      })
    }

    const cabeceras: Record<string, string> = {
      "Content-Type": tipoContenido(url, res.headers.get("content-type")),
      "Cache-Control": "private, max-age=3600",
      "Accept-Ranges": res.headers.get("accept-ranges") || "bytes",
    }
    const longitud = res.headers.get("content-length")
    if (longitud) cabeceras["Content-Length"] = longitud
    const rangoContenido = res.headers.get("content-range")
    if (rangoContenido) cabeceras["Content-Range"] = rangoContenido

    return new NextResponse(res.body, {
      status: res.status,
      headers: cabeceras,
    })
  } catch (err) {
    return errorInterno(err)
  }
}
