"use client"

import Link from "next/link"
import Image from "next/image"
import { Play, Star, Layers } from "lucide-react"
import type { Anime } from "@/types"
import { useLanguage } from "@/contexts/LanguageContext"
import { t } from "@/lib/translations"

interface AnimeCardProps {
  anime: Anime
  lang?: "es" | "en"
}

export function AnimeCard({ anime, lang: propLang }: AnimeCardProps) {
  const { lang } = useLanguage()
  const currentLang = propLang || lang
  const title = currentLang === "es" ? anime.title_es : anime.title_en || anime.title_es
  const sinopsis =
    currentLang === "es" ? anime.sinopsis_es : anime.sinopsis_en || anime.sinopsis_es

  return (
    <Link href={`/anime/${anime.slug}`} className="group block h-full">
      <div className="relative aspect-[2/3] overflow-hidden rounded-xl bg-[var(--surface)] ring-1 ring-white/5 transition duration-300 group-hover:-translate-y-1.5 group-hover:ring-[var(--brand)]/60 group-hover:shadow-[var(--shadow-elevated)]">
        <Image
          src={
            anime.poster_url && anime.poster_url.startsWith("http")
              ? anime.poster_url
              : "/placeholder-anime.svg"
          }
          alt={title}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />

        {anime.puntuacion != null && (
          <span className="badge-gold absolute left-2 top-2 z-10 inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-bold backdrop-blur">
            <Star size={10} fill="currentColor" />
            {anime.puntuacion}
          </span>
        )}

        <div className="gradient-card absolute inset-0 flex flex-col justify-end p-3 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
          {sinopsis && (
            <p className="mb-2 line-clamp-3 text-[11px] leading-snug text-gray-300">{sinopsis}</p>
          )}

          <div className="mb-2 flex flex-wrap items-center gap-1.5 text-[10px] font-semibold">
            {anime.episodios_count != null && anime.episodios_count > 0 && (
              <span className="inline-flex items-center gap-1 rounded bg-black/60 px-1.5 py-0.5 text-gray-200 backdrop-blur">
                <Layers size={10} />
                {anime.episodios_count} {t(currentLang, "animeDetailEpisodesCount").toLowerCase()}
              </span>
            )}
            {anime.estado && (
              <span className="badge-brand rounded bg-black/60 px-1.5 py-0.5 backdrop-blur">
                {anime.estado}
              </span>
            )}
            <span className="rounded bg-black/60 px-1.5 py-0.5 text-gray-300 backdrop-blur">
              Sub | Dob
            </span>
          </div>

          <span className="inline-flex items-center justify-center gap-1.5 rounded-full bg-[var(--brand)] px-3 py-1.5 text-xs font-bold text-white transition group-hover:bg-[var(--brand-bright)]">
            <Play size={12} fill="currentColor" />
            {t(currentLang, "episodeWatch")}
          </span>
        </div>
      </div>

      <p className="mt-2 truncate text-sm font-medium text-gray-300 transition group-hover:text-white">
        {title}
      </p>
    </Link>
  )
}
