import { createServerClient } from "@/lib/supabase"
import { NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"
import { NextRequest } from "next/server"

interface FriendshipRow {
  id: string
  user_email: string
  friend_email: string
  status: string
  created_at: string
}

interface AdminUser {
  id: string
  email?: string | null
}

async function getUserEmail(req: NextRequest): Promise<string | null> {
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  })
  return token?.email ?? null
}

export async function GET(req: NextRequest) {
  try {
    const user_email = await getUserEmail(req)
    if (!user_email) {
      return NextResponse.json(
        { ok: false, error: "No autenticado" },
        { status: 401 }
      )
    }

    const supabase = createServerClient()

    const { data: friendships, error } = await supabase
      .from("friendships")
      .select("*")
      .or(`user_email.eq.${user_email},friend_email.eq.${user_email}`)
      .eq("status", "accepted")

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      )
    }

    const { data: pendingReceived, error: pendingReceivedError } = await supabase
      .from("friendships")
      .select("*")
      .eq("friend_email", user_email)
      .eq("status", "pending")

    if (pendingReceivedError) {
      return NextResponse.json(
        { ok: false, error: pendingReceivedError.message },
        { status: 500 }
      )
    }

    const { data: pendingSent, error: pendingSentError } = await supabase
      .from("friendships")
      .select("*")
      .eq("user_email", user_email)
      .eq("status", "pending")

    if (pendingSentError) {
      return NextResponse.json(
        { ok: false, error: pendingSentError.message },
        { status: 500 }
      )
    }

    const friends = (friendships || []).map((f: FriendshipRow) => {
      const isUserRequester = f.user_email === user_email
      return {
        id: f.id,
        friend_email: isUserRequester ? f.friend_email : f.user_email,
        status: f.status,
        created_at: f.created_at,
      }
    })

    const pendingIncoming = (pendingReceived || []).map((f: FriendshipRow) => ({
      id: f.id,
      from_email: f.user_email,
      status: f.status,
      created_at: f.created_at,
    }))

    const pendingOutgoing = (pendingSent || []).map((f: FriendshipRow) => ({
      id: f.id,
      to_email: f.friend_email,
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
    const user_email = token?.email ?? null

    if (!user_email) {
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

    const normalizedFriendEmail = friend_email.toLowerCase()
    const normalizedUserEmail = user_email.toLowerCase()

    if (normalizedFriendEmail === normalizedUserEmail) {
      return NextResponse.json(
        { ok: false, error: "No puedes agregarte a ti mismo" },
        { status: 400 }
      )
    }

    const supabase = createServerClient()

    // Verificar que el amigo existe en Supabase Auth
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
    const targetUser = users.find((u: AdminUser) => u.email?.toLowerCase() === normalizedFriendEmail)
    if (!targetUser) {
      return NextResponse.json(
        { ok: false, error: "Usuario no encontrado" },
        { status: 404 }
      )
    }

    // Verificar si ya existe una amistad entre estos emails
    const { data: existing } = await supabase
      .from("friendships")
      .select("*")
      .or(`and(user_email.eq.${user_email},friend_email.eq.${friend_email}),and(user_email.eq.${friend_email},friend_email.eq.${user_email})`)
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
        user_email,
        friend_email,
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
