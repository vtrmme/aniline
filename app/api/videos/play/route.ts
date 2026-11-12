import { createServerClient } from "@/lib/supabase"
import { NextResponse } from "next/server"
import { rateLimit } from "@/lib/rate-limit"
import {
  obtenerIP,
  usuarioAutenticado,
  esPathVideoSeguro,
  respuestaLimite,
  noAutorizado,
  errorInterno,
} from "@/lib/security"

const BUCKET = "episode-videos"

export async function GET(req: Request) {
  const user_id = await usuarioAutenticado(req)
  if (!user_id) {
    return noAutorizado()
  }

  const ip = obtenerIP(req)
  const limite = rateLimit({ clave: `play:${ip}`, maximo: 30, ventanaSegundos: 60 })
  if (!limite.permitido) {
    return respuestaLimite()
  }

  try {
    const { searchParams } = new URL(req.url)
    const filePath = searchParams.get("path")

    if (!filePath) {
      return NextResponse.json(
        { ok: false, error: "Ruta de archivo no especificada" },
        { status: 400 }
      )
    }

    if (!esPathVideoSeguro(filePath)) {
      return NextResponse.json(
        { ok: false, error: "Ruta de archivo inválida." },
        { status: 400 }
      )
    }

    const supabase = createServerClient()

    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(filePath, 3600)

    if (error) {
      console.error("Error creando URL de reproducción:", error.message)
      return NextResponse.json(
        { ok: false, error: "No se pudo obtener el video." },
        { status: 500 }
      )
    }

    return NextResponse.json({
      ok: true,
      videoUrl: data.signedUrl,
      path: filePath,
    })
  } catch (err) {
    return errorInterno(err)
  }
}
