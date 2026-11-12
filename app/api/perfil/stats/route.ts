import { createServerClient } from "@/lib/supabase"
import { NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"
import { NextRequest } from "next/server"
import { rateLimit } from "@/lib/rate-limit"
import { obtenerIP, respuestaLimite, errorInterno } from "@/lib/security"

interface WatchlistConAnime {
  estado: string
  animes: { genero?: string[] }
}

async function getUserId(req: NextRequest): Promise<string | null> {
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  })
  return token?.sub || null
}

export async function GET(req: NextRequest) {
  try {
    const user_id = await getUserId(req)
    if (!user_id) {
      return NextResponse.json({ ok: true, stats: null })
    }

    const ip = obtenerIP(req)
    const limite = rateLimit({ clave: `stats:${ip}`, maximo: 30, ventanaSegundos: 60 })
    if (!limite.permitido) {
      return respuestaLimite()
    }

    const supabase = createServerClient()

    const { data: watchlists } = await supabase
      .from("watchlists")
      .select("estado, animes!inner(genero)")
      .eq("user_id", user_id)

    const items = (watchlists || []) as WatchlistConAnime[]

    const animes_vistos = items.filter((w) => w.estado === "visto").length
    const animes_viendo = items.filter((w) => w.estado === "viendo").length
    const animes_para_ver = items.filter((w) => w.estado === "para_ver").length

    const generos: Record<string, number> = {}
    items.forEach((w) => {
      if (w.animes?.genero) {
        w.animes.genero.forEach((g: string) => {
          generos[g] = (generos[g] || 0) + 1
        })
      }
    })

    const generoFavorito =
      Object.entries(generos).sort((a, b) => b[1] - a[1])[0]?.[0] || "—"

    const minutos_vistos = animes_vistos * 150

    return NextResponse.json({
      ok: true,
      stats: {
        animes_vistos,
        animes_viendo,
        animes_para_ver,
        minutos_vistos,
        genero_favorito: generoFavorito,
      },
    })
  } catch (err) {
    return errorInterno(err)
  }
}
