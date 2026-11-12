import { createServerClient } from "@/lib/supabase"
import { NextResponse } from "next/server"
import { rateLimit } from "@/lib/rate-limit"
import { buildServers, type StreamLang, type StreamServer } from "@/lib/streaming"

const BUCKET = "episode-videos"

interface ServerDescriptor {
  id: string
  name: string
  kind: StreamServer["kind"]
}

function obtenerIP(req: Request): string {
  const headers = req.headers as unknown as Record<string, string>
  return (
    headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
    headers["x-real-ip"] ||
    "desconocido"
  )
}

function parseLang(value: string | null): StreamLang {
  return value === "dub" ? "dub" : "sub"
}

async function resolveHls(
  anilistId: number,
  episode: number,
  lang: StreamLang
): Promise<string | null> {
  const baseUrl = process.env.STREAM_RESOLVER_URL
  if (!baseUrl || !baseUrl.trim()) return null

  try {
    const url = new URL("/watch", baseUrl.trim())
    url.searchParams.set("anilistId", String(anilistId))
    url.searchParams.set("episode", String(episode))
    url.searchParams.set("lang", lang)

    const res = await fetch(url.toString(), { signal: AbortSignal.timeout(8000) })
    if (!res.ok) return null

    const json = (await res.json()) as {
      m3u8?: string
      stream?: string
      sources?: Array<{ url?: string }>
    }

    return json.m3u8 || json.stream || json.sources?.[0]?.url || null
  } catch {
    return null
  }
}

export async function GET(req: Request) {
  const ip = obtenerIP(req)
  const limite = rateLimit({ clave: `stream:${ip}`, maximo: 60, ventanaSegundos: 60 })
  if (!limite.permitido) {
    return NextResponse.json(
      { ok: false, error: "Demasiadas solicitudes. Intenta de nuevo más tarde." },
      { status: 429 }
    )
  }

  try {
    const { searchParams } = new URL(req.url)
    const slug = searchParams.get("slug")
    const episodeParam = searchParams.get("episode")
    const lang = parseLang(searchParams.get("lang"))

    if (!slug || !episodeParam) {
      return NextResponse.json(
        { ok: false, error: "Faltan parámetros: slug, episode" },
        { status: 400 }
      )
    }

    const numero = Number(episodeParam)
    if (!Number.isInteger(numero) || numero < 1) {
      return NextResponse.json(
        { ok: false, error: "Número de episodio inválido" },
        { status: 400 }
      )
    }

    const supabase = createServerClient()

    const { data: anime, error: animeError } = await supabase
      .from("animes")
      .select("id, slug, anilist_id")
      .eq("slug", slug)
      .single()

    if (animeError || !anime) {
      return NextResponse.json(
        { ok: false, error: "Anime no encontrado" },
        { status: 404 }
      )
    }

    const { data: episode, error: epError } = await supabase
      .from("episodes")
      .select("numero, video_url, youtube_url")
      .eq("anime_id", anime.id)
      .eq("numero", numero)
      .single()

    if (epError || !episode) {
      return NextResponse.json(
        { ok: false, error: "Episodio no encontrado" },
        { status: 404 }
      )
    }

    const rawAnilistId =
      typeof anime.anilist_id === "number" && Number.isInteger(anime.anilist_id)
        ? anime.anilist_id
        : parseAnilistIdFromSlug(anime.slug)

    const hasNativeVideo = !!episode.video_url
    const hasYoutube = !!episode.youtube_url

    const servers = buildServers({
      anilistId: rawAnilistId,
      hasNativeVideo,
      hasYoutube,
    })

    let nativeUrl: string | null = null
    if (hasNativeVideo && episode.video_url) {
      const { data: signed, error: signError } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(episode.video_url, 3600)
      if (!signError && signed) {
        nativeUrl = signed.signedUrl
      }
    }

    let hlsUrl: string | null = null
    if (rawAnilistId !== null) {
      hlsUrl = await resolveHls(rawAnilistId, numero, lang)
    }

    const descriptors: ServerDescriptor[] = servers.map((s) => ({
      id: s.id,
      name: s.name,
      kind: s.kind,
    }))

    if (hlsUrl) {
      descriptors.unshift({ id: "hls", name: "HD", kind: "hls" })
    }

    return NextResponse.json({
      ok: true,
      anilistId: rawAnilistId,
      servers: descriptors,
      nativeUrl,
      youtubeUrl: episode.youtube_url || null,
      hlsUrl,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido"
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}

function parseAnilistIdFromSlug(slug: string): number | null {
  const match = /^(\d+)-/.exec(slug)
  if (!match) return null
  const value = Number(match[1])
  return Number.isInteger(value) ? value : null
}
