"use client"

import "plyr/dist/plyr.css"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Hls from "hls.js"
import { extractYouTubeId } from "@/components/VideoPlayer"
import {
  getEmbedUrlById,
  loadStoredServer,
  storeServer,
  type StreamLang,
} from "@/lib/streaming"

export interface StreamServerInfo {
  id: string
  name: string
  kind: "native" | "youtube" | "embed" | "hls"
}

export interface SubtitleTrackInfo {
  src: string
  label: string
  lang: string
  default?: boolean
}

interface EpisodePlayerProps {
  servers: StreamServerInfo[]
  anilistId: number | null
  episode: number
  lang: StreamLang
  onLangChange: (lang: StreamLang) => void
  nativeUrl: string | null
  youtubeUrl: string | null
  hlsUrl: string | null
  hlsUrls?: Record<string, string>
  subtitles?: SubtitleTrackInfo[]
  storageKey: string
  initialSeconds?: number
  onProgress?: (seconds: number) => void
  onMarkWatched?: () => void
  labels: {
    markWatched: string
    sub: string
    dub: string
    notAvailable: string
    invalidYoutube: string
    noServers: string
  }
}

const PROGRESS_INTERVAL_MS = 5000
const EMBED_INTERACTION_MS = 30000

export function EpisodePlayer({
  servers,
  anilistId,
  episode,
  lang,
  onLangChange,
  nativeUrl,
  youtubeUrl,
  hlsUrl,
  hlsUrls,
  subtitles,
  storageKey,
  initialSeconds = 0,
  onProgress,
  onMarkWatched,
  labels,
}: EpisodePlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const playerRef = useRef<{ destroy(): void } | null>(null)
  const lastProgressRef = useRef(0)
  const embedActiveRef = useRef(false)
  const embedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const onProgressRef = useRef(onProgress)
  const onMarkWatchedRef = useRef(onMarkWatched)
  const initialSecondsRef = useRef(initialSeconds)

  const [manualId, setManualId] = useState<string | null>(null)

  useEffect(() => {
    onProgressRef.current = onProgress
    onMarkWatchedRef.current = onMarkWatched
    initialSecondsRef.current = initialSeconds
  })

  const storedServerId = useMemo(() => loadStoredServer(storageKey), [storageKey])

  const getSrcFor = useCallback(
    (server: StreamServerInfo): string | null => {
      if (server.kind === "native") return nativeUrl
      if (server.kind === "hls") {
        const propia = hlsUrls?.[server.id]
        return typeof propia === "string" ? propia : hlsUrl
      }
      if (server.kind === "youtube") return youtubeUrl
      if (server.kind === "embed" && anilistId !== null) {
        return getEmbedUrlById(server.id, anilistId, episode, lang)
      }
      return null
    },
    [nativeUrl, hlsUrl, hlsUrls, youtubeUrl, anilistId, episode, lang]
  )

  const selected = useMemo(() => {
    if (servers.length === 0) return null
    const preferred = manualId ?? storedServerId
    if (preferred) {
      const match = servers.find((s) => s.id === preferred)
      if (match && getSrcFor(match)) return match
    }
    const primeroValido = servers.find((s) => getSrcFor(s))
    return primeroValido || servers[0]
  }, [servers, manualId, storedServerId, getSrcFor])

  const handleSelect = useCallback(
    (id: string) => {
      setManualId(id)
      storeServer(storageKey, id)
    },
    [storageKey]
  )

  const reportProgress = useCallback((seconds: number) => {
    const now = Date.now()
    if (now - lastProgressRef.current < PROGRESS_INTERVAL_MS) return
    lastProgressRef.current = now
    onProgressRef.current?.(Math.floor(seconds))
  }, [])

  const markWatched = useCallback(() => {
    onMarkWatchedRef.current?.()
  }, [])

  const currentSrc = useMemo(() => (selected ? getSrcFor(selected) : null), [selected, getSrcFor])
  const anyAvailable = useMemo(() => servers.some((s) => !!getSrcFor(s)), [servers, getSrcFor])

  const pistas = useMemo(() => {
    if (!selected) return []
    if ((selected.kind === "hls" || selected.kind === "native") && Array.isArray(subtitles)) {
      return subtitles
    }
    return []
  }, [selected, subtitles])

  useEffect(() => {
    if (!selected) return
    if (selected.kind !== "native" && selected.kind !== "hls") return
    const video = videoRef.current
    if (!video || !currentSrc) return

    let hls: Hls | null = null
    let destroyed = false

    const startPlyr = (): void => {
      if (destroyed || !videoRef.current) return
      import("plyr").then((plyrModule) => {
        if (destroyed || !videoRef.current) return
        const Plyr = plyrModule.default
        playerRef.current = new Plyr(videoRef.current, {
          controls: [
            "play-large",
            "play",
            "progress",
            "current-time",
            "mute",
            "volume",
            "captions",
            "fullscreen",
          ],
        })
      })
    }

    const isHlsSource =
      selected.kind === "hls" || /\.m3u8(\?|$)/.test(currentSrc)

    if (isHlsSource) {
      if (video.canPlayType("application/vnd.apple.mpegurl")) {
        video.src = currentSrc
        startPlyr()
      } else if (Hls.isSupported()) {
        hls = new Hls({
          enableWorker: true,
          backBufferLength: 90,
        })
        let recuperacionesMedia = 0
        hls.on(Hls.Events.ERROR, (_event, data) => {
          if (!data.fatal || !hls) return
          if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
            hls.startLoad()
          } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR && recuperacionesMedia < 2) {
            recuperacionesMedia += 1
            hls.recoverMediaError()
          } else {
            hls.destroy()
          }
        })
        hls.loadSource(currentSrc)
        hls.attachMedia(video)
        hls.on(Hls.Events.MANIFEST_PARSED, startPlyr)
      }
    } else {
      video.src = currentSrc
      startPlyr()
    }

    const handleTimeUpdate = (): void => {
      reportProgress(video.currentTime)
    }
    const handleEnded = (): void => {
      markWatched()
    }
    const handleLoadedMetadata = (): void => {
      const seconds = initialSecondsRef.current
      if (
        seconds > 10 &&
        Number.isFinite(video.duration) &&
        video.duration > seconds + 30
      ) {
        video.currentTime = seconds
      }
    }

    video.addEventListener("timeupdate", handleTimeUpdate)
    video.addEventListener("ended", handleEnded)
    video.addEventListener("loadedmetadata", handleLoadedMetadata)

    return () => {
      destroyed = true
      video.removeEventListener("timeupdate", handleTimeUpdate)
      video.removeEventListener("ended", handleEnded)
      video.removeEventListener("loadedmetadata", handleLoadedMetadata)
      if (playerRef.current) {
        playerRef.current.destroy()
        playerRef.current = null
      }
      if (hls) {
        hls.destroy()
      }
      video.removeAttribute("src")
      video.load()
    }
  }, [selected, currentSrc, reportProgress, markWatched])

  useEffect(() => {
    return () => {
      if (embedTimerRef.current) {
        clearTimeout(embedTimerRef.current)
      }
      if (embedActiveRef.current) {
        markWatched()
      }
    }
  }, [markWatched])

  useEffect(() => {
    const handlePageHide = (): void => {
      if (embedActiveRef.current) {
        markWatched()
      } else if (videoRef.current && videoRef.current.currentTime > 10) {
        onProgressRef.current?.(Math.floor(videoRef.current.currentTime))
      }
    }
    const handleVisibility = (): void => {
      if (document.visibilityState === "hidden") {
        handlePageHide()
      }
    }
    window.addEventListener("pagehide", handlePageHide)
    document.addEventListener("visibilitychange", handleVisibility)
    return () => {
      window.removeEventListener("pagehide", handlePageHide)
      document.removeEventListener("visibilitychange", handleVisibility)
    }
  }, [markWatched])

  const registerEmbedInteraction = useCallback(() => {
    if (embedActiveRef.current) return
    embedActiveRef.current = true
    if (embedTimerRef.current) clearTimeout(embedTimerRef.current)
    embedTimerRef.current = setTimeout(() => {
      markWatched()
    }, EMBED_INTERACTION_MS)
  }, [markWatched])

  if (servers.length === 0) {
    return (
      <div className="bg-gray-800 rounded-xl overflow-hidden shadow-2xl aspect-video w-full flex items-center justify-center">
        <p className="text-gray-400 text-center p-8">{labels.noServers}</p>
      </div>
    )
  }

  if (!selected || !currentSrc) {
    return (
      <div className="bg-gray-800 rounded-xl overflow-hidden shadow-2xl aspect-video w-full flex items-center justify-center">
        {anyAvailable ? (
          <div className="flex flex-col items-center gap-3 text-gray-400">
            <div className="h-10 w-10 animate-pulse rounded-full bg-[var(--surface)]" />
            <p className="text-sm">Cargando reproductor...</p>
          </div>
        ) : (
          <p className="text-gray-400 text-center p-8">{labels.notAvailable}</p>
        )}
      </div>
    )
  }

  const showMarkWatched = selected.kind === "embed" || selected.kind === "youtube"
  const supportsLang = anilistId !== null && selected.kind === "embed"

  return (
    <div>
      <div className="flex items-center gap-2 overflow-x-auto pb-2 -mt-1 mb-3">
        {servers.map((server) => (
          <button
            key={server.id}
            onClick={() => handleSelect(server.id)}
            className={`shrink-0 px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
              selected.id === server.id
                ? "bg-red-600 text-white"
                : "bg-gray-800 text-gray-300 hover:bg-gray-700"
            }`}
          >
            {server.name}
          </button>
        ))}
        <div className="ml-auto shrink-0 flex items-center gap-1 bg-gray-800 rounded-lg p-1">
          <button
            onClick={() => onLangChange("sub")}
            className={`px-2 py-1 text-xs font-semibold rounded transition ${
              lang === "sub" ? "bg-gray-600 text-white" : "text-gray-400 hover:text-white"
            }`}
          >
            {labels.sub}
          </button>
          <button
            onClick={() => onLangChange("dub")}
            className={`px-2 py-1 text-xs font-semibold rounded transition ${
              lang === "dub" ? "bg-gray-600 text-white" : "text-gray-400 hover:text-white"
            }`}
          >
            {labels.dub}
          </button>
        </div>
      </div>

      <div className="bg-gray-900 rounded-xl overflow-hidden shadow-2xl aspect-video w-full relative">
        {(selected.kind === "native" || selected.kind === "hls") && (
          <video ref={videoRef} className="w-full h-full">
            {pistas.map((t) => (
              <track
                key={t.src}
                kind="subtitles"
                src={t.src}
                label={t.label}
                srcLang={t.lang}
                default={t.default === true}
              />
            ))}
          </video>
        )}
        {selected.kind === "youtube" && (
          <YouTubeFrame url={currentSrc} invalidLabel={labels.invalidYoutube} />
        )}
        {selected.kind === "embed" && (
          <iframe
            src={currentSrc}
            title={`Episodio ${episode}`}
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            onMouseDown={registerEmbedInteraction}
          />
        )}
        {supportsLang && (
          <span className="absolute top-2 right-2 text-[10px] uppercase tracking-wider bg-black/60 text-gray-300 rounded px-1.5 py-0.5">
            {lang === "sub" ? labels.sub : labels.dub}
          </span>
        )}
        {selected.kind === "embed" && (
          <div className="pointer-events-none absolute bottom-2 left-2 right-2 rounded bg-black/70 px-2 py-1 text-[11px] text-amber-300">
            Los subtítulos dependen del servidor externo y pueden no estar en español.
          </div>
        )}
      </div>

      {showMarkWatched && (
        <div className="mt-3 flex justify-end">
          <button
            onClick={markWatched}
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white transition"
          >
            {labels.markWatched}
          </button>
        </div>
      )}
    </div>
  )
}

function YouTubeFrame({
  url,
  invalidLabel,
}: {
  url: string
  invalidLabel: string
}) {
  const videoId = extractYouTubeId(url)
  if (!videoId) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <p className="text-gray-400 text-center p-8">{invalidLabel}</p>
      </div>
    )
  }
  return (
    <iframe
      src={`https://www.youtube.com/embed/${videoId}?rel=0`}
      title="YouTube video player"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
      allowFullScreen
      className="w-full h-full"
    />
  )
}
