"use client"

import { createClient } from "@/lib/supabase"
import { useCallback, useEffect, useState } from "react"
import { Search } from "lucide-react"
import { cn } from "@/lib/utils"
import { AnimeCard } from "@/components/AnimeCard"
import { SkeletonAnimeCard } from "@/components/SkeletonAnimeCard"
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

interface Facetas {
  generos: string[]
  anios: number[]
  estados: string[]
}

export default function Buscar() {
  const { lang } = useLanguage()
  const [query, setQuery] = useState("")
  const [resultados, setResultados] = useState<Anime[]>([])
  const [total, setTotal] = useState(0)
  const [filtros, setFiltros] = useState<Filtros>({
    genero: "todos",
    anio: "todos",
    estado: "todos",
    orden: "recientes",
  })
  const [pagina, setPagina] = useState(1)
  const [loading, setLoading] = useState(false)
  const [buscado, setBuscado] = useState(false)
  const [facetas, setFacetas] = useState<Facetas>({
    generos: [],
    anios: [],
    estados: [],
  })

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const q = params.get("q")
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (q) setQuery(q)
  }, [])

  const cargarFacetas = useCallback(async () => {
    const supabase = createClient()
    const { data } = await supabase.from("animes").select("genero, anio, estado")

    const generos = new Set<string>()
    const anios = new Set<number>()
    const estados = new Set<string>()
    ;(data || []).forEach((f: { genero?: string[] | null; anio?: number | null; estado?: string | null }) => {
      if (f.genero) f.genero.forEach((g: string) => generos.add(g))
      if (typeof f.anio === "number") anios.add(f.anio)
      if (f.estado) estados.add(f.estado)
    })

    setFacetas({
      generos: Array.from(generos).sort(),
      anios: Array.from(anios).sort((a, b) => b - a),
      estados: Array.from(estados).sort(),
    })
  }, [])

  const cargarResultados = useCallback(async () => {
    setLoading(true)
    setBuscado(true)
    const supabase = createClient()
    const desde = (pagina - 1) * ITEMS_PER_PAGE
    const texto = query.trim().replace(/[(),]/g, " ")

    let qb = supabase.from("animes").select("*", { count: "exact" })

    if (texto) {
      qb = qb.or(`title_es.ilike.%${texto}%,title_en.ilike.%${texto}%`)
    }
    if (filtros.genero !== "todos") {
      qb = qb.contains("genero", [filtros.genero])
    }
    if (filtros.anio !== "todos") {
      qb = qb.eq("anio", Number(filtros.anio))
    }
    if (filtros.estado !== "todos") {
      qb = qb.eq("estado", filtros.estado)
    }
    if (filtros.orden === "puntuacion") {
      qb = qb.order("puntuacion", { ascending: false, nullsFirst: false })
    } else {
      qb = qb.order("created_at", { ascending: false })
    }

    const { data, count } = await qb.range(desde, desde + ITEMS_PER_PAGE - 1)

    setResultados((data || []) as Anime[])
    setTotal(count || 0)
    setLoading(false)
  }, [query, filtros, pagina])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    cargarFacetas()
  }, [cargarFacetas])

  useEffect(() => {
    const timer = setTimeout(cargarResultados, 300)
    return () => clearTimeout(timer)
  }, [cargarResultados])

  const totalPaginas = Math.max(1, Math.ceil(total / ITEMS_PER_PAGE))

  const cambiarFiltro = (clave: keyof Filtros, valor: string | Filtros["orden"]) => {
    setFiltros((prev) => ({ ...prev, [clave]: valor as Filtros[keyof Filtros] }))
    setPagina(1)
  }

  const cambiarQuery = (valor: string) => {
    setQuery(valor)
    setPagina(1)
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">{t(lang, "navSearch")}</h1>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-4 top-3.5 h-5 w-5 text-gray-400" />
        <input
          type="text"
          placeholder={t(lang, "searchPlaceholder")}
          value={query}
          onChange={(e) => cambiarQuery(e.target.value)}
          className="w-full rounded-2xl border border-white/10 bg-[var(--surface)] py-3.5 pl-12 pr-4 text-white transition placeholder:text-gray-500 focus:border-[var(--brand)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/30"
        />
      </div>

      {query.trim() && (
        <div className="mb-6 flex flex-wrap gap-3">
          <select
            value={filtros.genero}
            onChange={(e) => cambiarFiltro("genero", e.target.value)}
            className="rounded-xl border border-white/10 bg-[var(--surface)] px-3 py-2 text-sm text-white transition focus:border-[var(--brand)] focus:outline-none"
          >
            <option value="todos">{t(lang, "homeFilterTodos")}</option>
            {facetas.generos.map((g) => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
          <select
            value={filtros.anio}
            onChange={(e) => cambiarFiltro("anio", e.target.value)}
            className="rounded-xl border border-white/10 bg-[var(--surface)] px-3 py-2 text-sm text-white transition focus:border-[var(--brand)] focus:outline-none"
          >
            <option value="todos">{t(lang, "homeFilterAnio")}</option>
            {facetas.anios.map((a) => (
              <option key={a} value={String(a)}>{a}</option>
            ))}
          </select>
          <select
            value={filtros.estado}
            onChange={(e) => cambiarFiltro("estado", e.target.value)}
            className="rounded-xl border border-white/10 bg-[var(--surface)] px-3 py-2 text-sm text-white transition focus:border-[var(--brand)] focus:outline-none"
          >
            <option value="todos">{t(lang, "homeFilterEstado")}</option>
            {facetas.estados.map((e) => (
              <option key={e} value={e}>{e}</option>
            ))}
          </select>
          <select
            value={filtros.orden}
            onChange={(e) => cambiarFiltro("orden", e.target.value as Filtros["orden"])}
            className="rounded-xl border border-white/10 bg-[var(--surface)] px-3 py-2 text-sm text-white transition focus:border-[var(--brand)] focus:outline-none"
          >
            <option value="recientes">{t(lang, "homeOrderRecientes")}</option>
            <option value="puntuacion">{t(lang, "homeOrderPuntuacion")}</option>
          </select>
        </div>
      )}

      {loading && (
        <div className="grid grid-cols-2 gap-6 py-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <SkeletonAnimeCard key={i} />
          ))}
        </div>
      )}

      {!loading && resultados.length === 0 && query.trim() && (
        <p className="py-10 text-center text-gray-400">{t(lang, "searchNoResults")}</p>
      )}

      {!loading && resultados.length > 0 && (
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {resultados.map((anime) => (
            <AnimeCard key={anime.id} anime={anime} lang={lang} />
          ))}
        </div>
      )}

      {!loading && buscado && totalPaginas > 1 && (
        <div className="mt-8 flex items-center justify-between">
          <button
            onClick={() => setPagina((p) => Math.max(1, p - 1))}
            disabled={pagina === 1}
            className={cn(
              "rounded-lg px-4 py-2 text-sm font-medium transition",
              pagina === 1
                ? "bg-[var(--surface)] text-gray-500"
                : "bg-[var(--surface)] text-white hover:bg-[var(--surface-hover)]"
            )}
          >
            ← Anterior
          </button>
          <span className="text-sm text-gray-400">Página {pagina} de {totalPaginas}</span>
          <button
            onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
            disabled={pagina >= totalPaginas}
            className={cn(
              "rounded-lg px-4 py-2 text-sm font-medium transition",
              pagina >= totalPaginas
                ? "bg-[var(--surface)] text-gray-500"
                : "bg-[var(--surface)] text-white hover:bg-[var(--surface-hover)]"
            )}
          >
            Siguiente →
          </button>
        </div>
      )}
    </div>
  )
}
