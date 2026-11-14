import { createServerClient } from "@/lib/supabase"
import { NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"
import { NextRequest } from "next/server"
import { rateLimit } from "@/lib/rate-limit"
import { obtenerIP, esOwner, respuestaLimite, errorInterno, noAutorizado } from "@/lib/security"

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
    const limite = rateLimit({ clave: `usuarios:${ip}`, maximo: 30, ventanaSegundos: 60 })
    if (!limite.permitido) {
      return respuestaLimite()
    }
    const supabase = createServerClient()
    let totalUsuarios = 0
    let pagina = 1
    const porPagina = 1000
    let hayMas = true
    let guardado = 0
    while (hayMas && guardado < 10) {
      const respuesta = await supabase.auth.admin.listUsers({
        page: pagina,
        perPage: porPagina,
      })
      const datosAdmin = respuesta.data as unknown as { users?: unknown[] } | null
      const usuariosPagina = (datosAdmin?.users as unknown as {
        id: string
        email: string
      }[]) || []
      totalUsuarios += usuariosPagina.length
      if (usuariosPagina.length < porPagina) {
        hayMas = false
      }
      pagina += 1
      guardado += 1
    }
    return NextResponse.json({ ok: true, count: totalUsuarios })
  } catch (err) {
    return errorInterno(err)
  }
}

