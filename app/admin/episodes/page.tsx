"use client"

import { createClient } from "@/lib/supabase"
import { useEffect, useState } from "react"
import Link from "next/link"
import { Trash2, Edit3 } from "lucide-react"
import { t } from "@/lib/translations"
import { useLanguage } from "@/contexts/LanguageContext"

export default function EpisodesList() {
  const { lang } = useLanguage()
  const [episodes, setEpisodes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchEpisodes = async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from("episodes")
        .select("*, animes(title_es)")
        .order("numero", { ascending: true })
      setEpisodes((data || []) as any[])
      setLoading(false)
    }
    fetchEpisodes()
  }, [lang])

  const deleteEpisode = async (id: string) => {
    if (!confirm("¿Eliminar este episodio?")) return
    const supabase = createClient()
    const { error } = await supabase.from("episodes").delete().eq("id", id)
    if (error) {
      alert(error.message)
      return
    }
    setEpisodes(episodes.filter((e) => e.id !== id))
  }

  if (loading) {
    return <div className="text-center py-20 text-gray-400">Cargando...</div>
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      <div className="flex-1">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-white">Episodios</h2>
          <Link
            href="/admin/episodes/new"
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition"
          >
            + Nuevo episodio
          </Link>
        </div>

        <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-900 border-b border-gray-700">
                <th className="px-4 py-3 text-sm font-semibold text-gray-400">Anime</th>
                <th className="px-4 py-3 text-sm font-semibold text-gray-400">Número</th>
                <th className="px-4 py-3 text-sm font-semibold text-gray-400">Título ES</th>
                <th className="px-4 py-3 text-sm font-semibold text-gray-400">Título EN</th>
                <th className="px-4 py-3 text-sm font-semibold text-gray-400 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {episodes.map((e) => (
                <tr key={e.id} className="border-b border-gray-700 hover:bg-gray-900/50 transition">
                  <td className="px-4 py-3 text-white text-sm">{e.animes?.title_es || "—"}</td>
                  <td className="px-4 py-3 text-white font-mono">{e.numero}</td>
                  <td className="px-4 py-3 text-gray-300 text-sm">{e.title_es || "—"}</td>
                  <td className="px-4 py-3 text-gray-400 text-sm">{e.title_en || "—"}</td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/animes/${e.anime_id}`}
                      className="text-gray-400 hover:text-white mr-3"
                      title="Volver al anime"
                    >
                      ←
                    </Link>
                    <Link
                      href={`/admin/animes/${e.anime_id}`}
                      className="text-gray-400 hover:text-white mr-3"
                      title="Editar episodio"
                    >
                      <Edit3 size={18} />
                    </Link>
                    <button
                      onClick={() => deleteEpisode(e.id)}
                      className="text-gray-400 hover:text-red-400"
                      title="Eliminar"
                    >
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
              {episodes.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                    No hay episodios registrados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
