"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { useSession } from "next-auth/react"
import { Play } from "lucide-react"
import { createClient } from "@/lib/supabase"
import { useLanguage } from "@/contexts/LanguageContext"
import { t } from "@/lib/translations"
import { Carousel } from "@/components/Carousel"
import type { Anime } from "@/types"

const LIMIT = 12

interface HistorialEntry {
  anime_id: string
  episodio_numero: number
}

interface ContinueItem {
  anime: Anime
  episodio_numero: number
}

export function ContinueWatching() {
  const { lang } = useLanguage()
  const { data: session } = useSession()
  const [items, setItems] = useState<ContinueItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!session) return
    let cancelled = false
    const cargar = async () => {
      try {
        const res = await fetch("/api/historial")
        if (!res.ok) return
        const json = (await res.json()) as { ok: boolean; items?: HistorialEntry[] }
        if (!json.ok || !Array.isArray(json.items) || json.items.length === 0) return

        const vistos = new Set<string>()
        const unicos: HistorialEntry[] = []
        for (const h of json.items) {
          if (!h.anime_id || vistos.has(h.anime_id)) continue
          vistos.add(h.anime_id)
          unicos.push(h)
          if (unicos.length >= LIMIT) break
        }
        if (unicos.length === 0) return

        const supabase = createClient()
        const { data: animes } = await supabase
          .from("animes")
          .select("*")
          .in(
            "id",
            unicos.map((h) => h.anime_id)
          )

        if (cancelled) return

        const porId = new Map<string, Anime>()
        ;((animes || []) as Anime[]).forEach((a) => porId.set(a.id, a))

        const completos: ContinueItem[] = []
        for (const h of unicos) {
          const anime = porId.get(h.anime_id)
          if (anime) completos.push({ anime, episodio_numero: h.episodio_numero })
        }
        setItems(completos)
      } catch (err) {
        console.error("Error cargando continuar viendo:", err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    cargar()
    return () => {
      cancelled = true
    }
  }, [session])

  if (loading || items.length === 0) return null

  return (
    <Carousel
      title={t(lang, "sectionContinue")}
      subtitle={t(lang, "historialTitle")}
      className="mb-10"
    >
      {items.map(({ anime, episodio_numero }) => {
        const titulo = lang === "es" ? anime.title_es : anime.title_en || anime.title_es
        return (
          <Link
            key={anime.id}
            href={`/anime/${anime.slug}/${episodio_numero}`}
            className="group block w-[150px] shrink-0 snap-start sm:w-[170px]"
          >
            <div className="relative aspect-[2/3] overflow-hidden rounded-xl bg-[var(--surface)] ring-1 ring-white/5 transition duration-300 group-hover:-translate-y-1 group-hover:ring-[var(--brand)]/60 group-hover:shadow-[var(--shadow-elevated)]">
              <Image
                src={
                  anime.poster_url && anime.poster_url.startsWith("http")
                    ? anime.poster_url
                    : "/placeholder-anime.svg"
                }
                alt={titulo}
                fill
                sizes="180px"
                className="object-cover transition-transform duration-300 group-hover:scale-105"
              />
              <div className="gradient-card absolute inset-0 opacity-80 transition-opacity group-hover:opacity-100" />
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--brand)] text-white shadow-lg">
                  <Play size={20} fill="currentColor" />
                </span>
              </div>
              <div className="absolute inset-x-0 bottom-0 p-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--brand-bright)]">
                  {t(lang, "continueEpisode")} {episodio_numero}
                </span>
                <p className="mt-0.5 truncate text-xs font-semibold text-white">{titulo}</p>
              </div>
            </div>
            <p className="mt-2 truncate text-sm text-gray-400 transition group-hover:text-white">
              {titulo}
            </p>
          </Link>
        )
      })}
    </Carousel>
  )
}
