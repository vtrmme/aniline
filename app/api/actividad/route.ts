import { createServerClient } from "@/lib/supabase"
import { NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"
import { NextRequest } from "next/server"
import { rateLimit } from "@/lib/rate-limit"
import {
  obtenerIP,
  esOwner,
  respuestaLimite,
  errorInterno,
  noAutorizado,
} from "@/lib/security"

interface ActividadSesion {
  id: string
  user_id: string
  anime_id: string
  episodio_numero: number
  started_at: string
  ended_at: string | null
  last_seen_at: string
  segundos_visto: number
}

interface ActividadItem {
  id: string
  user_id: string
  email: string | null
  anime_id: string
  titulo: string | null
  episodio_numero: number
  started_at: string
  ended_at: string | null
  duracion_segundos: number | null
  segundos_visto: number
}

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
      return noAutorizado()
    }
    if (!esOwner(userId, email)) {
      return noAutorizado()
    }
    const ip = obtenerIP(req)
    const limite = await rateLimit({ clave: `actividad:${ip}`, maximo: 60, ventanaSegundos: 60 })
    if (!limite.permitido) {
      return respuestaLimite()
    }
    const supabase = createServerClient()
    const { data, error } = await supabase
      .from("sesiones")
      .select("*")
      .order("started_at", { ascending: false })
      .limit(200)
    if (error) {
      console.error("Error consultando actividad:", error.message)
      return errorInterno(error)
    }
    const sesiones = (data || []) as ActividadSesion[]
    const items: ActividadItem[] = []
    for (const sesion of sesiones) {
      const inicio = new Date(sesion.started_at).getTime()
      const fin = sesion.ended_at ? new Date(sesion.ended_at).getTime() : Date.now()
      const duracion =
        Number.isFinite(inicio) && Number.isFinite(fin)
          ? Math.max(0, Math.floor((fin - inicio) / 1000))
          : null
      let emailUsuario: string | null = null
      try {
        const respuestaUsuario = await supabase.auth.admin.getUserById(sesion.user_id)
        const datosUsuario = respuestaUsuario.data as unknown as {
          user?: { email?: string | null }
        } | null
        emailUsuario = datosUsuario?.user?.email ?? null
      } catch {
        emailUsuario = null
      }
      let titulo: string | null = null
      const { data: animeData } = await supabase
        .from("animes")
        .select("id, title_es, title_en")
        .eq("id", sesion.anime_id)
        .single()
      const anime = animeData as unknown as {
        title_es?: string | null
        title_en?: string | null
      } | null
      titulo = anime?.title_es || anime?.title_en || null
      items.push({
        id: sesion.id,
        user_id: sesion.user_id,
        email: emailUsuario,
        anime_id: sesion.anime_id,
        titulo: titulo,
        episodio_numero: sesion.episodio_numero,
        started_at: sesion.started_at,
        ended_at: sesion.ended_at,
        duracion_segundos: duracion,
        segundos_visto: sesion.segundos_visto || 0,
      })
    }
    return NextResponse.json({ ok: true, items })
  } catch (err) {
    return errorInterno(err)
  }
}

