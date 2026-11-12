import { NextResponse } from "next/server"
import { rateLimit } from "@/lib/rate-limit"
import { syncCatalog } from "@/lib/catalog"

function obtenerIP(req: Request): string {
  const headers = req.headers as unknown as Record<string, string>
  return (
    headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
    headers["x-real-ip"] ||
    "desconocido"
  )
}

export async function POST(req: Request) {
  const ip = obtenerIP(req)
  const limite = rateLimit({ clave: `sync:${ip}`, maximo: 2, ventanaSegundos: 3600 })
  if (!limite.permitido) {
    return NextResponse.json(
      { ok: false, error: "Sincronización limitada. Intenta de nuevo más tarde." },
      { status: 429 }
    )
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
    const message = err instanceof Error ? err.message : "Error desconocido"
    return NextResponse.json(
      { ok: false, error: message },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    message:
      "Endpoint de sincronización. Usa POST con ?meta=N para sincronizar hasta N animes.",
  })
}
