import { createServerClient } from "@/lib/supabase"
import { NextResponse } from "next/server"
import { rateLimit } from "@/lib/rate-limit"

const BUCKET = "episode-videos"

function obtenerIP(req: Request): string {
  const headers = req.headers as unknown as Record<string, string>
  return (
    headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
    headers["x-real-ip"] ||
    "desconocido"
  )
}

export async function POST(req: Request) {
  const ip = obtenerIP(req)
  const limite = rateLimit({ clave: `upload:${ip}`, maximo: 5, ventanaSegundos: 60 })
  if (!limite.permitido) {
    return NextResponse.json(
      { ok: false, error: "Demasiadas solicitudes. Intenta de nuevo más tarde." },
      { status: 429 }
    )
  }
  try {
    const { animeId, episodeNumber, fileName } = await req.json()

    if (!animeId || !episodeNumber || !fileName) {
      return NextResponse.json(
        { ok: false, error: "Faltan parámetros: animeId, episodeNumber, fileName" },
        { status: 400 }
      )
    }

    const supabase = createServerClient()

    const fileExt = fileName.split(".").pop() || "mp4"
    const filePath = `${animeId}/episode-${episodeNumber}.${fileExt}`

    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUploadUrl(filePath)

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
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
    const message = err instanceof Error ? err.message : "Error desconocido"
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
