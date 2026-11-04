"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase"
import { t } from "@/lib/translations"
import { useLanguage } from "@/contexts/LanguageContext"

interface AnimeFormProps {
  initial?: {
    id: string
    slug: string
    title_es: string
    title_en?: string
    sinopsis_es?: string
    sinopsis_en?: string
    poster_url?: string
    banner_url?: string
    genero?: string[]
    anio?: number
    estado?: string
  }
  onSuccess: () => void
}

export function AnimeForm({ initial, onSuccess }: AnimeFormProps) {
  const { lang } = useLanguage()
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const [form, setForm] = useState({
    slug: initial?.slug || "",
    title_es: initial?.title_es || "",
    title_en: initial?.title_en || "",
    sinopsis_es: initial?.sinopsis_es || "",
    sinopsis_en: initial?.sinopsis_en || "",
    poster_url: initial?.poster_url || "",
    banner_url: initial?.banner_url || "",
    genero: (initial?.genero || []).join(","),
    anio: String(initial?.anio || ""),
    estado: initial?.estado || "emitido",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const supabase = createClient()

    const payload = {
      slug: form.slug,
      title_es: form.title_es,
      title_en: form.title_en || null,
      sinopsis_es: form.sinopsis_es || null,
      sinopsis_en: form.sinopsis_en || null,
      poster_url: form.poster_url || null,
      banner_url: form.banner_url || null,
      genero: form.genero.split(",").map((g) => g.trim()).filter(Boolean),
      anio: form.anio ? parseInt(form.anio, 10) : null,
      estado: form.estado,
    }

    let error: any = null
    if (initial?.id) {
      ;({ error } = await supabase.from("animes").update(payload).eq("id", initial.id))
    } else {
      ;({ error } = await supabase.from("animes").insert(payload))
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
        {initial?.id ? "Editar Anime" : "Nuevo Anime"}
      </h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Slug</label>
            <input
              type="text"
              value={form.slug}
              onChange={(e) => setForm({ ...form, slug: e.target.value })}
              className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-white focus:border-red-600 outline-none"
              placeholder="shingeki-no-kyojin"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Estado</label>
            <select
              value={form.estado}
              onChange={(e) => setForm({ ...form, estado: e.target.value })}
              className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-white focus:border-red-600 outline-none"
            >
              <option value="emitido">Emitido</option>
              <option value="en_emision">En emisión</option>
              <option value="proximo">Próximo</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1">Título (ES)</label>
          <input
            type="text"
            value={form.title_es}
            onChange={(e) => setForm({ ...form, title_es: e.target.value })}
            className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-white focus:border-red-600 outline-none"
            required
          />
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1">Título (EN)</label>
          <input
            type="text"
            value={form.title_en}
            onChange={(e) => setForm({ ...form, title_en: e.target.value })}
            className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-white focus:border-red-600 outline-none"
            placeholder="Attack on Titan"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1">Sinopsis (ES)</label>
          <textarea
            value={form.sinopsis_es}
            onChange={(e) => setForm({ ...form, sinopsis_es: e.target.value })}
            rows={3}
            className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-white focus:border-red-600 outline-none"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1">Sinopsis (EN)</label>
          <textarea
            value={form.sinopsis_en}
            onChange={(e) => setForm({ ...form, sinopsis_en: e.target.value })}
            rows={3}
            className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-white focus:border-red-600 outline-none"
            placeholder="Synopsis in English"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1">Poster URL</label>
          <input
            type="text"
            value={form.poster_url}
            onChange={(e) => setForm({ ...form, poster_url: e.target.value })}
            className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-white focus:border-red-600 outline-none"
            placeholder="https://ejemplo.com/poster.jpg"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1">Banner URL</label>
          <input
            type="text"
            value={form.banner_url}
            onChange={(e) => setForm({ ...form, banner_url: e.target.value })}
            className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-white focus:border-red-600 outline-none"
            placeholder="https://ejemplo.com/banner.jpg"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1">Géneros (separados por coma)</label>
          <input
            type="text"
            value={form.genero}
            onChange={(e) => setForm({ ...form, genero: e.target.value })}
            className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-white focus:border-red-600 outline-none"
            placeholder="accion, drama, fantasía"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1">Año</label>
          <input
            type="number"
            value={form.anio}
            onChange={(e) => setForm({ ...form, anio: e.target.value })}
            className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-white focus:border-red-600 outline-none"
            placeholder="2024"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 px-4 text-white bg-red-600 hover:bg-red-700 rounded-lg font-medium disabled:opacity-50 transition"
        >
          {loading ? "Guardando..." : initial?.id ? "Guardar cambios" : "Crear anime"}
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
