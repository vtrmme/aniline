import { createServerClient } from "@/lib/supabase"
import { NextResponse } from "next/server"

const BUCKET = "episode-videos"

export async function POST(req: Request) {
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
