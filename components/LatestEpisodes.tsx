"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { Play } from "lucide-react"
import { createClient } from "@/lib/supabase"
import { useLanguage } from "@/contexts/LanguageContext"
import { t } from "@/lib/translations"
import { Carousel } from "@/components/Carousel"

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
    <Carousel
      title={t(lang, "homeLatestEpisodes")}
      subtitle={t(lang, "homeLatestEpisodesSubtitle")}
    >
      {episodes.map((ep) => {
        const anime = ep.animes
        if (!anime) return null
        const title = lang === "es" ? anime.title_es : anime.title_en || anime.title_es
        return (
          <Link
            key={`${anime.slug}-${ep.numero}`}
            href={`/anime/${anime.slug}/${ep.numero}`}
            className="group block w-[150px] shrink-0 snap-start sm:w-[170px]"
          >
            <div className="relative aspect-[2/3] overflow-hidden rounded-xl bg-[var(--surface)] ring-1 ring-white/5 transition duration-300 group-hover:-translate-y-1 group-hover:ring-[var(--brand)]/60 group-hover:shadow-[var(--shadow-elevated)]">
              {anime.poster_url ? (
                <Image
                  src={anime.poster_url}
                  alt={title}
                  fill
                  sizes="180px"
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xs text-gray-600">
                  {t(lang, "msgSinDatos")}
                </div>
              )}
              <div className="gradient-card absolute inset-0 opacity-90 transition-opacity group-hover:opacity-100" />
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--brand)] text-white shadow-lg">
                  <Play size={20} fill="currentColor" />
                </span>
              </div>
              <div className="absolute inset-x-0 bottom-0 p-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--brand-bright)]">
                  {t(lang, "homeViewEpisode")} {ep.numero}
                </span>
                <p className="mt-0.5 truncate text-xs font-medium text-white">{title}</p>
              </div>
            </div>
            <p className="mt-2 truncate text-sm text-gray-400 transition group-hover:text-white">
              {title}
            </p>
          </Link>
        )
      })}
    </Carousel>
  )
}
