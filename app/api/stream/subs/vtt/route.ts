import { NextResponse } from "next/server"
import { rateLimit } from "@/lib/rate-limit"
import { obtenerIP, usuarioAutenticado, respuestaLimite, noAutorizado, errorInterno } from "@/lib/security"
import { aVtt, esFormatoSubtituloValido } from "@/lib/subtitle-convert"

function urlValida(cruda: string | null): URL | null {
  if (!cruda) return null
  try {
    const url = new URL(cruda)
    if (url.protocol !== "https:" || url.hostname !== "dl.subdl.com") return null
    return url
  } catch {
    return null
  }
}

export async function GET(req: Request) {
  const user_id = await usuarioAutenticado(req)
  if (!user_id) {
    return noAutorizado()
  }

  const ip = obtenerIP(req)
  const limite = await rateLimit({ clave: `subvtt:${ip}`, maximo: 60, ventanaSegundos: 60 })
  if (!limite.permitido) {
    return respuestaLimite()
  }

  try {
    const { searchParams } = new URL(req.url)
    const url = urlValida(searchParams.get("u"))
    const formato = (searchParams.get("f") || "srt").toLowerCase()
    if (!url) {
      return NextResponse.json(
        { ok: false, error: "Origen del subtítulo inválido" },
        { status: 400 }
      )
    }

    const res = await fetch(url.toString(), {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; AniLineProxy)" },
      signal: AbortSignal.timeout(15000),
    })
    if (!res.ok) {
      return NextResponse.json(
        { ok: false, error: "No se pudo descargar el subtítulo" },
        { status: 502 }
      )
    }

    const texto = await res.text()
    const vtt = aVtt(texto, formato)
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
        "Cache-Control": "private, max-age=86400",
      },
    })
  } catch (err) {
    return errorInterno(err)
  }
}
