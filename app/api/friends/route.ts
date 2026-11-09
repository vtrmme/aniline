import { createServerClient } from "@/lib/supabase"
import { NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"
import { NextRequest } from "next/server"

interface ProfileWithEmail {
  email?: string | null
}

interface FriendshipRow {
  id: string
  user_id: string
  friend_id: string
  status: string
  created_at: string
  user_profiles: ProfileWithEmail[]
  friend_profiles: ProfileWithEmail[]
}

interface AdminUser {
  id: string
  email?: string | null
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
      return NextResponse.json(
        { ok: false, error: "No autenticado" },
        { status: 401 }
      )
    }

    const supabase = createServerClient()

    const { data: friendships, error } = await supabase
      .from("friendships")
      .select("*, user_profiles!left(email), friend_profiles!right(email)")
      .or(`user_id.eq.${user_id},friend_id.eq.${user_id}`)
      .eq("status", "accepted")

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      )
    }

    const { data: pendingReceived, error: pendingReceivedError } = await supabase
      .from("friendships")
      .select("*, user_profiles!left(email)")
      .eq("friend_id", user_id)
      .eq("status", "pending")

    if (pendingReceivedError) {
      return NextResponse.json(
        { ok: false, error: pendingReceivedError.message },
        { status: 500 }
      )
    }

    const { data: pendingSent, error: pendingSentError } = await supabase
      .from("friendships")
      .select("*, friend_profiles!right(email)")
      .eq("user_id", user_id)
      .eq("status", "pending")

    if (pendingSentError) {
      return NextResponse.json(
        { ok: false, error: pendingSentError.message },
        { status: 500 }
      )
    }

    const friends = (friendships || []).map((f: FriendshipRow) => {
      const isUserRequester = f.user_id === user_id
      const friendData = isUserRequester ? f.friend_profiles : f.user_profiles
      return {
        id: f.id,
        friend_id: isUserRequester ? f.friend_id : f.user_id,
        email: friendData?.[0]?.email || "Desconocido",
        status: f.status,
        created_at: f.created_at,
      }
    })

    const pendingIncoming = (pendingReceived || []).map((f: FriendshipRow) => ({
      id: f.id,
      from_user_id: f.user_id,
      from_email: f.user_profiles?.[0]?.email || "Desconocido",
      status: f.status,
      created_at: f.created_at,
    }))

    const pendingOutgoing = (pendingSent || []).map((f: FriendshipRow) => ({
      id: f.id,
      to_user_id: f.friend_id,
      to_email: f.friend_profiles?.[0]?.email || "Desconocido",
      status: f.status,
      created_at: f.created_at,
    }))

    return NextResponse.json({
      ok: true,
      friends,
      pending_incoming: pendingIncoming,
      pending_outgoing: pendingOutgoing,
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

    const { friend_email } = await req.json()

    if (!friend_email) {
      return NextResponse.json(
        { ok: false, error: "Email del amigo requerido" },
        { status: 400 }
      )
    }

    const supabase = createServerClient()

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
    const targetUser = users.find((u: AdminUser) => u.email?.toLowerCase() === friend_email.toLowerCase())
    if (!targetUser) {
      return NextResponse.json(
        { ok: false, error: "Usuario no encontrado" },
        { status: 404 }
      )
    }

    const friend_id = targetUser.id

    if (friend_id === user_id) {
      return NextResponse.json(
        { ok: false, error: "No puedes agregarte a ti mismo" },
        { status: 400 }
      )
    }

    const { data: existing } = await supabase
      .from("friendships")
      .select("*")
      .or(`and(user_id.eq.${user_id},friend_id.eq.${friend_id}),and(user_id.eq.${friend_id},friend_id.eq.${user_id})`)
      .single()

    if (existing) {
      return NextResponse.json(
        { ok: false, error: "Ya existe una solicitud de amistad con este usuario" },
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from("friendships")
      .insert({
        user_id,
        friend_id,
        status: "pending",
      })

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ ok: true, message: "Solicitud de amistad enviada" })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido"
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
