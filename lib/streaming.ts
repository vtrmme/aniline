export type ServerKind = "native" | "youtube" | "embed" | "hls"

export type StreamLang = "sub" | "dub"

export type SubtitleLang = "es" | "en"

export interface StreamServer {
  id: string
  name: string
  kind: ServerKind
  getEmbedUrl?: (anilistId: number, episode: number, lang: StreamLang, subLang?: SubtitleLang) => string
}

export interface EmbedProvider {
  id: string
  name: string
  getEmbedUrl: (anilistId: number, episode: number, lang: StreamLang, subLang?: SubtitleLang) => string
}

const SUBTITULOS_POR_IDIOMA: Record<string, SubtitleLang> = {
  es: "es",
  en: "en",
}

export function getSubtituloLang(lang: string | undefined): SubtitleLang {
  const clave = lang === "en" ? "en" : "es"
  return SUBTITULOS_POR_IDIOMA[clave]
}

export function getFallbackSubtituloLang(sub: SubtitleLang): SubtitleLang {
  return sub === "es" ? "en" : "es"
}

export function versionStream(lang: StreamLang, subLang?: SubtitleLang): string {
  if (lang === "dub") return "dub"
  return subLang ?? "sub"
}

export interface EpisodeServersResponse {
  ok: boolean
  servers: StreamServer[]
  hlsUrl?: string | null
  error?: string
}

const EMBED_PROVIDERS: EmbedProvider[] = [
  {
    id: "vidhawk",
    name: "VidHawk",
    getEmbedUrl: (anilistId, episode, lang, subLang) =>
      `https://vidhawk.buzz/embed/ani/${anilistId}/${episode}/${versionStream(lang, subLang)}`,
  },
  {
    id: "megaplay",
    name: "MegaPlay",
    getEmbedUrl: (anilistId, episode, lang, subLang) =>
      `https://megaplay.buzz/stream/ani/${anilistId}/${episode}/${versionStream(lang, subLang)}`,
  },
]

function getEnabledProviderIds(): string[] {
  const raw = process.env.NEXT_PUBLIC_STREAM_PROVIDERS
  if (!raw || !raw.trim()) {
    return EMBED_PROVIDERS.map((p) => p.id)
  }
  return raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter((s) => s.length > 0)
}

export function getEmbedProviders(): EmbedProvider[] {
  const enabled = getEnabledProviderIds()
  return EMBED_PROVIDERS.filter((p) => enabled.includes(p.id))
}

export interface BuildServersParams {
  anilistId: number | null
  hasNativeVideo: boolean
  hasYoutube: boolean
}

export function buildServers(params: BuildServersParams): StreamServer[] {
  const servers: StreamServer[] = []

  if (params.hasNativeVideo) {
    servers.push({ id: "supabase", name: "AniLine", kind: "native" })
  }

  if (params.anilistId !== null) {
    for (const provider of getEmbedProviders()) {
      servers.push({
        id: provider.id,
        name: provider.name,
        kind: "embed",
        getEmbedUrl: provider.getEmbedUrl,
      })
    }
  }

  if (params.hasYoutube) {
    servers.push({ id: "youtube", name: "YouTube", kind: "youtube" })
  }

  return servers
}

export function getEmbedUrlFor(
  server: StreamServer,
  anilistId: number,
  episode: number,
  lang: StreamLang,
  subLang?: SubtitleLang
): string | null {
  if (server.kind !== "embed" || !server.getEmbedUrl) return null
  return server.getEmbedUrl(anilistId, episode, lang, subLang)
}

export function getEmbedUrlById(
  serverId: string,
  anilistId: number,
  episode: number,
  lang: StreamLang,
  subLang?: SubtitleLang
): string | null {
  const provider = getEmbedProviders().find((p) => p.id === serverId)
  return provider ? provider.getEmbedUrl(anilistId, episode, lang, subLang) : null
}

const SERVER_STORAGE_PREFIX = "aniline-server:"

export function loadStoredServer(key: string): string | null {
  if (typeof window === "undefined") return null
  try {
    return window.localStorage.getItem(SERVER_STORAGE_PREFIX + key)
  } catch {
    return null
  }
}

export function storeServer(key: string, serverId: string): void {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(SERVER_STORAGE_PREFIX + key, serverId)
  } catch {
    // localStorage no disponible: se ignora
  }
}
