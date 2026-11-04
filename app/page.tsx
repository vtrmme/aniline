"use client"

import { createClient } from "@/lib/supabase"
import { AnimeCard } from "@/components/AnimeCard"
import { useEffect, useState } from "react"
import type { Anime } from "@/types"

export default function Home() {
  const [animes, setAnimes] = useState<Anime[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchAnimes = async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from("animes")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(24)
      setAnimes((data || []) as Anime[])
      setLoading(false)
    }
    fetchAnimes()
  }, [])

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="flex flex-col items-center justify-center text-gray-400">
          Cargando animes...
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Populares</h1>
        <p className="text-gray-400">Los animes más recientes en AniLine</p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-6">
        {animes.map((anime) => (
          <AnimeCard key={anime.id} anime={anime} />
        ))}
      </div>
    </div>
  )
}
