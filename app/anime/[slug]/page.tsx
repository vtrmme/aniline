"use client"

import { createClient } from "@/lib/supabase"
import { notFound, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import type { Anime, Episode } from "@/types"
import { useLanguage } from "@/contexts/LanguageContext"
import { t } from "@/lib/translations"

interface AnimeWithEpisodes extends Anime {
  episodes?: Episode[]
}

export default function AnimeDetail({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { lang } = useLanguage()
  const router = useRouter()
  const [anime, setAnime] = useState<AnimeWithEpisodes | null>(null)
  const [slug, setSlug] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchAnime = async () => {
      const { slug: s } = await params
      setSlug(s)
      const supabase = createClient()
      const { data } = await supabase
        .from("animes")
        .select("*, episodes(*)")
        .eq("slug", s)
        .single()

      if (!data) {
        router.push("/404")
        return
      }

      setAnime(data as AnimeWithEpisodes)
      setLoading(false)
    }

    fetchAnime()
  }, [params, router, lang])

  if (loading || !slug) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="flex flex-col items-center justify-center text-gray-400">
          Cargando anime...
        </div>
      </div>
    )
  }

  if (!anime) {
    notFound()
  }

  const episodes = (anime.episodes || []) as Episode[]
  const title = lang === "es" ? anime.title_es : anime.title_en || anime.title_es
  const sinopsis = lang === "es" ? anime.sinopsis_es : anime.sinopsis_en || anime.sinopsis_es

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-4">
          <div className="relative aspect-[2/3] rounded-xl overflow-hidden bg-gray-800 mb-4">
            <Image
              src={anime.poster_url || "https://via.placeholder.com/300x450"}
              alt={title}
              fill
              className="object-cover"
              priority
            />
          </div>
          <Link href="/lista" className="block w-full py-3 px-4 text-center text-white bg-red-600 hover:bg-red-700 rounded-lg font-medium transition">
            {t(lang, "animeDetailAddList")}
          </Link>
        </div>
        <div className="lg:col-span-8">
          <h1 className="text-3xl font-bold text-white mb-2">{title}</h1>
          <p className="text-gray-400 mb-4">
            {anime.anio} • {anime.genero?.join(" • ")} • {anime.estado}
          </p>
          <div className="mb-8 whitespace-pre-line text-gray-300">
            {sinopsis}
          </div>
          <h2 className="text-xl font-bold text-white mb-4">{t(lang, "animeDetailEpisodes")}</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {episodes
              .sort((a, b) => (a.orden || 0) - (b.orden || 0))
              .map((ep) => {
                const epTitle = lang === "es" ? ep.title_es : ep.title_en || ep.title_es || `Episodio ${ep.numero}`
                return (
                  <Link
                    key={ep.id}
                    href={`/anime/${slug}/${ep.numero}`}
                    className="group block p-4 bg-gray-800 rounded-lg hover:bg-red-600/20 border border-transparent hover:border-red-600 transition"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-bold text-red-600">#{ep.numero}</span>
                      <span className="text-xs text-gray-500 group-hover:text-red-400 transition">
                        {t(lang, "episodeWatch")}
                      </span>
                    </div>
                    <h3 className="text-sm text-white truncate group-hover:text-red-400 transition">
                      {epTitle}
                    </h3>
                  </Link>
                )
              })}
          </div>
        </div>
      </div>
    </div>
  )
}
