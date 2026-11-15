import { NextResponse } from "next/server"
import { rateLimit } from "@/lib/rate-limit"
import { obtenerIP, usuarioAutenticado, respuestaLimite, noAutorizado, errorInterno } from "@/lib/security"
import { srcValido } from "@/lib/hls-proxy"
import { aVtt, esFormatoSubtituloValido } from "@/lib/subtitle-convert"
import { traducirVttAEspanol } from "@/lib/translate"

export const runtime = "edge"

export async function GET(req: Request) {
  const user_id = await usuarioAutenticado(req)
  if (!user_id) {
    return noAutorizado()
  }

  const ip = obtenerIP(req)
  const limite = rateLimit({ clave: `subes:${ip}`, maximo: 30, ventanaSegundos: 60 })
  if (!limite.permitido) {
    return respuestaLimite()
  }

  try {
    const { searchParams } = new URL(req.url)
    const url = srcValido(searchParams.get("src"))
    if (!url) {
      return NextResponse.json(
        { ok: false, error: "Origen del subtítulo inválido" },
        { status: 400 }
      )
    }

    const res = await fetch(url.toString(), {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; AniLineProxy)" },
      signal: AbortSignal.timeout(30000),
    })
    if (!res.ok) {
      return NextResponse.json(
        { ok: false, error: "No se pudo descargar el subtítulo", estado: res.status },
        { status: 502 }
      )
    }

    const texto = await res.text()
    const formato = url.pathname.toLowerCase().endsWith(".ass") ? "ass" : "srt"
    const vttOriginal = aVtt(texto, formato)
    if (!esFormatoSubtituloValido(vttOriginal)) {
      return NextResponse.json(
        { ok: false, error: "El subtítulo no se pudo convertir" },
        { status: 502 }
      )
    }

    const vttTraducido = await traducirVttAEspanol(url.toString(), vttOriginal)

    return new NextResponse(vttTraducido, {
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
