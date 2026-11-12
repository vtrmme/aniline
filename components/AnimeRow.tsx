"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase"
import { Carousel } from "@/components/Carousel"
import { AnimeCard } from "@/components/AnimeCard"
import { useLanguage } from "@/contexts/LanguageContext"
import type { Anime } from "@/types"

interface AnimeRowProps {
  title: string
  subtitle?: string
  filtro?: { campo: "estado" | "genero"; valor: string }
  orden?: "puntuacion" | "recientes"
  limite?: number
  className?: string
}

export function AnimeRow({
  title,
  subtitle,
  filtro,
  orden = "puntuacion",
  limite = 18,
  className,
}: AnimeRowProps) {
  const { lang } = useLanguage()
  const [animes, setAnimes] = useState<Anime[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const cargar = async () => {
      try {
        const supabase = createClient()
        let qb = supabase.from("animes").select("*")

        if (filtro?.campo === "estado") {
          qb = qb.eq("estado", filtro.valor)
        } else if (filtro?.campo === "genero") {
          qb = qb.contains("genero", [filtro.valor])
        }

        if (orden === "puntuacion") {
          qb = qb.order("puntuacion", { ascending: false, nullsFirst: false })
        } else {
          qb = qb.order("created_at", { ascending: false })
        }

        const { data } = await qb.limit(limite)
        if (!cancelled) setAnimes((data || []) as Anime[])
      } catch (err) {
        console.error(`Error cargando fila "${title}":`, err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    cargar()
    return () => {
      cancelled = true
    }
  }, [filtro?.campo, filtro?.valor, orden, limite, title])

  if (loading || animes.length === 0) return null

  return (
    <Carousel title={title} subtitle={subtitle} className={className}>
      {animes.map((anime) => (
        <div key={anime.id} className="w-[150px] shrink-0 snap-start sm:w-[170px]">
          <AnimeCard anime={anime} lang={lang} />
        </div>
      ))}
    </Carousel>
  )
}
