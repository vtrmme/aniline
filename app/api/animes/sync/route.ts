import { NextResponse } from "next/server"
import { rateLimit } from "@/lib/rate-limit"
import { syncCatalog } from "@/lib/catalog"
import { obtenerIP, verificarBearerAdmin, respuestaLimite, errorInterno } from "@/lib/security"

export async function POST(req: Request) {
  if (!verificarBearerAdmin(req)) {
    return NextResponse.json({ ok: false, error: "No autorizado." }, { status: 401 })
  }

  const ip = obtenerIP(req)
  const limite = rateLimit({ clave: `sync:${ip}`, maximo: 2, ventanaSegundos: 3600 })
  if (!limite.permitido) {
    return respuestaLimite()
  }

  try {
    const { searchParams } = new URL(req.url)
    const metaParam = searchParams.get("meta")
    const meta = metaParam ? Number(metaParam) : 50

    if (!Number.isInteger(meta) || meta < 1 || meta > 500) {
      return NextResponse.json(
        { ok: false, error: "Parámetro meta inválido (entre 1 y 500)." },
        { status: 400 }
      )
    }

    const result = await syncCatalog({ meta })

    return NextResponse.json({
      ok: true,
      message: "Sincronización completada",
      ...result,
    })
  } catch (err) {
    return errorInterno(err)
  }
}

export async function GET() {
  return NextResponse.json(
    { ok: false, error: "Método no permitido." },
    { status: 405 }
  )
}
