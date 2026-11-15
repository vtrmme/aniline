import { NextResponse } from "next/server"
import { rateLimit } from "@/lib/rate-limit"
import { getSubtituloLang, getFallbackSubtituloLang, type StreamLang, type SubtitleLang } from "@/lib/streaming"
import {
  obtenerIP,
  usuarioAutenticado,
  respuestaLimite,
  noAutorizado,
  errorInterno,
} from "@/lib/security"

function parseLang(value: string | null): StreamLang {
  return value === "dub" ? "dub" : "sub"
}

interface ResolverResponse {
  m3u8?: string
  stream?: string
  sources?: Array<{ url?: string }>
}

async function resolverHls(
  anilistId: number,
  episode: number,
  lang: StreamLang,
  subLang?: SubtitleLang
): Promise<string | null> {
  const baseUrl = process.env.STREAM_RESOLVER_URL
  if (!baseUrl || !baseUrl.trim()) {
    return null
  }

  const versionesIntentar: string[] =
    lang === "sub" && subLang
      ? [subLang, getFallbackSubtituloLang(subLang)]
      : [lang === "dub" ? "dub" : (subLang ?? "sub")]

  for (const version of versionesIntentar) {
    let url: URL
    try {
      url = new URL("/watch", baseUrl.trim())
    } catch {
      return null
    }
    url.searchParams.set("anilistId", String(anilistId))
    url.searchParams.set("episode", String(episode))
    url.searchParams.set("lang", version)

    const res = await fetch(url.toString(), { signal: AbortSignal.timeout(8000) })
    if (!res.ok) continue

    const json = (await res.json()) as ResolverResponse
    const resolved = json.m3u8 || json.stream || json.sources?.[0]?.url || null
    if (resolved) return resolved
  }

  return null
}

export async function GET(req: Request) {
  const user_id = await usuarioAutenticado(req)
  if (!user_id) {
    return noAutorizado()
  }

  const ip = obtenerIP(req)
  const limite = rateLimit({ clave: `resolve:${ip}`, maximo: 30, ventanaSegundos: 60 })
  if (!limite.permitido) {
    return respuestaLimite()
  }

  try {
    const { searchParams } = new URL(req.url)
    const anilistIdParam = searchParams.get("anilistId")
    const episodeParam = searchParams.get("episode")
    const lang = parseLang(searchParams.get("lang"))
    const subParam = searchParams.get("sub")
    const subLang: SubtitleLang | null =
      subParam === "es" || subParam === "en" ? subParam : getSubtituloLang("es")

    if (!anilistIdParam || !episodeParam) {
      return NextResponse.json(
        { ok: false, error: "Faltan parámetros: anilistId, episode" },
        { status: 400 }
      )
    }

    const anilistId = Number(anilistIdParam)
    const episode = Number(episodeParam)

    if (!Number.isInteger(anilistId) || anilistId < 1 || anilistId > 2147483647) {
      return NextResponse.json(
        { ok: false, error: "anilistId inválido" },
        { status: 400 }
      )
    }
    if (!Number.isInteger(episode) || episode < 1 || episode > 100000) {
      return NextResponse.json(
        { ok: false, error: "Número de episodio inválido" },
        { status: 400 }
      )
    }

    const baseUrl = process.env.STREAM_RESOLVER_URL
    if (!baseUrl || !baseUrl.trim()) {
      return NextResponse.json({
        ok: true,
        url: null,
        error: "El resolutor de streams no está configurado en el servidor.",
      })
    }

    const hlsUrl = await resolverHls(anilistId, episode, lang, subLang)

    return NextResponse.json({ ok: true, url: hlsUrl })
  } catch (err) {
    return errorInterno(err)
  }
}
