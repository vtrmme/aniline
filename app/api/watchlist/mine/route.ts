import { createServerClient } from "@/lib/supabase"
import { NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"
import { NextRequest } from "next/server"
import { rateLimit } from "@/lib/rate-limit"
import { obtenerIP, respuestaLimite, errorInterno } from "@/lib/security"

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
      return NextResponse.json({ ok: true, items: [] })
    }

    const ip = obtenerIP(req)
    const limite = rateLimit({ clave: `watchlist-mine:${ip}`, maximo: 60, ventanaSegundos: 60 })
    if (!limite.permitido) {
      return respuestaLimite()
    }

    const supabase = createServerClient()

    const { data, error } = await supabase
      .from("watchlists")
      .select("*, animes(*)")
      .eq("user_id", user_id)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Watchlist mine error:", error.message)
      return NextResponse.json(
        { ok: false, error: "No se pudo cargar tu lista." },
        { status: 500 }
      )
    }

    return NextResponse.json({
      ok: true,
      items: data || [],
    })
  } catch (err) {
    return errorInterno(err)
  }
}
