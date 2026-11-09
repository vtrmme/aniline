import { createServerClient } from "@/lib/supabase"
import { NextResponse } from "next/server"

const BUCKET = "episode-videos"

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const filePath = searchParams.get("path")

    if (!filePath) {
      return NextResponse.json(
        { ok: false, error: "Ruta de archivo no especificada" },
        { status: 400 }
      )
    }

    const supabase = createServerClient()

    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(filePath, 3600)

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      ok: true,
      videoUrl: data.signedUrl,
      path: filePath,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido"
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
