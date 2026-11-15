import { createServerClient } from "@/lib/supabase"
import { NextResponse, after } from "next/server"
import { rateLimit } from "@/lib/rate-limit"
import {
  buildServers,
  type StreamLang,
  type StreamServer,
  type SubtitleTrack,
} from "@/lib/streaming"
import { obtenerSlugAniZone, obtenerStreamAniZone, probarAccesoAniZone } from "@/lib/anizone"
import { obtenerSubtituloEspanol } from "@/lib/subdl"
import { traducirVttAEspanol } from "@/lib/translate"
import { aVtt } from "@/lib/subtitle-convert"
import {
  obtenerIP,
  usuarioAutenticado,
  esSlugSeguro,
  esEnteroEnRango,
  respuestaLimite,
  noAutorizado,
  errorInterno,
} from "@/lib/security"

const BUCKET = "episode-videos"

interface ServerDescriptor {
  id: string
  name: string
  kind: StreamServer["kind"]
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
  const user_id = await usuarioAutenticado(req)
  if (!user_id) {
    return noAutorizado()
  }

  const ip = obtenerIP(req)
  const limite = rateLimit({ clave: `stream:${ip}`, maximo: 60, ventanaSegundos: 60 })
  if (!limite.permitido) {
    return respuestaLimite()
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

    if (!esSlugSeguro(slug)) {
      return NextResponse.json(
        { ok: false, error: "slug inválido" },
        { status: 400 }
      )
    }

    if (!esEnteroEnRango(Number(episodeParam), 1, 100000)) {
      return NextResponse.json(
        { ok: false, error: "Número de episodio inválido" },
        { status: 400 }
      )
    }
    const numero = Number(episodeParam)

    const supabase = createServerClient()

    const { data: anime, error: animeError } = await supabase
      .from("animes")
      .select("id, slug, anilist_id, title_es, title_en")
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
        : null

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

    const hlsUrls: Record<string, string> = {}
    const subtitulos: SubtitleTrack[] = []

    let debugSubEs: {
      titulo: string
      slug: boolean
      stream: boolean
      subdlKey: boolean
      estadoAniZone: number | null
    } | null = null

    if (rawAnilistId !== null && lang === "sub") {
      const titulo = (anime.title_en || anime.title_es || "").trim()
      const estadoAniZone = await probarAccesoAniZone()
      debugSubEs = {
        titulo,
        slug: false,
        stream: false,
        subdlKey: !!process.env.SUBDL_API_KEY,
        estadoAniZone,
      }
      if (titulo) {
        const slugAz = await obtenerSlugAniZone(titulo)
        debugSubEs.slug = !!slugAz
        if (slugAz) {
          const streamAz = await obtenerStreamAniZone(slugAz, numero)
          debugSubEs.stream = !!streamAz
          if (streamAz) {
            hlsUrls["sub-es"] = `/api/stream/anizone/m3u8?src=${encodeURIComponent(streamAz.m3u8)}`

            const fuenteEn = streamAz.subtitulos.find(
              (s) => s.idioma.startsWith("en") || /^ingles/i.test(s.titulo)
            )
            if (fuenteEn) {
              subtitulos.push({
                src: `/api/stream/subs/es?src=${encodeURIComponent(fuenteEn.archivo)}`,
                label: "Español",
                lang: "es",
                default: true,
              })
              subtitulos.push({
                src: `/api/stream/anizone/seg?as=vtt&src=${encodeURIComponent(fuenteEn.archivo)}`,
                label: "Inglés",
                lang: "en",
              })

              const archivoEn = fuenteEn.archivo
              after(async () => {
                try {
                  const resSub = await fetch(archivoEn, {
                    headers: { "User-Agent": "Mozilla/5.0 (compatible; AniLineProxy)" },
                    signal: AbortSignal.timeout(30000),
                  })
                  if (!resSub.ok) return
                  const crudo = await resSub.text()
                  const formato = new URL(archivoEn).pathname
                    .toLowerCase()
                    .endsWith(".ass")
                    ? "ass"
                    : "srt"
                  const vttEn = aVtt(crudo, formato)
                  await traducirVttAEspanol(archivoEn, vttEn)
                } catch {
                  // el precalentamiento no debe romper la respuesta
                }
              })
            }

            const espanol = await obtenerSubtituloEspanol(titulo, numero)
            if (espanol) {
              subtitulos.unshift({
                src: `/api/stream/subs/vtt?u=${encodeURIComponent(espanol.url)}&f=${espanol.formato}`,
                label: "Español",
                lang: "es",
                default: true,
              })
            }
            descriptors.unshift({ id: "sub-es", name: "Sub español", kind: "hls" })
          }
        }
      }
    }

    return NextResponse.json({
      ok: true,
      anilistId: rawAnilistId,
      servers: descriptors,
      nativeUrl,
      youtubeUrl: episode.youtube_url || null,
      hlsUrl,
      hlsUrls,
      subtitles: subtitulos,
      debugSubEs,
    })
  } catch (err) {
    return errorInterno(err)
  }
}
