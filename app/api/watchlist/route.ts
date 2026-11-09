import { createServerClient } from "@/lib/supabase"
import { NextResponse, NextRequest } from "next/server"
import { getToken } from "next-auth/jwt"

async function getUserIdentifiers(req: Request): Promise<{ userId: string | null; userEmail: string | null }> {
  const nextReq = new NextRequest(req.url, {
    headers: req.headers,
  })
  const token = await getToken({
    req: nextReq,
    secret: process.env.NEXTAUTH_SECRET,
  })
  return {
    userId: token?.sub ?? null,
    userEmail: token?.email ?? null,
  }
}

export async function POST(req: Request) {
  try {
    const { userId, userEmail } = await getUserIdentifiers(req)
    if (!userId && !userEmail) {
      return NextResponse.json(
        { ok: false, error: "No autenticado" },
        { status: 401 }
      )
    }

    const { anime_id, estado, puntuacion } = await req.json()

    if (!anime_id || !estado) {
      return NextResponse.json(
        { ok: false, error: "Faltan parámetros: anime_id, estado" },
        { status: 400 }
      )
    }

    const supabase = createServerClient()

    // Usar email como identificador principal (coincide entre NextAuth y Supabase Auth)
    const userIdentifier = userEmail || userId

    if (!userIdentifier) {
      return NextResponse.json(
        { ok: false, error: "No se pudo identificar al usuario" },
        { status: 401 }
      )
    }

    // Buscar si ya existe un registro para este anime y usuario
    const { data: existing, error: selectError } = await supabase
      .from("watchlists")
      .select("id")
      .eq("anime_id", anime_id)
      .or(`user_id.eq.${userIdentifier},user_id.eq.${userId || ""}`)
      .single()

    if (selectError && selectError.code !== "PGRST116") {
      console.error("Watchlist POST select error:", selectError)
      return NextResponse.json(
        { ok: false, error: selectError.message },
        { status: 500 }
      )
    }

    if (existing) {
      const insertData: { estado: string; puntuacion?: number } = { estado }
      if (puntuacion !== undefined && puntuacion !== null) {
        insertData.puntuacion = puntuacion
      }

      const { error } = await supabase
        .from("watchlists")
        .update(insertData)
        .eq("id", existing.id)

      if (error) {
        console.error("Watchlist POST update error:", error)
        return NextResponse.json(
          { ok: false, error: error.message },
          { status: 500 }
        )
      }

      return NextResponse.json({ ok: true, action: "updated", estado, puntuacion })
    }

    const { error } = await supabase
      .from("watchlists")
      .insert({
        user_id: userIdentifier,
        anime_id,
        estado,
        puntuacion,
      })

    if (error) {
      console.error("Watchlist POST insert error:", error)
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ ok: true, action: "created", estado, puntuacion })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido"
    console.error("Watchlist POST catch error:", err)
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    const { userId, userEmail } = await getUserIdentifiers(req)
    if (!userId && !userEmail) {
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

    const userIdentifier = userEmail || userId

    if (!userIdentifier) {
      return NextResponse.json(
        { ok: false, error: "No se pudo identificar al usuario" },
        { status: 401 }
      )
    }

    const { error } = await supabase
      .from("watchlists")
      .delete()
      .eq("anime_id", anime_id)
      .or(`user_id.eq.${userIdentifier},user_id.eq.${userId || ""}`)

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
    const { userId, userEmail } = await getUserIdentifiers(req)
    if (!userId && !userEmail) {
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

    const userIdentifier = userEmail || userId

    const { data } = await supabase
      .from("watchlists")
      .select("estado")
      .eq("anime_id", anime_id)
      .or(`user_id.eq.${userIdentifier},user_id.eq.${userId || ""}`)
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
