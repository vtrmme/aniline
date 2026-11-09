import { createServerClient } from "@/lib/supabase"
import { NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"
import { NextRequest } from "next/server"

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
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

    const { action } = await req.json()

    if (!action || !["accept", "reject"].includes(action)) {
      return NextResponse.json(
        { ok: false, error: "Acción requerida: accept o reject" },
        { status: 400 }
      )
    }

    const { id: friendshipId } = await params

    const supabase = createServerClient()

    // Verificar que la solicitud existe y que el usuario es el destinatario
    const { data: friendship, error: selectError } = await supabase
      .from("friendships")
      .select("*")
      .eq("id", friendshipId)
      .eq("friend_id", user_id)
      .eq("status", "pending")
      .single()

    if (selectError || !friendship) {
      return NextResponse.json(
        { ok: false, error: "Solicitud de amistad no encontrada" },
        { status: 404 }
      )
    }

    // Actualizar el estado
    const { error } = await supabase
      .from("friendships")
      .update({ status: action === "accept" ? "accepted" : "rejected" })
      .eq("id", friendshipId)

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      ok: true,
      message: action === "accept" ? "Amistad aceptada" : "Solicitud rechazada",
      action,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido"
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
