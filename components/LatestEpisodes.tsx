"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase"
import { useLanguage } from "@/contexts/LanguageContext"
import { t } from "@/lib/translations"

const LIMIT = 12
const FETCH_LIMIT = 200

interface LatestEpisodeAnime {
  slug: string
  title_es: string
  title_en?: string | null
  poster_url?: string | null
}

interface LatestEpisode {
  id: string
  numero: number
  animes: LatestEpisodeAnime | null
}

export function LatestEpisodes() {
  const { lang } = useLanguage()
  const [episodes, setEpisodes] = useState<LatestEpisode[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const cargar = async () => {
      try {
        const supabase = createClient()
        const { data } = await supabase
          .from("episodes")
          .select("id, numero, anime_id, animes(slug, title_es, title_en, poster_url)")
          .order("created_at", { ascending: false })
          .order("numero", { ascending: false })
          .limit(FETCH_LIMIT)

        if (cancelled) return

        // Un solo episodio por anime para que un backfill no inunde la sección
        const vistos = new Set<string>()
        const unicos: LatestEpisode[] = []
        for (const ep of (data || []) as unknown as LatestEpisode[]) {
          if (!ep.animes) continue
          const clave = ep.animes.slug
          if (vistos.has(clave)) continue
          vistos.add(clave)
          unicos.push(ep)
          if (unicos.length >= LIMIT) break
        }
        setEpisodes(unicos)
      } catch (err) {
        console.error("Error cargando últimos episodios:", err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    cargar()
    return () => {
      cancelled = true
    }
  }, [])

  if (loading || episodes.length === 0) return null

  return (
    <section className="mb-12">
      <div className="mb-5">
        <h2 className="text-2xl font-bold text-white">{t(lang, "homeLatestEpisodes")}</h2>
        <p className="text-gray-400 text-sm">{t(lang, "homeLatestEpisodesSubtitle")}</p>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4">
        {episodes.map((ep) => {
          const anime = ep.animes
          if (!anime) return null
          const title = lang === "es" ? anime.title_es : anime.title_en || anime.title_es
          return (
            <Link
              key={`${anime.slug}-${ep.numero}`}
              href={`/anime/${anime.slug}/${ep.numero}`}
              className="group block"
            >
              <div className="relative overflow-hidden rounded-xl bg-gray-800 aspect-[2/3]">
                {anime.poster_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={anime.poster_url}
                    alt={title}
                    className="w-full h-full object-cover transition duration-300 group-hover:scale-105"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-600 text-xs">
                    {t(lang, "msgSinDatos")}
                  </div>
                )}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-red-400">
                    {t(lang, "homeViewEpisode")} {ep.numero}
                  </span>
                  <p className="text-xs text-white font-medium truncate">{title}</p>
                </div>
              </div>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
