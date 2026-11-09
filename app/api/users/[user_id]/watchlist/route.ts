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
  user_id: string
  anime_id: string
  estado: string
  puntuacion?: number
  created_at: string
  animes: Anime
}

async function getUserEmail(req: NextRequest): Promise<string | null> {
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  })
  return token?.email ?? null
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ user_id: string }> }) {
  try {
    const viewer_email = await getUserEmail(req)
    if (!viewer_email) {
      return NextResponse.json(
        { ok: false, error: "No autenticado" },
        { status: 401 }
      )
    }

    const { user_id: target_email } = await params

    if (!target_email) {
      return NextResponse.json(
        { ok: false, error: "Email de usuario requerido" },
        { status: 400 }
      )
    }

    const supabase = createServerClient()

    // Verificar que son amigos (amistad aceptada en cualquier dirección por email)
    const { data: friendship, error: friendshipError } = await supabase
      .from("friendships")
      .select("*")
      .or(`and(user_email.eq.${viewer_email},friend_email.eq.${target_email}),and(user_email.eq.${target_email},friend_email.eq.${viewer_email})`)
      .eq("status", "accepted")
      .single()

    if (friendshipError || !friendship) {
      return NextResponse.json(
        { ok: false, error: "No son amigos o no existe la amistad" },
        { status: 403 }
      )
    }

    // Buscar el UUID de Supabase Auth del usuario objetivo por email
    const { data: listUsers, error: userError } = await supabase.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    })
    if (userError) {
      return NextResponse.json(
        { ok: false, error: userError.message },
        { status: 500 }
      )
    }

    const users = listUsers?.users || []
    const targetUser = users.find((u: AdminUser) => u.email?.toLowerCase() === target_email.toLowerCase())
    if (!targetUser) {
      return NextResponse.json(
        { ok: false, error: "Usuario no encontrado en Supabase Auth" },
        { status: 404 }
      )
    }

    const target_supabase_user_id = targetUser.id

    // Obtener el watchlist del usuario objetivo (por su UUID de Supabase Auth)
    const { data: watchlists, error } = await supabase
      .from("watchlists")
      .select("*, animes(*)")
      .eq("user_id", target_supabase_user_id)
      .order("created_at", { ascending: false })

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      ok: true,
      user_email: target_email,
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
