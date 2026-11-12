import { createServerClient } from "@/lib/supabase"
import { NextResponse } from "next/server"
import { rateLimit } from "@/lib/rate-limit"
import {
  obtenerIP,
  verificarBearerAdmin,
  respuestaLimite,
  errorInterno,
  esUUID,
  esEnteroEnRango,
  esExtensionVideo,
} from "@/lib/security"

const BUCKET = "episode-videos"

interface CuerpoUpload {
  animeId?: unknown
  episodeNumber?: unknown
  fileName?: unknown
}

export async function POST(req: Request) {
  if (!verificarBearerAdmin(req)) {
    return NextResponse.json({ ok: false, error: "No autorizado." }, { status: 401 })
  }

  const ip = obtenerIP(req)
  const limite = rateLimit({ clave: `upload:${ip}`, maximo: 5, ventanaSegundos: 60 })
  if (!limite.permitido) {
    return respuestaLimite()
  }

  try {
    const body = (await req.json()) as CuerpoUpload
    const { animeId, episodeNumber, fileName } = body

    if (!animeId || !episodeNumber || !fileName) {
      return NextResponse.json(
        { ok: false, error: "Faltan parámetros: animeId, episodeNumber, fileName" },
        { status: 400 }
      )
    }

    if (!esUUID(animeId)) {
      return NextResponse.json(
        { ok: false, error: "animeId inválido: debe ser un UUID." },
        { status: 400 }
      )
    }

    if (!esEnteroEnRango(episodeNumber, 1, 100000)) {
      return NextResponse.json(
        { ok: false, error: "episodeNumber inválido: debe ser un entero entre 1 y 100000." },
        { status: 400 }
      )
    }

    if (typeof fileName !== "string" || fileName.length > 255) {
      return NextResponse.json(
        { ok: false, error: "fileName inválido." },
        { status: 400 }
      )
    }

    const fileExt = (fileName.split(".").pop() || "").toLowerCase()
    if (!esExtensionVideo(fileExt)) {
      return NextResponse.json(
        { ok: false, error: "Extensión no permitida. Usa mp4, webm, mov, mkv o m4v." },
        { status: 400 }
      )
    }

    const supabase = createServerClient()
    const filePath = `${animeId}/episode-${episodeNumber}.${fileExt}`

    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUploadUrl(filePath)

    if (error) {
      console.error("Error creando URL de subida:", error.message)
      return NextResponse.json(
        { ok: false, error: "No se pudo preparar la subida." },
        { status: 500 }
      )
    }

    return NextResponse.json({
      ok: true,
      uploadUrl: data.signedUrl,
      path: filePath,
      filePath,
    })
  } catch (err) {
    return errorInterno(err)
  }
}
