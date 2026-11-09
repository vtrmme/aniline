"use client"

import { createClient } from "@/lib/supabase"
import { useCallback, useEffect, useState } from "react"
import { Search } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import type { Anime } from "@/types"
import { useLanguage } from "@/contexts/LanguageContext"
import { t } from "@/lib/translations"

export default function Buscar() {
  const { lang } = useLanguage()
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<Anime[]>([])
  const [loading, setLoading] = useState(false)

  const buscar = useCallback(async () => {
    if (!query.trim()) {
      setResults([])
      return
    }
    setLoading(true)
    const supabase = createClient()
    const { data } = await supabase
      .from("animes")
      .select("*")
      .ilike("title_es", `%${query}%`)
      .limit(20)
    setResults((data || []) as Anime[])
    setLoading(false)
  }, [query])

  useEffect(() => {
    const timer = setTimeout(buscar, 300)
    return () => clearTimeout(timer)
  }, [buscar])

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">{t(lang, "navSearch")}</h1>
      </div>
      <div className="relative mb-8">
        <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
        <input
          type="text"
          placeholder={t(lang, "searchPlaceholder")}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white focus:outline-none focus:border-red-600 transition"
        />
      </div>
      {loading && <p className="text-gray-400">{t(lang, "searchPlaceholder")}...</p>}
      {!loading && results.length === 0 && query && (
        <p className="text-gray-400">{t(lang, "searchNoResults")}</p>
      )}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-6">
        {results.map((anime) => {
          const title = lang === "es" ? anime.title_es : anime.title_en || anime.title_es
          return (
            <Link key={anime.id} href={`/anime/${anime.slug}`} className="block">
              <div className="relative aspect-[2/3] rounded-xl overflow-hidden bg-gray-800 mb-2">
                <Image
                  src={anime.poster_url && anime.poster_url.startsWith("http") ? anime.poster_url : "/placeholder-anime.svg"}
                  alt={title}
                  className="w-full h-full object-cover"
                  width={300}
                  height={450}
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                />
              </div>
              <h3 className="text-sm font-medium text-white truncate">
                {title}
              </h3>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
