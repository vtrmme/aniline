import { createServerClient } from "@/lib/supabase"
import { searchAnimes, mapAnilistToAnime } from "@/lib/anilist"
import { NextResponse } from "next/server"
import { rateLimit } from "@/lib/rate-limit"

const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SERVICE_ROLE_KEY) {
  throw new Error("SUPABASE_SERVICE_ROLE_KEY no está definida en las variables de entorno")
}

function obtenerIP(req: Request): string {
  const headers = req.headers as unknown as Record<string, string>
  return (
    headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
    headers["x-real-ip"] ||
    "desconocido"
  )
}

interface EpisodeInsert {
  anime_id: string
  numero: number
  title_es?: string
  title_en?: string
  video_url?: string | null
  orden?: number
}

async function syncAnimes() {
  const supabase = createServerClient()
  const animes = await searchAnimes("", 50)

  let inserted = 0
  let updated = 0
  let errors = 0

  for (const media of animes) {
    try {
      const animeData = mapAnilistToAnime(media)

      const { data: existing } = await supabase
        .from("animes")
        .select("id")
        .eq("slug", animeData.slug)
        .single()

      if (existing) {
        const { error } = await supabase
          .from("animes")
          .update({
            title_es: animeData.title_es,
            title_en: animeData.title_en,
            sinopsis_es: animeData.sinopsis_es,
            sinopsis_en: animeData.sinopsis_en,
            poster_url: animeData.poster_url,
            banner_url: animeData.banner_url,
            genero: animeData.genero,
            anio: animeData.anio,
            estado: animeData.estado,
          })
          .eq("id", existing.id)

        if (error) {
          errors++
          continue
        }
        updated++
      } else {
        const { data, error } = await supabase
          .from("animes")
          .insert(animeData)
          .select("id")
          .single()

        if (error) {
          errors++
          continue
        }

        inserted++

        const totalEpisodes = media.episodes || 12
        const episodesToInsert: EpisodeInsert[] = []

        for (let i = 1; i <= totalEpisodes; i++) {
          episodesToInsert.push({
            anime_id: data.id,
            numero: i,
            title_es: `Episodio ${i}`,
            title_en: `Episode ${i}`,
            video_url: null,
            orden: i,
          })
        }

        if (episodesToInsert.length > 0) {
          await supabase.from("episodes").insert(episodesToInsert)
        }
      }
    } catch {
      errors++
    }
  }

  return { inserted, updated, errors }
}

export async function POST(req: Request) {
  const ip = obtenerIP(req)
  const limite = rateLimit({ clave: `sync:${ip}`, maximo: 2, ventanaSegundos: 3600 })
  if (!limite.permitido) {
    return NextResponse.json(
      { ok: false, error: "Sincronización limitada. Intenta de nuevo más tarde." },
      { status: 429 }
    )
  }

  try {
    const result = await syncAnimes()
    return NextResponse.json({
      ok: true,
      message: "Sincronización completada",
      ...result,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido"
    return NextResponse.json(
      { ok: false, error: message },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    message: "Endpoint de sincronización. Usa POST para ejecutar.",
  })
}
