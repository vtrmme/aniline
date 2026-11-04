"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase"
import { t } from "@/lib/translations"
import { useLanguage } from "@/contexts/LanguageContext"

interface EpisodeFormProps {
  animeId?: string
  initial?: {
    id: string
    anime_id: string
    numero: number
    title_es?: string
    title_en?: string
    video_url: string
    orden: number
  }
  onSuccess: () => void
}

export function EpisodeForm({ animeId, initial, onSuccess }: EpisodeFormProps) {
  const { lang } = useLanguage()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [animes, setAnimes] = useState<{ id: string; title_es: string }[]>([])

  const [form, setForm] = useState({
    anime_id: animeId || initial?.anime_id || "",
    numero: String(initial?.numero || ""),
    title_es: initial?.title_es || "",
    title_en: initial?.title_en || "",
    video_url: initial?.video_url || "",
    orden: String(initial?.orden || ""),
  })

  useEffect(() => {
    const fetchAnimes = async () => {
      const supabase = createClient()
      const { data } = await supabase.from("animes").select("id, title_es").order("title_es")
      setAnimes((data || []) as { id: string; title_es: string }[])
    }
    fetchAnimes()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const supabase = createClient()

    const payload = {
      anime_id: form.anime_id,
      numero: parseInt(form.numero, 10),
      title_es: form.title_es || null,
      title_en: form.title_en || null,
      video_url: form.video_url,
      orden: parseInt(form.orden, 10),
    }

    let error: any = null
    if (initial?.id) {
      ;({ error } = await supabase.from("episodes").update(payload).eq("id", initial.id))
    } else {
      ;({ error } = await supabase.from("episodes").insert(payload))
    }

    setLoading(false)

    if (error) {
      alert(error.message)
      return
    }

    onSuccess()
    router.push("/admin/animes")
  }

  return (
    <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 max-w-2xl mx-auto">
      <h2 className="text-xl font-bold text-white mb-6">
        {initial?.id ? "Editar Episodio" : "Nuevo Episodio"}
      </h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm text-gray-400 mb-1">Anime</label>
          <select
            value={form.anime_id}
            onChange={(e) => setForm({ ...form, anime_id: e.target.value })}
            className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-white focus:border-red-600 outline-none"
            required
          >
            {animes.map((a) => (
              <option key={a.id} value={a.id}>
                {a.title_es}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1">Número de episodio</label>
          <input
            type="number"
            value={form.numero}
            onChange={(e) => setForm({ ...form, numero: e.target.value })}
            className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-white focus:border-red-600 outline-none"
            required
            placeholder="1"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1">Título (ES)</label>
          <input
            type="text"
            value={form.title_es}
            onChange={(e) => setForm({ ...form, title_es: e.target.value })}
            className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-white focus:border-red-600 outline-none"
            placeholder="Episodio 1"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1">Título (EN)</label>
          <input
            type="text"
            value={form.title_en}
            onChange={(e) => setForm({ ...form, title_en: e.target.value })}
            className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-white focus:border-red-600 outline-none"
            placeholder="Episode 1"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1">URL del video</label>
          <input
            type="text"
            value={form.video_url}
            onChange={(e) => setForm({ ...form, video_url: e.target.value })}
            className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-white focus:border-red-600 outline-none"
            required
            placeholder="https://ejemplo.com/video.mp4"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1">Orden</label>
          <input
            type="number"
            value={form.orden}
            onChange={(e) => setForm({ ...form, orden: e.target.value })}
            className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-white focus:border-red-600 outline-none"
            placeholder="1"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 px-4 text-white bg-red-600 hover:bg-red-700 rounded-lg font-medium disabled:opacity-50 transition"
        >
          {loading ? "Guardando..." : initial?.id ? "Guardar cambios" : "Crear episodio"}
        </button>

        <Link
          href="/admin/animes"
          className="block text-center text-sm text-gray-400 hover:text-white mt-3"
        >
          ← Volver al listado
        </Link>
      </form>
    </div>
  )
}
