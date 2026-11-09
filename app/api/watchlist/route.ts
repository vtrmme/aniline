import { createServerClient } from "@/lib/supabase"
import { NextResponse, NextRequest } from "next/server"
import { getToken } from "next-auth/jwt"

async function getUserId(req: Request): Promise<string | null> {
  const nextReq = new NextRequest(req.url, {
    headers: req.headers,
  })
  const token = await getToken({
    req: nextReq,
    secret: process.env.NEXTAUTH_SECRET,
  })
  return token?.sub || null
}

export async function POST(req: Request) {
  try {
    const user_id = await getUserId(req)
    console.log("Watchlist POST: user_id=", user_id)
    if (!user_id) {
      return NextResponse.json(
        { ok: false, error: "No autenticado" },
        { status: 401 }
      )
    }

    const { anime_id, estado } = await req.json()
    console.log("Watchlist POST: anime_id=", anime_id, "estado=", estado)

    if (!anime_id || !estado) {
      return NextResponse.json(
        { ok: false, error: "Faltan parámetros: anime_id, estado" },
        { status: 400 }
      )
    }

    const supabase = createServerClient()
    console.log("Watchlist POST: supabase client created")

    const { data: existing, error: selectError } = await supabase
      .from("watchlists")
      .select("id")
      .eq("user_id", user_id)
      .eq("anime_id", anime_id)
      .single()

    console.log("Watchlist POST: select done, existing=", existing, "selectError=", selectError)

    if (selectError && selectError.code !== "PGRST116") {
      console.error("Watchlist POST select error:", selectError)
      return NextResponse.json(
        { ok: false, error: selectError.message },
        { status: 500 }
      )
    }

    if (existing) {
      const { error } = await supabase
        .from("watchlists")
        .update({ estado })
        .eq("id", existing.id)

      if (error) {
        console.error("Watchlist POST update error:", error)
        return NextResponse.json(
          { ok: false, error: error.message },
          { status: 500 }
        )
      }

      return NextResponse.json({ ok: true, action: "updated", estado })
    }

    const { error } = await supabase
      .from("watchlists")
      .insert({
        user_id,
        anime_id,
        estado,
      })

    if (error) {
      console.error("Watchlist POST insert error:", error)
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ ok: true, action: "created", estado })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido"
    console.error("Watchlist POST catch error:", err)
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    const user_id = await getUserId(req)
    if (!user_id) {
      return NextResponse.json(
        { ok: false, error: "No autenticado" },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(req.url)
    const anime_id = searchParams.get("anime_id")

    if (!anime_id) {
      return NextResponse.json(
        { ok: false, error: "anime_id requerido" },
        { status: 400 }
      )
    }

    const supabase = createServerClient()

    const { error } = await supabase
      .from("watchlists")
      .delete()
      .eq("user_id", user_id)
      .eq("anime_id", anime_id)

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ ok: true, action: "deleted" })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido"
    console.error("Watchlist DELETE error:", err)
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}

export async function GET(req: Request) {
  try {
    const user_id = await getUserId(req)
    if (!user_id) {
      return NextResponse.json({ ok: true, inList: false })
    }

    const { searchParams } = new URL(req.url)
    const anime_id = searchParams.get("anime_id")

    if (!anime_id) {
      return NextResponse.json(
        { ok: false, error: "anime_id requerido" },
        { status: 400 }
      )
    }

    const supabase = createServerClient()

    const { data } = await supabase
      .from("watchlists")
      .select("estado")
      .eq("user_id", user_id)
      .eq("anime_id", anime_id)
      .single()

    return NextResponse.json({
      ok: true,
      inList: !!data,
      estado: data?.estado || null,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido"
    console.error("Watchlist GET error:", err)
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
