"use client"

import { createClient } from "@/lib/supabase"
import { useEffect, useState } from "react"
import { AnimeForm } from "@/components/admin/AnimeForm"
import { useRouter, useParams } from "next/navigation"

export default function EditAnime() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const [anime, setAnime] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchAnime = async () => {
      const supabase = createClient()
      const { data } = await supabase.from("animes").select("*").eq("id", params.id).single()
      setAnime(data)
      setLoading(false)
    }
    fetchAnime()
  }, [params.id])

  if (loading || !anime) {
    return <div className="text-center py-20 text-gray-400">Cargando...</div>
  }

  return (
    <AnimeForm
      initial={{
        id: anime.id,
        slug: anime.slug,
        title_es: anime.title_es,
        title_en: anime.title_en,
        sinopsis_es: anime.sinopsis_es,
        sinopsis_en: anime.sinopsis_en,
        poster_url: anime.poster_url,
        banner_url: anime.banner_url,
        genero: anime.genero,
        anio: anime.anio,
        estado: anime.estado,
      }}
      onSuccess={() => router.push("/admin/animes")}
    />
  )
}
