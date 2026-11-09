import { createServerClient } from "@/lib/supabase"
import { NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"
import { NextRequest } from "next/server"

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

    const { searchParams } = new URL(req.url)
    const anime_id = searchParams.get("anime_id")
    const episodio_numero = searchParams.get("episodio_numero")

    const supabase = createServerClient()

    let query = supabase
      .from("historial")
      .select("*")
      .eq("user_id", user_id)
      .order("visto_en", { ascending: false })

    if (anime_id) {
      query = query.eq("anime_id", anime_id)
    }
    if (episodio_numero) {
      query = query.eq("episodio_numero", Number(episodio_numero))
    }

    const { data, error } = await query

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      )
    }

interface HistorialEntry {
  anime_id: string
  episodio_numero: number
}

    const item = anime_id && episodio_numero
      ? (data || []).find(
          (h: HistorialEntry) =>
            h.anime_id === anime_id && h.episodio_numero === Number(episodio_numero)
        )
      : null

    return NextResponse.json({
      ok: true,
      items: data || [],
      inList: !!item,
      episodio_numero: item?.episodio_numero ? String(item.episodio_numero) : null,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido"
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const nextReq = new NextRequest(req.url, {
      headers: req.headers,
    })
    const token = await getToken({
      req: nextReq,
      secret: process.env.NEXTAUTH_SECRET,
    })
    const user_id = token?.sub || null

    if (!user_id) {
      return NextResponse.json(
        { ok: false, error: "No autenticado" },
        { status: 401 }
      )
    }

    const { anime_id, episodio_numero } = await req.json()

    if (!anime_id || !episodio_numero) {
      return NextResponse.json(
        { ok: false, error: "Faltan parámetros: anime_id, episodio_numero" },
        { status: 400 }
      )
    }

    const supabase = createServerClient()

    const { error } = await supabase.from("historial").upsert(
      {
        user_id,
        anime_id,
        episodio_numero,
        visto_en: new Date().toISOString(),
      },
      { onConflict: "user_id,anime_id,episodio_numero" }
    )

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido"
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
