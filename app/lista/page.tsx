"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import type { Anime } from "@/types"
import { useLanguage } from "@/contexts/LanguageContext"
import { t } from "@/lib/translations"

interface WatchlistItem {
  id: string
  user_id: string
  anime_id: string
  estado: string
  created_at: string
  animes: Anime
}

export default function Lista() {
  const { lang } = useLanguage()
  const [items, setItems] = useState<{ anime: Anime; estado: string }[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const cargar = async () => {
      try {
        const res = await fetch("/api/watchlist/mine")
        if (res.ok) {
          const json = await res.json()
          setItems(
            (json.items || []).map((d: WatchlistItem) => ({
              anime: d.animes as Anime,
              estado: d.estado,
            }))
          )
        }
      } catch {
        // ignore
      } finally {
        setLoading(false)
      }
    }
    cargar()
  }, [lang])

  const estadoLabel = (estado: string) => {
    if (lang === "es") return estado
    const map: Record<string, string> = {
      para_ver: "plan to watch",
      viendo: "watching",
      visto: "completed",
    }
    return map[estado] || estado
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center text-gray-400">
        {t(lang, "navMyList")}...
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-white mb-8">{t(lang, "myListTitle")}</h1>
      {items.length === 0 ? (
        <p className="text-gray-400 text-center py-20">
          {t(lang, "myListEmpty")}
        </p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
          {items.map(({ anime, estado }) => {
            const title = lang === "es" ? anime.title_es : anime.title_en || anime.title_es
            return (
              <Link key={anime.id} href={`/anime/${anime.slug}`} className="block">
                <div className="relative aspect-[2/3] rounded-xl overflow-hidden bg-gray-800 mb-2">
                  <Image
                    src={anime.poster_url && anime.poster_url.startsWith("http") ? anime.poster_url : "/placeholder-anime.svg"}
                    alt={title}
                    className="w-full h-full object-cover"
                    width={300}
                    height={450}
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  />
                  <span className="absolute top-2 right-2 text-xs font-bold text-white bg-red-600 px-2 py-1 rounded">
                    {estadoLabel(estado)}
                  </span>
                </div>
                <h3 className="text-sm font-medium text-white truncate">
                  {title}
                </h3>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
