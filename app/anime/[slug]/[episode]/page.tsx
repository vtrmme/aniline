"use client"

import { createClient } from "@/lib/supabase"
import { notFound, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { VideoPlayer } from "@/components/VideoPlayer"
import Link from "next/link"
import type { Anime, Episode } from "@/types"
import { useLanguage } from "@/contexts/LanguageContext"
import { t } from "@/lib/translations"

export default function EpisodePage({
  params,
}: {
  params: Promise<{ slug: string; episode: string }>
}) {
  const { lang } = useLanguage()
  const router = useRouter()
  const [anime, setAnime] = useState<Anime | null>(null)
  const [episodeData, setEpisodeData] = useState<Episode | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      const { slug, episode } = await params
      const num = Number(episode)
      const supabase = createClient()

      const { data: animeData } = await supabase
        .from("animes")
        .select("*")
        .eq("slug", slug)
        .single()

      const { data: epData } = await supabase
        .from("episodes")
        .select("*")
        .eq("anime_id", animeData?.id)
        .eq("numero", num)
        .single()

      if (!animeData || !epData) {
        router.push("/404")
        return
      }

      setAnime(animeData as Anime)
      setEpisodeData(epData as Episode)
      setLoading(false)
    }

    fetchData()
  }, [params, router, lang])

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="flex flex-col items-center justify-center text-gray-400">
          Cargando episodio...
        </div>
      </div>
    )
  }

  if (!anime || !episodeData) {
    notFound()
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

      <VideoPlayer videoUrl={episodeData.video_url} />

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
