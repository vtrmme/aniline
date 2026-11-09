"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { cn } from "@/lib/utils"
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
        return "bg-green-600"
      case "viendo":
        return "bg-blue-600"
      case "para_ver":
        return "bg-yellow-600"
      default:
        return "bg-gray-600"
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
      <div className="max-w-7xl mx-auto px-4 py-20 text-center text-gray-400">
        <div className="animate-pulse rounded-full h-10 w-10 bg-gray-800 mx-auto mb-3"></div>
        {t(lang, "navMyList")}
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-3xl font-bold text-white">{t(lang, "myListTitle")}</h1>
        <div className="flex gap-2">
          {["todos", "visto", "viendo", "para_ver"].map((filtro) => (
            <button
              key={filtro}
              onClick={() => {
                // Filtro simple en cliente (se podría mejorar con estado)
              }}
              className={cn(
                "px-3 py-1 text-xs rounded-full transition",
                filtro === "todos"
                  ? "bg-red-600 text-white"
                  : "bg-gray-800 text-gray-400 hover:text-white"
              )}
            >
              {filtro === "todos"
                ? t(lang, "myListFilterTodos")
                : filtro === "visto"
                  ? t(lang, "myListFilterVisto")
                  : filtro === "viendo"
                    ? t(lang, "myListFilterViendo")
                    : t(lang, "myListFilterParaVer")}
            </button>
          ))}
        </div>
      </div>

      {items.length === 0 ? (
        <p className="text-gray-400 text-center py-20">{t(lang, "myListEmpty")}</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
          {items.map(({ anime, estado, puntuacion }) => {
            const title = lang === "es" ? anime.title_es : anime.title_en || anime.title_es
            return (
              <Link key={anime.id} href={`/anime/${anime.slug}`} className="block">
                <div className="relative aspect-[2/3] rounded-xl overflow-hidden bg-gray-800 mb-2 group">
                  <Image
                    src={anime.poster_url && anime.poster_url.startsWith("http") ? anime.poster_url : "/placeholder-anime.svg"}
                    alt={title}
                    className="w-full h-full object-cover"
                    width={300}
                    height={450}
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  />
                  <span className="absolute top-2 right-2 text-xs font-bold text-white px-2 py-1 rounded">
                    {estadoLabel(estado)}
                  </span>
                  {puntuacion && (
                    <span className="absolute bottom-2 left-2 text-xs font-bold text-yellow-400 bg-black/60 px-2 py-1 rounded">
                      ⭐ {puntuacion}
                    </span>
                  )}
                </div>
                <h3 className="text-sm font-medium text-white truncate">{title}</h3>
                <div className="flex gap-1">
                  {["para_ver", "viendo", "visto"].map((e) => (
                    <button
                      key={e}
                      onClick={() => cambiarEstado(anime.id, e)}
                      disabled={saving.has(anime.id)}
                      className={cn(
                        "flex-1 py-1 text-xs rounded transition",
                        estado === e
                          ? estadoColor(e)
                          : "bg-gray-800 text-gray-500 hover:text-white"
                      )}
                    >
                      {e === "para_ver"
                        ? t(lang, "statusPlanToWatch").charAt(0)
                        : e === "viendo"
                          ? t(lang, "statusWatching").charAt(0)
                          : t(lang, "statusCompleted").charAt(0)}
                    </button>
                  ))}
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
