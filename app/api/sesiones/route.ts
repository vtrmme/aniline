import { createServerClient } from "@/lib/supabase"
import { NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"
import { NextRequest } from "next/server"
import { rateLimit } from "@/lib/rate-limit"
import {
  obtenerIP,
  esUUID,
  esEnteroEnRango,
  verificarOrigen,
  cuerpoDentroDelLimite,
  respuestaLimite,
  errorInterno,
  noAutorizado,
} from "@/lib/security"

interface Sesion {
  id: string
  user_id: string
  anime_id: string
  episodio_numero: number
  started_at: string
  ended_at: string | null
  last_seen_at: string
  segundos_visto: number
  created_at: string
  updated_at: string
}

interface CuerpoSesion {
  anime_id?: unknown
  episodio_numero?: unknown
  segundos?: unknown
  finalizar?: unknown
}

async function obtenerUsuarioSesion(
  req: NextRequest
): Promise<{ userId: string; email: string | null } | null> {
  const token = await getToken({
    req: req,
    secret: process.env.NEXTAUTH_SECRET,
  })
  const userId = token?.sub || null
  if (!userId) {
    return null
  }
  return { userId, email: token?.email || null }
}

export async function GET(req: NextRequest) {
  try {
    const usuario = await obtenerUsuarioSesion(req)
    if (!usuario) {
      return noAutorizado()
    }
    const ip = obtenerIP(req)
    const limite = await rateLimit({ clave: `sesiones:${ip}`, maximo: 120, ventanaSegundos: 60 })
    if (!limite.permitido) {
      return respuestaLimite()
    }
    const supabase = createServerClient()
    const { data, error } = await supabase
      .from("sesiones")
      .select("*")
      .eq("user_id", usuario.userId)
      .order("started_at", { ascending: false })
      .limit(200)
    if (error) {
      console.error("Error consultando sesiones:", error.message)
      return errorInterno(error)
    }
    const items = (data || []) as Sesion[]
    return NextResponse.json({ ok: true, items })
  } catch (err) {
    return errorInterno(err)
  }
}

export async function POST(req: Request) {
  try {
    if (!verificarOrigen(req)) {
      return NextResponse.json({ ok: false, error: "Origen no permitido." }, { status: 403 })
    }
    const nextReq = new NextRequest(req.url, {
      headers: req.headers,
    })
    const token = await getToken({
      req: nextReq,
      secret: process.env.NEXTAUTH_SECRET,
    })
    const userId = token?.sub || null
    if (!userId) {
      return NextResponse.json({ ok: false, error: "No autenticado." }, { status: 401 })
    }
    const ip = obtenerIP(req)
    const limite = await rateLimit({ clave: `sesiones:${ip}`, maximo: 60, ventanaSegundos: 60 })
    if (!limite.permitido) {
      return respuestaLimite()
    }
    if (!cuerpoDentroDelLimite(req)) {
      return NextResponse.json(
        { ok: false, error: "Cuerpo de la solicitud demasiado grande." },
        { status: 413 }
      )
    }
    const body = (await req.json()) as CuerpoSesion
    const animeId = body.anime_id
    const episodioNumero = body.episodio_numero
    const finalizar = body.finalizar === true
    const segundosIngresos =
      typeof body.segundos === "number" ? Math.min(86400, Math.max(0, Math.floor(body.segundos))) : 0
    if (!animeId || !esUUID(animeId)) {
      return NextResponse.json({ ok: false, error: "anime_id no valido." }, { status: 400 })
    }
    if (!esEnteroEnRango(episodioNumero, 1, 100000)) {
      return NextResponse.json({ ok: false, error: "episodio_numero no valido." }, { status: 400 })
    }
    const supabase = createServerClient()
    const ahora = new Date().toISOString()
    if (finalizar) {
      const { error: errorFinalizar } = await supabase
        .from("sesiones")
        .update({ ended_at: ahora, last_seen_at: ahora, updated_at: ahora })
        .eq("user_id", userId)
        .eq("anime_id", animeId)
        .eq("episodio_numero", episodioNumero)
        .is("ended_at", null)
      if (errorFinalizar) {
        console.error("Error finalizando sesion:", errorFinalizar.message)
        return errorInterno(errorFinalizar)
      }
      return NextResponse.json({ ok: true })
    }
    const { data: abiertas, error: errorAbiertas } = await supabase
      .from("sesiones")
      .select("id, started_at, segundos_visto")
      .eq("user_id", userId)
      .eq("anime_id", animeId)
      .eq("episodio_numero", episodioNumero)
      .is("ended_at", null)
      .order("started_at", { ascending: false })
      .limit(1)
    if (errorAbiertas) {
      console.error("Error consultando sesion abierta:", errorAbiertas.message)
      return errorInterno(errorAbiertas)
    }
    if (abiertas && abiertas.length > 0) {
      const sesionAbierta = abiertas[0] as unknown as Sesion
      const nuevosSegundos = Math.max(sesionAbierta.segundos_visto || 0, segundosIngresos)
      const { error: errorUpdate } = await supabase
        .from("sesiones")
        .update({
          last_seen_at: ahora,
          segundos_visto: nuevosSegundos,
          updated_at: ahora,
        })
        .eq("id", sesionAbierta.id)
      if (errorUpdate) {
        console.error("Error actualizando sesion:", errorUpdate.message)
        return errorInterno(errorUpdate)
      }
      return NextResponse.json({ ok: true })
    }
    const { error: errorInsert } = await supabase
      .from("sesiones")
      .insert({
        user_id: userId,
        anime_id: animeId,
        episodio_numero: episodioNumero,
        started_at: ahora,
        ended_at: null,
        last_seen_at: ahora,
        segundos_visto: segundosIngresos,
        updated_at: ahora,
      })
    if (errorInsert) {
      console.error("Error creando sesion:", errorInsert.message)
      return errorInterno(errorInsert)
    }
    return NextResponse.json({ ok: true })
  } catch (err) {
    return errorInterno(err)
  }
}


