"use client"

import { createClient } from "@/lib/supabase"
import { useCallback, useEffect, useState, useMemo } from "react"
import { Search } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { cn } from "@/lib/utils"
import type { Anime } from "@/types"
import { useLanguage } from "@/contexts/LanguageContext"
import { t } from "@/lib/translations"

const ITEMS_PER_PAGE = 20

interface Filtros {
  genero: string
  anio: string
  estado: string
  orden: "recientes" | "puntuacion"
}

export default function Buscar() {
  const { lang } = useLanguage()
  const [query, setQuery] = useState("")
  const [resultados, setResultados] = useState<Anime[]>([])
  const [filtros, setFiltros] = useState<Filtros>({
    genero: "todos",
    anio: "todos",
    estado: "todos",
    orden: "recientes",
  })
  const [pagina, setPagina] = useState(1)
  const [loading, setLoading] = useState(false)
  const [generosDisponibles, setGenerosDisponibles] = useState<string[]>([])
  const [aniosDisponibles, setAniosDisponibles] = useState<number[]>([])
  const [estadosDisponibles, setEstadosDisponibles] = useState<string[]>([])

  const cargarAnimes = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()
    let queryBuilder = supabase.from("animes").select("*")

    if (query.trim()) {
      queryBuilder = queryBuilder.ilike("title_es", `%${query}%`)
    }

    const { data } = await queryBuilder.order("created_at", { ascending: false }).limit(100)
    setResultados((data || []) as Anime[])
    const resultadosData = (data || []) as Anime[]

    const generos = new Set<string>()
    const anios = new Set<number>()
    const estados = new Set<string>()
    resultadosData.forEach((a: Anime) => {
      if (a.genero) a.genero.forEach((g: string) => generos.add(g))
      if (a.anio) anios.add(a.anio)
      if (a.estado) estados.add(a.estado)
    })
    setGenerosDisponibles(Array.from(generos).sort())
    setAniosDisponibles(Array.from(anios).sort((a, b) => b - a))
    setEstadosDisponibles(Array.from(estados).sort())
    setLoading(false)
  }, [query])

  useEffect(() => {
    const timer = setTimeout(cargarAnimes, 300)
    return () => clearTimeout(timer)
  }, [cargarAnimes])

  const filtrados = useMemo(() => {
    let r = [...resultados]

    if (filtros.genero !== "todos") {
      r = r.filter((a) => a.genero?.includes(filtros.genero))
    }
    if (filtros.anio !== "todos") {
      r = r.filter((a) => String(a.anio) === filtros.anio)
    }
    if (filtros.estado !== "todos") {
      r = r.filter((a) => a.estado === filtros.estado)
    }

    if (filtros.orden === "puntuacion") {
      r.sort((a, b) => (b.puntuacion || 0) - (a.puntuacion || 0))
    } else {
      r.sort(
        (a, b) =>
          new Date(b.created_at || 0).getTime() -
          new Date(a.created_at || 0).getTime()
      )
    }

    return r
  }, [resultados, filtros])

  const totalPaginas = Math.ceil(filtrados.length / ITEMS_PER_PAGE)
  const paginaItems = useMemo(() => {
    const inicio = (pagina - 1) * ITEMS_PER_PAGE
    return filtrados.slice(inicio, inicio + ITEMS_PER_PAGE)
  }, [filtrados, pagina])

  const cambiarFiltro = (clave: keyof Filtros, valor: string | Filtros["orden"]) => {
    setFiltros((prev) => ({ ...prev, [clave]: valor as Filtros[keyof Filtros] }))
    setPagina(1)
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">{t(lang, "navSearch")}</h1>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
        <input
          type="text"
          placeholder={t(lang, "searchPlaceholder")}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white focus:outline-none focus:border-red-600 transition"
        />
      </div>

      {query.trim() && (
        <div className="flex flex-wrap gap-3 mb-6">
          <select
            value={filtros.genero}
            onChange={(e) => cambiarFiltro("genero", e.target.value)}
            className="bg-gray-800 border border-gray-700 text-white text-sm rounded-xl px-3 py-2 focus:outline-none focus:border-red-600 transition"
          >
            <option value="todos">{t(lang, "homeFilterTodos")}</option>
            {generosDisponibles.map((g) => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
          <select
            value={filtros.anio}
            onChange={(e) => cambiarFiltro("anio", e.target.value)}
            className="bg-gray-800 border border-gray-700 text-white text-sm rounded-xl px-3 py-2 focus:outline-none focus:border-red-600 transition"
          >
            <option value="todos">{t(lang, "homeFilterAnio")}</option>
            {aniosDisponibles.map((a) => (
              <option key={a} value={String(a)}>{a}</option>
            ))}
          </select>
          <select
            value={filtros.estado}
            onChange={(e) => cambiarFiltro("estado", e.target.value)}
            className="bg-gray-800 border border-gray-700 text-white text-sm rounded-xl px-3 py-2 focus:outline-none focus:border-red-600 transition"
          >
            <option value="todos">{t(lang, "homeFilterEstado")}</option>
            {estadosDisponibles.map((e) => (
              <option key={e} value={e}>{e}</option>
            ))}
          </select>
          <select
            value={filtros.orden}
            onChange={(e) => cambiarFiltro("orden", e.target.value as Filtros["orden"])}
            className="bg-gray-800 border border-gray-700 text-white text-sm rounded-xl px-3 py-2 focus:outline-none focus:border-red-600 transition"
          >
            <option value="recientes">{t(lang, "homeOrderRecientes")}</option>
            <option value="puntuacion">{t(lang, "homeOrderPuntuacion")}</option>
          </select>
        </div>
      )}

      {loading && (
        <div className="flex flex-col items-center justify-center text-gray-400 py-10">
          <div className="animate-pulse rounded-full h-10 w-10 bg-gray-800 mb-3"></div>
          Cargando...
        </div>
      )}

      {!loading && paginaItems.length === 0 && query.trim() && (
        <p className="text-gray-400 text-center py-10">{t(lang, "searchNoResults")}</p>
      )}

      {!loading && paginaItems.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-6">
          {paginaItems.map((anime) => {
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
                <h3 className="text-sm font-medium text-white truncate">{title}</h3>
              </Link>
            )
          })}
        </div>
      )}

      {!loading && totalPaginas > 1 && (
        <div className="mt-8 flex items-center justify-between">
          <button
            onClick={() => setPagina((p) => Math.max(p - 1, 1))}
            disabled={pagina === 1}
            className={cn(
              "px-4 py-2 text-sm font-medium rounded-lg transition",
              pagina === 1
                ? "bg-gray-800 text-gray-500"
                : "bg-gray-800 text-white hover:bg-gray-700"
            )}
          >
            ← Anterior
          </button>
          <span className="text-sm text-gray-400">Página {pagina} de {totalPaginas}</span>
          <button
            onClick={() => setPagina((p) => Math.min(p + 1, totalPaginas))}
            disabled={pagina === totalPaginas}
            className={cn(
              "px-4 py-2 text-sm font-medium rounded-lg transition",
              pagina === totalPaginas
                ? "bg-gray-800 text-gray-500"
                : "bg-gray-800 text-white hover:bg-gray-700"
            )}
          >
            Siguiente →
          </button>
        </div>
      )}
    </div>
  )
}
