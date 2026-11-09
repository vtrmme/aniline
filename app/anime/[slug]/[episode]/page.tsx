"use client"

import { createClient } from "@/lib/supabase"
import { useEffect, useState } from "react"
import { VideoPlayer } from "@/components/VideoPlayer"
import Link from "next/link"
import { useSession } from "next-auth/react"
import type { Anime, Episode } from "@/types"
import { useLanguage } from "@/contexts/LanguageContext"
import { t } from "@/lib/translations"

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
  const [loading, setLoading] = useState(true)

  const [slug, setSlug] = useState<string | null>(null)
  const [num, setNum] = useState<number | null>(null)

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
            }
          }

          await fetch("/api/historial", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ anime_id: animeData.id, episodio_numero: num }),
          })
        }
      } catch (err) {
        console.error("Error cargando episodio:", err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [slug, num, lang, userId])

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="flex flex-col items-center justify-center text-gray-400">
          <div className="animate-pulse rounded-full h-12 w-12 bg-gray-800 mb-4"></div>
          Cargando episodio...
        </div>
      </div>
    )
  }

  if (!anime || !episodeData) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="flex flex-col items-center justify-center text-gray-400">
          <p className="text-gray-400 text-center p-8">Episodio no encontrado</p>
        </div>
      </div>
    )
  }

  const title = lang === "es" ? anime.title_es : anime.title_en || anime.title_es
  const epTitle =
    lang === "es" ? episodeData.title_es : episodeData.title_en || episodeData.title_es || `Episodio ${episodeData.numero}`
  const sinopsis = lang === "es" ? anime.sinopsis_es : anime.sinopsis_en || anime.sinopsis_es

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <nav className="mb-6 flex items-center gap-2 text-sm">
        <Link
          href={`/anime/${anime.slug}`}
          className="text-gray-400 hover:text-white"
        >
          {title}
        </Link>
        <span className="text-gray-600">/</span>
        <span className="text-white">{t(lang, "episodeWatch")} {episodeData.numero}</span>
      </nav>

      {!videoUrl && !youtubeUrl ? (
        <div className="bg-gray-800 rounded-xl overflow-hidden shadow-2xl aspect-video w-full flex items-center justify-center">
          <p className="text-gray-400 text-center p-8">
            {t(lang, "episodeNotAvailable") || "Video no disponible aún"}
          </p>
        </div>
      ) : (
        <>
          {historialItem && historialItem.episodio_numero < episodeData.numero && (
            <div className="mb-4 bg-blue-600/20 border border-blue-600/30 text-blue-100 rounded-xl px-4 py-3 flex items-center gap-2">
              <span className="text-xs font-bold text-blue-400 uppercase tracking-wider">
                {t(lang, "episodeHistory")}
              </span>
              <Link
                href={`/anime/${anime.slug}/${historialItem.episodio_numero}`}
                className="text-sm text-blue-300 hover:text-white underline underline-offset-4"
              >
                {t(lang, "episodeResume")} #{historialItem.episodio_numero}
              </Link>
            </div>
          )}
          <VideoPlayer videoUrl={videoUrl} youtubeUrl={youtubeUrl} />
        </>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-8">
        <div className="lg:col-span-8">
          <h2 className="text-2xl font-bold text-white mb-2">{epTitle}</h2>
          <p className="text-gray-400 whitespace-pre-line">{sinopsis}</p>
        </div>
        <div className="lg:col-span-4">
          <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
            <h3 className="font-bold text-white mb-4">{t(lang, "episodeInfo")}</h3>
            <p className="text-sm text-gray-400 mb-2">
              <span className="font-semibold text-white">Anime:</span>{" "}
              {title}
            </p>
            <p className="text-sm text-gray-400 mb-2">
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
  )
}
