import { createClient } from "@/lib/supabase"

export const dynamic = "force-dynamic"

export default async function AdminDashboard() {
  const supabase = createClient()

  const [{ data: animes }, { data: episodes }] = await Promise.all([
    supabase.from("animes").select("id, title_es, created_at"),
    supabase.from("episodes").select("id, anime_id, numero"),
  ])

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Total Animes</h3>
        <p className="text-3xl font-bold text-white mt-2">{animes?.length || 0}</p>
      </div>
      <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Total Episodios</h3>
        <p className="text-3xl font-bold text-white mt-2">{episodes?.length || 0}</p>
      </div>
      <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Último Anime</h3>
        <p className="text-3xl font-bold text-white mt-2 truncate">
          {animes?.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]?.title_es || "—"}
        </p>
      </div>
    </div>
  )
}
