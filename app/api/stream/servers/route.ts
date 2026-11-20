import { createAdminSupabaseClient } from "@/lib/server/supabase"
import { NextResponse } from "next/server"
import { rateLimit } from "@/lib/rate-limit"
import {
  buildServers,
  type StreamLang,
  type StreamServer,
  type SubtitleTrack,
} from "@/lib/streaming"
import { obtenerSubtituloEspanol } from "@/lib/subdl"
import { obtenerSlugAniZone, obtenerStreamAniZone, type SubtituloAniZone } from "@/lib/anizone"
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
const ID_ANIZONE = "aniline-hls"

interface ServerDescriptor {
  id: string
  name: string
  kind: StreamServer["kind"]
}

interface ResultadoControlado {
  hlsUrl: string | null
  subtitles: SubtitleTrack[]
}

function parseLang(value: string | null): StreamLang {
  return value === "dub" ? "dub" : "sub"
}

function idiomaEsEspanol(idioma: string): boolean {
  const limpio = idioma.trim().toLowerCase()
  return (
    limpio === "es" ||
    limpio === "spa" ||
    limpio.startsWith("es-") ||
    limpio.startsWith("es_") ||
    limpio.includes("spanish") ||
    limpio.includes("espa")
  )
}

function titulosBusqueda(titleEs: unknown, titleEn: unknown): string[] {
  const lista = [titleEn, titleEs]
    .filter((v): v is string => typeof v === "string" && v.trim().length > 0)
    .map((v) => v.trim())
  return Array.from(new Set(lista))
}

async function resolveHlsExterno(
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

async function buscarSubtituloSubdl(
  titulos: string[],
  numero: number
): Promise<SubtitleTrack | null> {
  for (const titulo of titulos) {
    try {
      const sub = await obtenerSubtituloEspanol(titulo, numero)
      if (sub) {
        return {
          src: `/api/stream/subs/vtt?u=${encodeURIComponent(sub.url)}&f=${encodeURIComponent(sub.formato)}`,
          label: "Español",
          lang: "es",
          default: true,
        }
      }
    } catch {
      // continuar con el siguiente titulo
    }
  }
  return null
}

function pistaAniZoneEspanol(subs: SubtituloAniZone[]): SubtitleTrack | null {
  const es = subs.find((s) => idiomaEsEspanol(s.idioma))
  if (!es) return null
  return {
    src: `/api/stream/anizone/seg?src=${encodeURIComponent(es.archivo)}&as=vtt`,
    label: "Español",
    lang: "es",
    default: true,
  }
}

function pistaAniZoneTraducida(subs: SubtituloAniZone[]): SubtitleTrack | null {
  if (subs.length === 0) return null
  const preferido =
    subs.find((s) => s.idioma.startsWith("en")) ||
    subs.find((s) => !idiomaEsEspanol(s.idioma)) ||
    subs[0]
  return {
    src: `/api/stream/subs/es?src=${encodeURIComponent(preferido.archivo)}`,
    label: "Español (auto)",
    lang: "es",
    default: true,
  }
}

async function resolverControlado(
  titulos: string[],
  numero: number
): Promise<ResultadoControlado> {
  const subdlPromise = buscarSubtituloSubdl(titulos, numero)
  const anizonePromise = (async (): Promise<{ m3u8: string | null; subs: SubtituloAniZone[] }> => {
    for (const titulo of titulos) {
      try {
        const { slug } = await obtenerSlugAniZone(titulo)
        if (!slug) continue
        const stream = await obtenerStreamAniZone(slug, numero)
        if (stream && stream.m3u8) {
          return { m3u8: stream.m3u8, subs: stream.subtitulos }
        }
      } catch {
        // probar siguiente titulo
      }
    }
    return { m3u8: null, subs: [] }
  })()

  const [subdl, anizone] = await Promise.all([subdlPromise, anizonePromise])

  const subtitles: SubtitleTrack[] = []
  const esNativa = pistaAniZoneEspanol(anizone.subs)
  const auto = esNativa ? null : pistaAniZoneTraducida(anizone.subs)
  const subAniZone = esNativa || auto

  if (anizone.m3u8) {
    if (subAniZone) {
      subtitles.push(subAniZone)
    }
    if (subdl) {
      subtitles.push({
        ...subdl,
        label: "Español (SubDL)",
        default: subtitles.length === 0,
      })
    }
  } else {
    if (subdl) {
      subtitles.push(subdl)
    } else if (subAniZone) {
      subtitles.push(subAniZone)
    }
  }

  const hlsUrl = anizone.m3u8
    ? `/api/stream/anizone/m3u8?src=${encodeURIComponent(anizone.m3u8)}`
    : null

  return { hlsUrl, subtitles }
}

export async function GET(req: Request) {
  const user_id = await usuarioAutenticado(req)
  if (!user_id) {
    return noAutorizado()
  }

  const ip = obtenerIP(req)
  const limite = await rateLimit({ clave: `stream:${ip}`, maximo: 60, ventanaSegundos: 60 })
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
        { ok: false, error: "Faltan parametros: slug, episode" },
        { status: 400 }
      )
    }

    if (!esSlugSeguro(slug)) {
      return NextResponse.json(
        { ok: false, error: "slug invalido" },
        { status: 400 }
      )
    }

    if (!esEnteroEnRango(Number(episodeParam), 1, 100000)) {
      return NextResponse.json(
        { ok: false, error: "Numero de episodio invalido" },
        { status: 400 }
      )
    }
    const numero = Number(episodeParam)

    const supabase = createAdminSupabaseClient()

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

    let nativeUrl: string | null = null
    if (hasNativeVideo && episode.video_url) {
      const { data: signed, error: signError } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(episode.video_url, 3600)
      if (!signError && signed) {
        nativeUrl = signed.signedUrl
      }
    }

    const titulos = titulosBusqueda(anime.title_es, anime.title_en)
    const controlado = await resolverControlado(titulos, numero)
    const hlsUrls: Record<string, string> = {}

    if (controlado.hlsUrl) {
      hlsUrls[ID_ANIZONE] = controlado.hlsUrl
    }

    let hlsExterno: string | null = null
    if (!controlado.hlsUrl && rawAnilistId !== null) {
      hlsExterno = await resolveHlsExterno(rawAnilistId, numero, lang)
      if (hlsExterno) {
        hlsUrls.hls = hlsExterno
      }
    }

    const baseServers = buildServers({
      anilistId: rawAnilistId,
      hasNativeVideo,
      hasYoutube,
    })
    const baseDescriptors: ServerDescriptor[] = baseServers.map((s) => ({
      id: s.id,
      name: s.name,
      kind: s.kind,
    }))

    const hlsServers: ServerDescriptor[] = []
    if (controlado.hlsUrl) {
      hlsServers.push({ id: ID_ANIZONE, name: "AniLine HD", kind: "hls" })
    } else if (hlsExterno) {
      hlsServers.push({ id: "hls", name: "HD", kind: "hls" })
    }

    const tieneFuenteControlada =
      !!controlado.hlsUrl ||
      !!nativeUrl ||
      (hlsExterno !== null && controlado.subtitles.length > 0)

    const nativos = baseDescriptors.filter((s) => s.kind === "native")
    const embeds = baseDescriptors.filter((s) => s.kind === "embed")
    const youtube = baseDescriptors.filter((s) => s.kind === "youtube")

    const descriptors: ServerDescriptor[] = tieneFuenteControlada
      ? [...hlsServers, ...nativos, ...youtube, ...embeds]
      : [...hlsServers, ...nativos, ...embeds, ...youtube]

    const hlsPrincipal = controlado.hlsUrl || hlsExterno

    return NextResponse.json({
      ok: true,
      anilistId: rawAnilistId,
      servers: descriptors,
      nativeUrl,
      youtubeUrl: episode.youtube_url || null,
      hlsUrl: hlsPrincipal,
      hlsUrls,
      subtitles: controlado.subtitles,
    })
  } catch (err) {
    return errorInterno(err)
  }
}