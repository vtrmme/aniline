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
} from "@/lib/security"

async function getUserId(req: NextRequest): Promise<string | null> {
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  })
  return token?.sub || null
}

interface HistorialEntry {
  anime_id: string
  episodio_numero: number
  segundos?: number
}

export async function GET(req: NextRequest) {
  try {
    const user_id = await getUserId(req)
    if (!user_id) {
      return NextResponse.json({ ok: true, items: [] })
    }

    const ip = obtenerIP(req)
    const limite = rateLimit({ clave: `historial:${ip}`, maximo: 120, ventanaSegundos: 60 })
    if (!limite.permitido) {
      return respuestaLimite()
    }

    const { searchParams } = new URL(req.url)
    const anime_id = searchParams.get("anime_id")
    const episodio_numero = searchParams.get("episodio_numero")

    if (anime_id && !esUUID(anime_id)) {
      return NextResponse.json(
        { ok: false, error: "anime_id inválido." },
        { status: 400 }
      )
    }

    const supabase = createServerClient()

    let query = supabase
      .from("historial")
      .select("*")
      .eq("user_id", user_id)
      .order("visto_en", { ascending: false })

    if (anime_id) {
      query = query.eq("anime_id", anime_id)
    }
    if (episodio_numero) {
      const numero = Number(episodio_numero)
      if (!Number.isInteger(numero) || numero < 1 || numero > 100000) {
        return NextResponse.json(
          { ok: false, error: "episodio_numero inválido." },
          { status: 400 }
        )
      }
      query = query.eq("episodio_numero", numero)
    }

    const { data, error } = await query

    if (error) {
      console.error("Error consultando historial:", error.message)
      return NextResponse.json(
        { ok: false, error: "No se pudo consultar el historial." },
        { status: 500 }
      )
    }

    const item =
      anime_id && episodio_numero
        ? (data || []).find(
            (h: HistorialEntry) =>
              h.anime_id === anime_id && h.episodio_numero === Number(episodio_numero)
          )
        : null

    return NextResponse.json({
      ok: true,
      items: data || [],
      inList: !!item,
      episodio_numero: item?.episodio_numero ? String(item.episodio_numero) : null,
      segundos: typeof item?.segundos === "number" ? item.segundos : 0,
    })
  } catch (err) {
    return errorInterno(err)
  }
}

interface CuerpoHistorial {
  anime_id?: unknown
  episodio_numero?: unknown
  segundos?: unknown
}

export async function POST(req: Request) {
  try {
    if (!verificarOrigen(req)) {
      return NextResponse.json(
        { ok: false, error: "Origen no permitido." },
        { status: 403 }
      )
    }

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

    const ip = obtenerIP(req)
    const limite = rateLimit({ clave: `historial-post:${ip}`, maximo: 60, ventanaSegundos: 60 })
    if (!limite.permitido) {
      return respuestaLimite()
    }

    if (!cuerpoDentroDelLimite(req)) {
      return NextResponse.json(
        { ok: false, error: "Cuerpo de la solicitud demasiado grande." },
        { status: 413 }
      )
    }

    const body = (await req.json()) as CuerpoHistorial
    const { anime_id, episodio_numero, segundos } = body

    if (!anime_id || !episodio_numero) {
      return NextResponse.json(
        { ok: false, error: "Faltan parámetros: anime_id, episodio_numero" },
        { status: 400 }
      )
    }

    if (!esUUID(anime_id)) {
      return NextResponse.json(
        { ok: false, error: "anime_id inválido." },
        { status: 400 }
      )
    }

    if (!esEnteroEnRango(episodio_numero, 1, 100000)) {
      return NextResponse.json(
        { ok: false, error: "episodio_numero inválido." },
        { status: 400 }
      )
    }

    const segundosLimpios =
      typeof segundos === "number" && Number.isFinite(segundos)
        ? Math.min(86400, Math.max(0, Math.floor(segundos)))
        : 0

    const supabase = createServerClient()

    const { error } = await supabase.from("historial").upsert(
      {
        user_id,
        anime_id,
        episodio_numero,
        segundos: segundosLimpios,
        visto_en: new Date().toISOString(),
      },
      { onConflict: "user_id,anime_id,episodio_numero" }
    )

    if (error) {
      console.error("Error guardando historial:", error.message)
      return NextResponse.json(
        { ok: false, error: "No se pudo guardar el historial." },
        { status: 500 }
      )
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    return errorInterno(err)
  }
}
