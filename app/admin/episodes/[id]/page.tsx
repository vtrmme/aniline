"use client"

import { createClient } from "@/lib/supabase"
import { useEffect, useState } from "react"
import { EpisodeForm } from "@/components/admin/EpisodeForm"
import { useRouter, useParams } from "next/navigation"

export default function EditEpisode() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const [episode, setEpisode] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchEpisode = async () => {
      const supabase = createClient()
      const { data } = await supabase.from("episodes").select("*").eq("id", params.id).single()
      setEpisode(data)
      setLoading(false)
    }
    fetchEpisode()
  }, [params.id])

  if (loading || !episode) {
    return <div className="text-center py-20 text-gray-400">Cargando...</div>
  }

  return (
    <EpisodeForm
      animeId={episode.anime_id}
      initial={{
        id: episode.id,
        anime_id: episode.anime_id,
        numero: episode.numero,
        title_es: episode.title_es,
        title_en: episode.title_en,
        video_url: episode.video_url,
        orden: episode.orden,
      }}
      onSuccess={() => router.push("/admin/animes")}
    />
  )
}
