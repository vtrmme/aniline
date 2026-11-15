import { NextResponse } from "next/server"
import { rateLimit } from "@/lib/rate-limit"
import { obtenerIP, usuarioAutenticado, respuestaLimite, noAutorizado, errorInterno } from "@/lib/security"
import { srcValido, reescribirPlaylist } from "@/lib/hls-proxy"

export const runtime = "edge"

export async function GET(req: Request) {
  const user_id = await usuarioAutenticado(req)
  if (!user_id) {
    return noAutorizado()
  }

  const ip = obtenerIP(req)
  const limite = rateLimit({ clave: `azm3u8:${ip}`, maximo: 60, ventanaSegundos: 60 })
  if (!limite.permitido) {
    return respuestaLimite()
  }

  try {
    const { searchParams } = new URL(req.url)
    const url = srcValido(searchParams.get("src"))
    if (!url) {
      return NextResponse.json(
        { ok: false, error: "Origen del stream inválido" },
        { status: 400 }
      )
    }

    const res = await fetch(url.toString(), {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; AniLineProxy)" },
      signal: AbortSignal.timeout(15000),
    })
    if (!res.ok) {
      return NextResponse.json(
        { ok: false, error: "No se pudo obtener el stream", estado: res.status },
        { status: 502 }
      )
    }

    const texto = await res.text()
    const reescrito = reescribirPlaylist(texto, url)

    return new NextResponse(reescrito, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.apple.mpegurl",
        "Cache-Control": "private, max-age=5",
      },
    })
  } catch (err) {
    return errorInterno(err)
  }
}
