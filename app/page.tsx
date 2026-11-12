"use client"

import { createClient } from "@/lib/supabase"
import { AnimeCard } from "@/components/AnimeCard"
import { AnimeRow } from "@/components/AnimeRow"
import { LatestEpisodes } from "@/components/LatestEpisodes"
import { HeroBanner } from "@/components/HeroBanner"
import { ContinueWatching } from "@/components/ContinueWatching"
import { SkeletonAnimeCard } from "@/components/SkeletonAnimeCard"
import { cn } from "@/lib/utils"
import { Suspense, useEffect, useState, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
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

interface Facetas {
  generos: string[]
  anios: number[]
  estados: string[]
}

function HomeContent() {
  const { lang } = useLanguage()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [animes, setAnimes] = useState<Anime[]>([])
  const [total, setTotal] = useState(0)
  const [filtros, setFiltros] = useState<Filtros>({
    genero: "todos",
    anio: "todos",
    estado: "todos",
    orden: "recientes",
  })
  const [pagina, setPagina] = useState(1)
  const [loading, setLoading] = useState(true)
  const [facetas, setFacetas] = useState<Facetas>({
    generos: [],
    anios: [],
    estados: [],
  })

  useEffect(() => {
    const estado = searchParams.get("estado")
    const orden = searchParams.get("orden")
    const genero = searchParams.get("genero")
    const anio = searchParams.get("anio")
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFiltros({
      genero: genero ?? "todos",
      anio: anio ?? "todos",
      estado: estado ?? "todos",
      orden: orden === "puntuacion" ? "puntuacion" : "recientes",
    })
    setPagina(1)
  }, [searchParams])

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

  const cargarAnimes = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()
    const desde = (pagina - 1) * ITEMS_PER_PAGE

    let qb = supabase.from("animes").select("*", { count: "exact" })

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

    setAnimes((data || []) as Anime[])
    setTotal(count || 0)
    setLoading(false)
  }, [filtros, pagina])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    cargarFacetas()
    cargarAnimes()
  }, [cargarFacetas, cargarAnimes])

  const totalPaginas = Math.max(1, Math.ceil(total / ITEMS_PER_PAGE))

  const cambiarFiltro = (clave: keyof Filtros, valor: string | Filtros["orden"]) => {
    setFiltros((prev) => ({ ...prev, [clave]: valor as Filtros[keyof Filtros] }))
    setPagina(1)

    const params = new URLSearchParams(searchParams.toString())
    if (valor === "todos" || (clave === "orden" && valor === "recientes")) {
      params.delete(clave)
    } else {
      params.set(clave, String(valor))
    }
    const qs = params.toString()
    router.replace(qs ? `/?${qs}` : "/", { scroll: false })
  }

  const hayFiltroNav =
    filtros.estado !== "todos" ||
    filtros.genero !== "todos" ||
    filtros.anio !== "todos" ||
    filtros.orden !== "recientes"

  const tituloSeccion =
    filtros.estado === "en emisión"
      ? t(lang, "sectionSimulcasts")
      : filtros.orden === "puntuacion"
        ? t(lang, "sectionPopular")
        : t(lang, "sectionExplore")

  const limpiarFiltros = () => {
    setFiltros({ genero: "todos", anio: "todos", estado: "todos", orden: "recientes" })
    setPagina(1)
    router.replace("/", { scroll: false })
  }

  return (
    <div>
      <HeroBanner />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <ContinueWatching />

        <LatestEpisodes />

        <AnimeRow
          title={t(lang, "sectionSimulcasts")}
          filtro={{ campo: "estado", valor: "en emisión" }}
          orden="puntuacion"
        />

        <AnimeRow
          title={t(lang, "sectionPopular")}
          orden="puntuacion"
        />

        <AnimeRow
          title={t(lang, "sectionActionFantasy")}
          filtro={{ campo: "genero", valor: "Acción" }}
          orden="puntuacion"
        />

        <div
          id="explorar"
          className="mb-8 flex flex-col justify-between gap-4 scroll-mt-24 lg:flex-row lg:items-center"
        >
          <div>
            <h1 className="text-3xl font-bold text-white">{tituloSeccion}</h1>
            <p className="text-gray-400">{t(lang, "homeSubtitle")}</p>
            {hayFiltroNav && (
              <button
                type="button"
                onClick={limpiarFiltros}
                className="badge-brand mt-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold transition hover:brightness-125"
              >
                {filtros.estado !== "todos" ? filtros.estado : null}
                {filtros.estado !== "todos" &&
                (filtros.genero !== "todos" || filtros.orden !== "recientes")
                  ? " · "
                  : null}
                {filtros.genero !== "todos" ? filtros.genero : null}
                {filtros.anio !== "todos"
                  ? `${filtros.genero !== "todos" ? " · " : ""}${filtros.anio}`
                  : null}
                {filtros.orden === "puntuacion" && filtros.estado === "todos"
                  ? t(lang, "homeOrderPuntuacion")
                  : null}
                <span aria-hidden="true">✕</span>
              </button>
            )}
          </div>

          <div className="flex flex-wrap gap-3">
            <select
              value={filtros.genero}
              onChange={(e) => cambiarFiltro("genero", e.target.value)}
              className="rounded-xl border border-white/10 bg-[var(--surface)] px-3 py-2 text-sm text-white transition focus:border-[var(--brand)] focus:outline-none"
            >
              <option value="todos">{t(lang, "homeFilterTodos")}</option>
              {facetas.generos.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
            <select
              value={filtros.anio}
              onChange={(e) => cambiarFiltro("anio", e.target.value)}
              className="rounded-xl border border-white/10 bg-[var(--surface)] px-3 py-2 text-sm text-white transition focus:border-[var(--brand)] focus:outline-none"
            >
              <option value="todos">{t(lang, "homeFilterAnio")}</option>
              {facetas.anios.map((a) => (
                <option key={a} value={String(a)}>
                  {a}
                </option>
              ))}
            </select>
            <select
              value={filtros.estado}
              onChange={(e) => cambiarFiltro("estado", e.target.value)}
              className="rounded-xl border border-white/10 bg-[var(--surface)] px-3 py-2 text-sm text-white transition focus:border-[var(--brand)] focus:outline-none"
            >
              <option value="todos">{t(lang, "homeFilterEstado")}</option>
              {facetas.estados.map((e) => (
                <option key={e} value={e}>
                  {e}
                </option>
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
        </div>

        <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8">
          {loading
            ? Array.from({ length: 16 }).map((_, i) => (
                <SkeletonAnimeCard key={i} />
              ))
            : animes.map((anime) => (
                <AnimeCard key={anime.id} anime={anime} lang={lang} />
              ))}
          {!loading && animes.length === 0 && (
            <div className="col-span-full py-20 text-center text-gray-400">
              {t(lang, "searchNoResults")}
            </div>
          )}
        </div>

        {totalPaginas > 1 && (
          <div className="mt-10 flex items-center justify-between">
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
            <span className="text-sm text-gray-400">
              Página {pagina} de {totalPaginas}
            </span>
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
    </div>
  )
}

export default function Home() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8">
            {Array.from({ length: 16 }).map((_, i) => (
              <SkeletonAnimeCard key={i} />
            ))}
          </div>
        </div>
      }
    >
      <HomeContent />
    </Suspense>
  )
}
