import { createServerClient } from "@/lib/supabase"
import { NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"
import { NextRequest } from "next/server"
import { rateLimit } from "@/lib/rate-limit"
import { obtenerIP, esOwner, respuestaLimite, errorInterno, noAutorizado } from "@/lib/security"
import type { Profile } from "@/types"

export async function GET(req: NextRequest) {
  try {
    const nextReq = new NextRequest(req.url, {
      headers: req.headers,
    })
    const token = await getToken({
      req: nextReq,
      secret: process.env.NEXTAUTH_SECRET,
    })
    const userId = token?.sub || null
    const email = token?.email || null
    if (!userId) {
      return NextResponse.json({ ok: false, error: "No autenticado." }, { status: 401 })
    }
    if (!esOwner(userId, email)) {
      return noAutorizado()
    }
    const ip = obtenerIP(req)
    const limite = await rateLimit({ clave: `usuarios:${ip}`, maximo: 30, ventanaSegundos: 60 })
    if (!limite.permitido) {
      return respuestaLimite()
    }
    const supabase = createServerClient()
    const { data, error, count } = await supabase
      .from("profiles")
      .select("user_id,email,name,image,provider,created_at,updated_at", { count: "exact" })
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error obteniendo perfiles:", error.message)
      return NextResponse.json(
        { ok: false, error: "No se pudo cargar la información de usuarios." },
        { status: 500 }
      )
    }

    const profiles = (data || []) as Profile[]
    return NextResponse.json({ ok: true, count: count ?? profiles.length, users: profiles })
  } catch (err) {
    return errorInterno(err)
  }
}

