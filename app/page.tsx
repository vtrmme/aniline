"use client"

import { createClient } from "@/lib/supabase"
import { AnimeCard } from "@/components/AnimeCard"
import { LatestEpisodes } from "@/components/LatestEpisodes"
import { cn } from "@/lib/utils"
import { useEffect, useState, useCallback, useMemo } from "react"
import type { Anime } from "@/types"
import { useLanguage } from "@/contexts/LanguageContext"
import { t } from "@/lib/translations"

const ITEMS_PER_PAGE = 24

interface Filtros {
  genero: string
  anio: string
  estado: string
  orden: "recientes" | "puntuacion"
}

export default function Home() {
  const { lang } = useLanguage()
  const [animes, setAnimes] = useState<Anime[]>([])
  const [filtros, setFiltros] = useState<Filtros>({
    genero: "todos",
    anio: "todos",
    estado: "todos",
    orden: "recientes",
  })
  const [pagina, setPagina] = useState(1)
  const [loading, setLoading] = useState(true)
  const [generosDisponibles, setGenerosDisponibles] = useState<string[]>([])
  const [aniosDisponibles, setAniosDisponibles] = useState<number[]>([])
  const [estadosDisponibles, setEstadosDisponibles] = useState<string[]>([])

  const cargarAnimes = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()
    const { data } = await supabase
      .from("animes")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100)
    setAnimes((data || []) as Anime[])
    const animesData = (data || []) as Anime[]

    const generos = new Set<string>()
    const anios = new Set<number>()
    const estados = new Set<string>()
    animesData.forEach((a: Anime) => {
      if (a.genero) a.genero.forEach((g: string) => generos.add(g))
      if (a.anio) anios.add(a.anio)
      if (a.estado) estados.add(a.estado)
    })
    setGenerosDisponibles(Array.from(generos).sort())
    setAniosDisponibles(Array.from(anios).sort((a, b) => b - a))
    setEstadosDisponibles(Array.from(estados).sort())
    setLoading(false)
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
  cargarAnimes()
  }, [cargarAnimes])

  const animesFiltrados = useMemo(() => {
    let resultado = [...animes]

    if (filtros.genero !== "todos") {
      resultado = resultado.filter((a) => a.genero?.includes(filtros.genero))
    }
    if (filtros.anio !== "todos") {
      resultado = resultado.filter((a) => String(a.anio) === filtros.anio)
    }
    if (filtros.estado !== "todos") {
      resultado = resultado.filter((a) => a.estado === filtros.estado)
    }

    if (filtros.orden === "puntuacion") {
      resultado.sort((a, b) => (b.puntuacion || 0) - (a.puntuacion || 0))
    } else {
      resultado.sort(
        (a, b) =>
          new Date(b.created_at || 0).getTime() -
          new Date(a.created_at || 0).getTime()
      )
    }

    return resultado
  }, [animes, filtros])

  const totalPaginas = Math.ceil(animesFiltrados.length / ITEMS_PER_PAGE)
  const animesPagina = useMemo(() => {
    const inicio = (pagina - 1) * ITEMS_PER_PAGE
    return animesFiltrados.slice(inicio, inicio + ITEMS_PER_PAGE)
  }, [animesFiltrados, pagina])

  const cambiarFiltro = (clave: keyof Filtros, valor: string | Filtros["orden"]) => {
    setFiltros((prev) => ({ ...prev, [clave]: valor as Filtros[keyof Filtros] }))
    setPagina(1)
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="flex flex-col items-center justify-center text-gray-400">
          <div className="animate-pulse rounded-full h-12 w-12 bg-gray-800 mb-4"></div>
          {t(lang, "homePopulares")}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <LatestEpisodes />

      <div className="mb-8 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">{t(lang, "homePopulares")}</h1>
          <p className="text-gray-400">{t(lang, "homeSubtitle")}</p>
        </div>

        <div className="flex flex-wrap gap-3">
          <select
            value={filtros.genero}
            onChange={(e) => cambiarFiltro("genero", e.target.value)}
            className="bg-gray-800 border border-gray-700 text-white text-sm rounded-xl px-3 py-2 focus:outline-none focus:border-red-600 transition"
          >
            <option value="todos">{t(lang, "homeFilterTodos")}</option>
            {generosDisponibles.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
          <select
            value={filtros.anio}
            onChange={(e) => cambiarFiltro("anio", e.target.value)}
            className="bg-gray-800 border border-gray-700 text-white text-sm rounded-xl px-3 py-2 focus:outline-none focus:border-red-600 transition"
          >
            <option value="todos">{t(lang, "homeFilterAnio")}</option>
            {aniosDisponibles.map((a) => (
              <option key={a} value={String(a)}>
                {a}
              </option>
            ))}
          </select>
          <select
            value={filtros.estado}
            onChange={(e) => cambiarFiltro("estado", e.target.value)}
            className="bg-gray-800 border border-gray-700 text-white text-sm rounded-xl px-3 py-2 focus:outline-none focus:border-red-600 transition"
          >
            <option value="todos">{t(lang, "homeFilterEstado")}</option>
            {estadosDisponibles.map((e) => (
              <option key={e} value={e}>
                {e}
              </option>
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
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-6">
        {animesPagina.map((anime) => (
          <AnimeCard key={anime.id} anime={anime} lang={lang} />
        ))}
        {animesPagina.length === 0 && animesFiltrados.length > 0 && (
          <div className="col-span-full text-center py-20 text-gray-400">
            {t(lang, "searchNoResults")}
          </div>
        )}
        {animesPagina.length === 0 && animesFiltrados.length === 0 && !loading && (
          <div className="col-span-full text-center py-20 text-gray-400">
            {t(lang, "searchNoResults")}
          </div>
        )}
      </div>

      {totalPaginas > 1 && (
        <div className="mt-10 flex items-center justify-between">
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
          <span className="text-sm text-gray-400">
            Página {pagina} de {totalPaginas}
          </span>
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
            {pagina === totalPaginas ? "Siguiente →" : "Next →"}
          </button>
        </div>
      )}
    </div>
  )
}
