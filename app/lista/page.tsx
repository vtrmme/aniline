"use client"

import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"
import { AnimeCard } from "@/components/AnimeCard"
import { SkeletonAnimeCard } from "@/components/SkeletonAnimeCard"
import type { Anime } from "@/types"
import { useLanguage } from "@/contexts/LanguageContext"
import { t } from "@/lib/translations"

interface WatchlistItem {
  id: string
  user_id: string
  anime_id: string
  estado: string
  progreso?: number
  puntuacion?: number
  created_at: string
  animes: Anime
}

export default function Lista() {
  const { lang } = useLanguage()
  const [items, setItems] = useState<{ anime: Anime; estado: string; puntuacion?: number }[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<Set<string>>(new Set())

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
              puntuacion: d.puntuacion,
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

  const estadoColor = (estado: string) => {
    switch (estado) {
      case "visto":
        return "bg-emerald-600/90"
      case "viendo":
        return "bg-blue-600/90"
      case "para_ver":
        return "bg-amber-500/90 text-black"
      default:
        return "bg-gray-600/90"
    }
  }

  const cambiarEstado = async (animeId: string, nuevoEstado: string) => {
    setSaving((prev) => new Set([...prev, animeId]))
    try {
      const res = await fetch("/api/watchlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ anime_id: animeId, estado: nuevoEstado }),
      })
      if (res.ok) {
        setItems((prev) =>
          prev.map((item) =>
            item.anime.id === animeId
              ? { ...item, estado: nuevoEstado }
              : item
          )
        )
      }
    } catch {
      // ignore
    } finally {
      setSaving((prev) => {
        const n = new Set(prev)
        n.delete(animeId)
        return n
      })
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <SkeletonAnimeCard key={i} />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="mb-8 text-3xl font-bold text-white">{t(lang, "myListTitle")}</h1>
      {items.length === 0 ? (
        <p className="py-20 text-center text-gray-400">
          {t(lang, "myListEmpty")}
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {items.map(({ anime, estado, puntuacion }) => (
            <div key={anime.id} className="relative">
              <div className="absolute right-2 top-2 z-20">
                <span
                  className={cn(
                    "cursor-default rounded-md px-2 py-1 text-xs font-bold text-white shadow-md",
                    estadoColor(estado)
                  )}
                >
                  {estadoLabel(estado)}
                </span>
              </div>
              {puntuacion != null && (
                <span className="badge-gold absolute left-2 top-2 z-20 rounded-md px-1.5 py-0.5 text-[11px] font-bold backdrop-blur">
                  ⭐ {puntuacion}
                </span>
              )}
              <AnimeCard anime={anime} lang={lang} />
              <div className="mt-2 flex gap-1.5">
                {(["para_ver", "viendo", "visto"] as const).map((e) => (
                  <button
                    key={e}
                    onClick={() => cambiarEstado(anime.id, e)}
                    disabled={saving.has(anime.id)}
                    className={cn(
                      "flex-1 rounded-md py-1 text-[10px] font-semibold uppercase tracking-wide transition disabled:opacity-50",
                      estado === e
                        ? "bg-[var(--brand)] text-white"
                        : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white"
                    )}
                  >
                    {estadoLabel(e)}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
