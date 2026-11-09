import { createServerClient } from "@/lib/supabase"
import { NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"
import { NextRequest } from "next/server"
import type { Anime } from "@/types"

interface AdminUser {
  id: string
  email?: string | null
}

interface WatchlistRow {
  id: string
  anime_id: string
  estado: string
  puntuacion?: number
  created_at: string
  animes: Anime
}

async function getUserId(req: NextRequest): Promise<string | null> {
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  })
  return token?.sub || null
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ user_id: string }> }) {
  try {
    const viewer_id = await getUserId(req)
    if (!viewer_id) {
      return NextResponse.json(
        { ok: false, error: "No autenticado" },
        { status: 401 }
      )
    }

    const { user_id: target_user_id } = await params

    if (!target_user_id) {
      return NextResponse.json(
        { ok: false, error: "ID de usuario requerido" },
        { status: 400 }
      )
    }

    const supabase = createServerClient()

    // Verificar que son amigos (amistad aceptada en cualquier dirección)
    const { data: friendship, error: friendshipError } = await supabase
      .from("friendships")
      .select("*")
      .or(`and(user_id.eq.${viewer_id},friend_id.eq.${target_user_id}),and(user_id.eq.${target_user_id},friend_id.eq.${viewer_id})`)
      .eq("status", "accepted")
      .single()

    if (friendshipError || !friendship) {
      return NextResponse.json(
        { ok: false, error: "No son amigos o no existe la amistad" },
        { status: 403 }
      )
    }

    // Obtener el watchlist del usuario objetivo
    const { data: watchlists, error } = await supabase
      .from("watchlists")
      .select("*, animes(*)")
      .eq("user_id", target_user_id)
      .order("created_at", { ascending: false })

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      )
    }

    // Obtener email del usuario objetivo para mostrarlo
    const { data: listUsers, error: userError } = await supabase.auth.admin.listUsers()
    if (userError) {
      return NextResponse.json(
        { ok: false, error: userError.message },
        { status: 500 }
      )
    }

    const users = listUsers?.users || []
    const targetUser = users.find((u: AdminUser) => u.id === target_user_id)
    const targetEmail = targetUser?.email || "Desconocido"

    return NextResponse.json({
      ok: true,
      user_email: targetEmail,
      items: (watchlists || []).map((w: WatchlistRow) => ({
        id: w.id,
        anime_id: w.anime_id,
        estado: w.estado,
        puntuacion: w.puntuacion,
        created_at: w.created_at,
        anime: w.animes,
      })),
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido"
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
