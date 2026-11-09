"use client"

import Link from "next/link"
import Image from "next/image"
import type { Anime } from "@/types"
import { useLanguage } from "@/contexts/LanguageContext"

interface AnimeCardProps {
  anime: Anime
  lang?: "es" | "en"
}

export function AnimeCard({ anime, lang: propLang }: AnimeCardProps) {
  const { lang } = useLanguage()
  const currentLang = propLang || lang
  const title = currentLang === "es" ? anime.title_es : anime.title_en || anime.title_es

  return (
    <Link href={`/anime/${anime.slug}`} className="group block">
      <div className="relative aspect-[2/3] rounded-xl overflow-hidden bg-gray-800">
        <Image
          src={anime.poster_url && anime.poster_url.startsWith("http") ? anime.poster_url : "/placeholder-anime.svg"}
          alt={title}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          className="object-cover group-hover:scale-105 transition-transform duration-300"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-red-600 bg-red-600/20 px-2 py-1 rounded">
              {anime.estado || "—"}
            </span>
            <span className="text-xs text-gray-300">{anime.anio || "—"}</span>
          </div>
          <h3 className="mt-2 text-white font-bold text-lg">{title}</h3>
        </div>
      </div>
      <p className="mt-2 text-sm text-gray-400 truncate">{title}</p>
    </Link>
  )
}
