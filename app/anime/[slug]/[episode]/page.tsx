"use client"

import { createClient } from "@/lib/supabase"
import { useCallback, useEffect, useRef, useState } from "react"
import { VideoPlayer } from "@/components/VideoPlayer"
import { EpisodePlayer, type StreamServerInfo } from "@/components/EpisodePlayer"
import Link from "next/link"
import { useSession } from "next-auth/react"
import { ChevronLeft, ChevronRight, LayoutGrid } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Anime, Episode } from "@/types"
import { useLanguage } from "@/contexts/LanguageContext"
import { t } from "@/lib/translations"
import type { StreamLang } from "@/lib/streaming"

interface StreamData {
  servers: StreamServerInfo[]
  anilistId: number | null
  nativeUrl: string | null
  youtubeUrl: string | null
  hlsUrl: string | null
}

export default function EpisodePage({
  params,
}: {
  params: Promise<{ slug: string; episode: string }>
}) {
  const { lang } = useLanguage()
  const { data: session } = useSession()
  const userId = (session?.user as { id?: string })?.id
  const [anime, setAnime] = useState<Anime | null>(null)
  const [episodeData, setEpisodeData] = useState<Episode | null>(null)
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [youtubeUrl, setYoutubeUrl] = useState<string | null>(null)
  const [historialItem, setHistorialItem] = useState<{ episodio_numero: number } | null>(null)
  const [savedSeconds, setSavedSeconds] = useState(0)
  const [nextEpisodeUrl, setNextEpisodeUrl] = useState<string | null>(null)
  const [nextEpisodeNum, setNextEpisodeNum] = useState<number | null>(null)
  const [prevEpisodeNum, setPrevEpisodeNum] = useState<number | null>(null)
  const [episodesList, setEpisodesList] = useState<{ numero: number; title_es?: string | null }[]>([])
  const [loading, setLoading] = useState(true)
  const [streamData, setStreamData] = useState<StreamData | null>(null)
  const [streamLang, setStreamLang] = useState<StreamLang>("sub")

  const [slug, setSlug] = useState<string | null>(null)
  const [num, setNum] = useState<number | null>(null)

  const animeIdRef = useRef<string | null>(null)
  const lastProgressRef = useRef(0)

  useEffect(() => {
    let cancelled = false
    params.then(({ slug: s, episode: e }) => {
      if (cancelled) return
      setSlug(s)
      setNum(Number(e))
    })
    return () => {
      cancelled = true
    }
  }, [lang])

  useEffect(() => {
    if (!slug || num === null) return
    const fetchData = async () => {
      try {
        const supabase = createClient()

        const { data: animeData } = await supabase
          .from("animes")
          .select("*")
          .eq("slug", slug)
          .single()

        if (!animeData || !animeData.id) {
          setLoading(false)
          return
        }

        const { data: epData } = await supabase
          .from("episodes")
          .select("*")
          .eq("anime_id", animeData.id)
          .eq("numero", num)
          .single()

        if (!animeData || !epData) {
          setLoading(false)
          return
        }

        animeIdRef.current = animeData.id
        setAnime(animeData as Anime)
        setEpisodeData(epData as Episode)

        if (epData.youtube_url) {
          setVideoUrl(null)
          setYoutubeUrl(epData.youtube_url)
        } else if (epData.video_url) {
          const res = await fetch(`/api/videos/play?path=${encodeURIComponent(epData.video_url)}`)
          if (res.ok) {
            const json = await res.json()
            setVideoUrl(json.videoUrl || null)
            setYoutubeUrl(null)
          } else {
            setVideoUrl(null)
            setYoutubeUrl(null)
          }
        } else {
          setVideoUrl(null)
          setYoutubeUrl(null)
        }

        if (userId) {
          const res = await fetch(`/api/historial?anime_id=${animeData.id}&episodio_numero=${num}`)
          if (res.ok) {
            const json = await res.json()
            if (json.inList) {
              setHistorialItem({ episodio_numero: json.episodio_numero })
              setSavedSeconds(typeof json.segundos === "number" ? json.segundos : 0)
            }
          }

          await fetch("/api/historial", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ anime_id: animeData.id, episodio_numero: num }),
          })
        }

        // Lista completa de episodios para el selector y navegación prev/next
        const { data: lista } = await supabase
          .from("episodes")
          .select("numero, title_es, title_en")
          .eq("anime_id", animeData.id)
          .order("numero", { ascending: true })

        if (Array.isArray(lista)) {
          const ordenados = (lista as { numero: number; title_es?: string | null }[]).sort(
            (a, b) => a.numero - b.numero
          )
          setEpisodesList(ordenados)
          const anteriores = ordenados.filter((e) => e.numero < num)
          setPrevEpisodeNum(anteriores.length > 0 ? anteriores[anteriores.length - 1].numero : null)
        }

        // Preload del siguiente episodio
        const { data: nextEp } = await supabase
          .from("episodes")
          .select("numero, video_url, youtube_url")
          .eq("anime_id", animeData.id)
          .eq("numero", num + 1)
          .single()

        if (nextEp) {
          setNextEpisodeNum(nextEp.numero)
          if (nextEp.youtube_url) {
            setNextEpisodeUrl(null)
          } else if (nextEp.video_url) {
            const res = await fetch(`/api/videos/play?path=${encodeURIComponent(nextEp.video_url)}`)
            if (res.ok) {
              const json = await res.json()
              setNextEpisodeUrl(json.videoUrl || null)
            }
          }
        }
      } catch (err) {
        console.error("Error cargando episodio:", err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [slug, num, lang, userId])

  useEffect(() => {
    if (!slug || num === null) return
    let cancelled = false

    const fetchServers = async () => {
      try {
        const res = await fetch(
          `/api/stream/servers?slug=${encodeURIComponent(slug)}&episode=${num}&lang=${streamLang}`
        )
        if (!res.ok) return
        const json = (await res.json()) as {
          ok: boolean
          servers?: StreamServerInfo[]
          anilistId?: number | null
          nativeUrl?: string | null
          youtubeUrl?: string | null
          hlsUrl?: string | null
        }
        if (cancelled || !json.ok || !Array.isArray(json.servers)) return
        setStreamData({
          servers: json.servers,
          anilistId: typeof json.anilistId === "number" ? json.anilistId : null,
          nativeUrl: json.nativeUrl || null,
          youtubeUrl: json.youtubeUrl || null,
          hlsUrl: json.hlsUrl || null,
        })
      } catch {
        // sin red: se mantiene el reproductor local
      }
    }

    fetchServers()
    return () => {
      cancelled = true
    }
  }, [slug, num, streamLang])

  const saveProgress = useCallback(
    async (segundos: number) => {
      if (!userId || !animeIdRef.current || num === null) return
      const value = Math.max(0, Math.floor(segundos))
      if (value === lastProgressRef.current) return
      lastProgressRef.current = value
      try {
        await fetch("/api/historial", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            anime_id: animeIdRef.current,
            episodio_numero: num,
            segundos: value,
          }),
        })
      } catch {
        // fallo silencioso: el progreso se reintentará
      }
    },
    [userId, num]
  )

  const handleMarkWatched = useCallback(() => {
    saveProgress(lastProgressRef.current)
  }, [saveProgress])

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-center text-gray-400">
          <div className="mb-4 h-12 w-12 animate-pulse rounded-full bg-[var(--surface)]" />
          Cargando episodio...
        </div>
      </div>
    )
  }

  if (!anime || !episodeData) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-center text-gray-400">
          <p className="p-8 text-center text-gray-400">Episodio no encontrado</p>
        </div>
      </div>
    )
  }

  const title = lang === "es" ? anime.title_es : anime.title_en || anime.title_es
  const epTitle =
    lang === "es" ? episodeData.title_es : episodeData.title_en || episodeData.title_es || `Episodio ${episodeData.numero}`
  const sinopsis = lang === "es" ? anime.sinopsis_es : anime.sinopsis_en || anime.sinopsis_es

  const showPlayer = !!streamData || !!videoUrl || !!youtubeUrl

  return (
    <div className="cinema-bg min-h-[calc(100vh-4rem)] pb-16">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        <nav className="mb-4 flex items-center gap-2 text-sm">
          <Link
            href={`/anime/${anime.slug}`}
            className="text-gray-400 transition hover:text-white"
          >
            {title}
          </Link>
          <span className="text-gray-600">/</span>
          <span className="text-white">
            {t(lang, "episodeWatch")} {episodeData.numero}
          </span>
        </nav>

        {!showPlayer ? (
          <div className="flex aspect-video w-full items-center justify-center overflow-hidden rounded-xl bg-black/60 shadow-2xl ring-1 ring-white/10">
            <p className="p-8 text-center text-gray-400">
              {t(lang, "episodeNotAvailable") || "Video no disponible aún"}
            </p>
          </div>
        ) : (
          <>
            {historialItem && historialItem.episodio_numero < episodeData.numero && (
              <div className="mb-4 flex items-center gap-2 rounded-xl border border-blue-500/30 bg-blue-500/10 px-4 py-3">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-400">
                  {t(lang, "episodeHistory")}
                </span>
                <Link
                  href={`/anime/${anime.slug}/${historialItem.episodio_numero}`}
                  className="text-sm text-blue-300 underline underline-offset-4 transition hover:text-white"
                >
                  {t(lang, "episodeResume")} #{historialItem.episodio_numero}
                </Link>
              </div>
            )}

            <div className="overflow-hidden rounded-xl bg-black shadow-[var(--shadow-elevated)] ring-1 ring-white/10">
              {streamData && streamData.servers.length > 0 ? (
                <EpisodePlayer
                  key={`${anime.slug}:${episodeData.numero}`}
                  servers={streamData.servers}
                  anilistId={streamData.anilistId}
                  episode={episodeData.numero}
                  lang={streamLang}
                  onLangChange={setStreamLang}
                  nativeUrl={streamData.nativeUrl || videoUrl}
                  youtubeUrl={streamData.youtubeUrl || youtubeUrl}
                  hlsUrl={streamData.hlsUrl}
                  storageKey={`${anime.slug}:${episodeData.numero}`}
                  initialSeconds={savedSeconds}
                  onProgress={saveProgress}
                  onMarkWatched={handleMarkWatched}
                  labels={{
                    markWatched: t(lang, "serverMarkWatched"),
                    sub: t(lang, "serverSub"),
                    dub: t(lang, "serverDub"),
                    notAvailable: t(lang, "episodeNotAvailable"),
                    invalidYoutube: "URL de YouTube inválida",
                    noServers: t(lang, "serverNoServers"),
                  }}
                />
              ) : (
                <VideoPlayer videoUrl={videoUrl} youtubeUrl={youtubeUrl} />
              )}
            </div>

            <div className="mt-4 flex items-center justify-between gap-3">
              {prevEpisodeNum !== null ? (
                <Link
                  href={`/anime/${anime.slug}/${prevEpisodeNum}`}
                  className="btn-ghost inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold"
                >
                  <ChevronLeft size={16} />
                  {t(lang, "episodePrev")} #{prevEpisodeNum}
                </Link>
              ) : (
                <span />
              )}

              {(nextEpisodeUrl || nextEpisodeNum) && nextEpisodeNum !== null && (
                <Link
                  href={`/anime/${anime.slug}/${nextEpisodeNum}`}
                  className="btn-brand inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold"
                >
                  {t(lang, "episodeNext")} #{nextEpisodeNum}
                  <ChevronRight size={16} />
                </Link>
              )}
            </div>
          </>
        )}

        {episodesList.length > 0 && (
          <div className="glass-panel mt-8 rounded-2xl p-5">
            <div className="mb-4 flex items-center gap-2">
              <LayoutGrid size={16} className="text-[var(--brand-bright)]" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-gray-300">
                {t(lang, "episodeSelect")}
              </h3>
            </div>
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10">
              {episodesList.map((ep) => (
                <Link
                  key={ep.numero}
                  href={`/anime/${anime.slug}/${ep.numero}`}
                  className={cn(
                    "flex h-9 items-center justify-center rounded-lg text-xs font-bold transition",
                    ep.numero === episodeData.numero
                      ? "bg-[var(--brand)] text-white shadow-[0_4px_16px_rgba(229,9,20,0.35)]"
                      : "bg-white/5 text-gray-300 hover:bg-white/12 hover:text-white"
                  )}
                >
                  {ep.numero}
                </Link>
              ))}
            </div>
          </div>
        )}

        <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-12">
          <div className="lg:col-span-8">
            <h2 className="mb-2 text-2xl font-bold text-white">{epTitle}</h2>
            <p className="whitespace-pre-line text-gray-400">{sinopsis}</p>
          </div>
          <div className="lg:col-span-4">
            <div className="glass-panel rounded-2xl p-6">
              <h3 className="mb-4 font-bold text-white">{t(lang, "episodeInfo")}</h3>
              <p className="mb-2 text-sm text-gray-400">
                <span className="font-semibold text-white">Anime:</span>{" "}
                {title}
              </p>
              <p className="mb-2 text-sm text-gray-400">
                <span className="font-semibold text-white">Episodio:</span>{" "}
                {episodeData.numero}
              </p>
              <p className="text-sm text-gray-400">
                <span className="font-semibold text-white">{t(lang, "animeDetailGenre")}:</span>{" "}
                {anime.genero?.join(", ")}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
