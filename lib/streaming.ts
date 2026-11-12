export type ServerKind = "native" | "youtube" | "embed" | "hls"

export type StreamLang = "sub" | "dub"

export interface StreamServer {
  id: string
  name: string
  kind: ServerKind
  getEmbedUrl?: (anilistId: number, episode: number, lang: StreamLang) => string
}

export interface EmbedProvider {
  id: string
  name: string
  getEmbedUrl: (anilistId: number, episode: number, lang: StreamLang) => string
}

export interface EpisodeServersResponse {
  ok: boolean
  servers: StreamServer[]
  hlsUrl?: string | null
  error?: string
}

const EMBED_PROVIDERS: EmbedProvider[] = [
  {
    id: "megaplay",
    name: "MegaPlay",
    getEmbedUrl: (anilistId, episode, lang) =>
      `https://megaplay.buzz/stream/ani/${anilistId}/${episode}/${lang}`,
  },
  {
    id: "vidplus",
    name: "VidPlus",
    getEmbedUrl: (anilistId, episode, lang) =>
      `https://player.vidplus.to/embed/anime/${anilistId}/${episode}?dub=${lang === "dub"}`,
  },
  {
    id: "vidhawk",
    name: "VidHawk",
    getEmbedUrl: (anilistId, episode, lang) =>
      `https://vidhawk.buzz/embed/ani/${anilistId}/${episode}/${lang}`,
  },
  {
    id: "moviepire",
    name: "Moviepire",
    getEmbedUrl: (anilistId, episode) =>
      `https://video.moviepire.co/stream/anime/${anilistId}/${episode}`,
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
  lang: StreamLang
): string | null {
  if (server.kind !== "embed" || !server.getEmbedUrl) return null
  return server.getEmbedUrl(anilistId, episode, lang)
}

export function getEmbedUrlById(
  serverId: string,
  anilistId: number,
  episode: number,
  lang: StreamLang
): string | null {
  const provider = getEmbedProviders().find((p) => p.id === serverId)
  return provider ? provider.getEmbedUrl(anilistId, episode, lang) : null
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
