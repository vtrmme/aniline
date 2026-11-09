"use client"

import { createClient } from "@/lib/supabase"
import { notFound, useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { useEffect, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import type { Anime, Episode } from "@/types"
import { useLanguage } from "@/contexts/LanguageContext"
import { t } from "@/lib/translations"
import { cn } from "@/lib/utils"

interface AnimeWithEpisodes extends Anime {
  episodes?: Episode[]
}

export default function AnimeDetail({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { lang } = useLanguage()
  const { data: session } = useSession()
  const router = useRouter()
  const userId = (session?.user as { id?: string })?.id
  const [anime, setAnime] = useState<AnimeWithEpisodes | null>(null)
  const [slug, setSlug] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [watchlistItem, setWatchlistItem] = useState<{ estado: string; puntuacion?: number } | null>(null)
  const [watchlistLoading, setWatchlistLoading] = useState(false)
  const [puntuacion, setPuntuacionState] = useState<number | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [similares, setSimilares] = useState<Anime[]>([])

  useEffect(() => {
    let cancelled = false
    params.then(({ slug: s }) => {
      if (cancelled) return
      setSlug(s)
    })
    return () => {
      cancelled = true
    }
  }, [lang])

  useEffect(() => {
    if (!slug) return
    const fetchAnime = async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from("animes")
        .select("*, episodes(*)")
        .eq("slug", slug)
        .single()

      if (!data) {
        notFound()
        return
      }

      setAnime(data as AnimeWithEpisodes)
      setLoading(false)

      const genero = (data as Anime).genero?.[0]
      if (genero) {
        const { data: sim } = await supabase
          .from("animes")
          .select("*")
          .ilike("genero", `%${genero}%`)
          .neq("slug", slug)
          .limit(6)
        setSimilares((sim || []) as Anime[])
      }
    }

    fetchAnime()
  }, [slug, lang])

  const animeId = anime?.id

  useEffect(() => {
    if (!animeId || !userId) return
    const checkWatchlist = async () => {
      try {
        const res = await fetch(`/api/watchlist?anime_id=${animeId}`)
        if (res.ok) {
          const json = await res.json()
          setWatchlistItem(json.inList ? { estado: json.estado, puntuacion: json.puntuacion } : null)
          setPuntuacionState(json.inList ? (json.puntuacion || null) : null)
        }
      } catch {
        // ignore
      }
    }
    checkWatchlist()
  }, [animeId, userId])

  const toggleWatchlist = async (estado: string) => {
    if (!userId || !animeId) return
    setWatchlistLoading(true)
    setErrorMsg(null)

    const current = watchlistItem?.estado === estado
    if (current && watchlistItem) {
      const res = await fetch(`/api/watchlist?anime_id=${animeId}`, {
        method: "DELETE",
      })
      if (res.ok) {
        setWatchlistItem(null)
        setPuntuacionState(null)
      } else {
        const json = await res.json().catch(() => ({}))
        setErrorMsg(json.error || "Error al quitar de la lista")
      }
    } else {
      const res = await fetch("/api/watchlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ anime_id: animeId, estado, puntuacion }),
      })
      if (res.ok) {
        const json = await res.json()
        setWatchlistItem({ estado: json.estado, puntuacion: json.puntuacion })
        setPuntuacionState(json.puntuacion || null)
      } else {
        const json = await res.json().catch(() => ({}))
        setErrorMsg(json.error || "Error al agregar a la lista")
      }
    }
    setWatchlistLoading(false)
  }

  const setPuntuacion = async (valor: number) => {
    if (!userId || !animeId) return
    const res = await fetch("/api/watchlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ anime_id: animeId, estado: watchlistItem?.estado || "para_ver", puntuacion: valor }),
    })
    if (res.ok) {
      const json = await res.json()
      setWatchlistItem({ estado: json.estado, puntuacion: json.puntuacion })
      setPuntuacionState(json.puntuacion || null)
    } else {
      const json = await res.json().catch(() => ({}))
      setErrorMsg(json.error || "Error al guardar puntuación")
    }
  }

  const estadoOptions: { value: string; label: string }[] = [
    { value: "para_ver", label: t(lang, "statusPlanToWatch") },
    { value: "viendo", label: t(lang, "statusWatching") },
    { value: "visto", label: t(lang, "statusCompleted") },
  ]

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="flex flex-col items-center justify-center text-gray-400">
          <div className="animate-pulse rounded-full h-12 w-12 bg-gray-800 mb-4"></div>
          {t(lang, "animeDetailEpisodes")}
        </div>
      </div>
    )
  }

  if (!anime) {
    notFound()
  }

  const episodes = (anime.episodes || []) as Episode[]
  const title = lang === "es" ? anime.title_es : anime.title_en || anime.title_es
  const sinopsis = lang === "es" ? anime.sinopsis_es : anime.sinopsis_en || anime.sinopsis_es
  const descripcion = lang === "es" ? anime.descripcion : anime.descripcion

  const youtubeId = anime.trailer_url
    ? anime.trailer_url.match(
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/
      )?.[1]
    : null

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {anime.banner_url && anime.banner_url.startsWith("http") && (
        <div className="relative mb-6 aspect-video rounded-xl overflow-hidden bg-gray-800">
          <Image
            src={anime.banner_url}
            alt={title}
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-4">
          <div className="relative aspect-[2/3] rounded-xl overflow-hidden bg-gray-800 mb-4 shadow-xl">
            <Image
              src={anime.poster_url && anime.poster_url.startsWith("http") ? anime.poster_url : "/placeholder-anime.svg"}
              alt={title}
              fill
              className="object-cover"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-bold text-red-600 bg-red-600/20 px-2 py-1 rounded">
                  {anime.estado || "—"}
                </span>
                <span className="text-xs text-gray-300">{anime.anio || "—"}</span>
                {anime.puntuacion && (
                  <span className="ml-auto text-xs font-bold text-yellow-400 bg-yellow-400/20 px-2 py-1 rounded">
                    ⭐ {anime.puntuacion}
                  </span>
                )}
              </div>
              <h3 className="mt-2 text-white font-bold text-lg">{title}</h3>
            </div>
          </div>

          {youtubeId && (
            <div className="mb-6">
              <h3 className="text-sm font-bold text-gray-400 mb-2 uppercase tracking-wider">
                {t(lang, "animeDetailTrailer")}
              </h3>
              <div className="aspect-video rounded-xl overflow-hidden bg-black">
                <iframe
                  src={`https://www.youtube.com/embed/${youtubeId}?rel=0`}
                  title="Tráiler"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="w-full h-full"
                />
              </div>
            </div>
          )}

          {session ? (
            <div className="space-y-2">
              <button
                onClick={() => toggleWatchlist(watchlistItem?.estado || "para_ver")}
                disabled={watchlistLoading}
                className={cn(
                  "block w-full py-3 px-4 text-center text-white rounded-lg font-medium transition",
                  watchlistItem
                    ? "bg-gray-700 hover:bg-gray-600"
                    : "bg-red-600 hover:bg-red-700"
                )}
              >
                {watchlistLoading
                  ? "Procesando..."
                  : watchlistItem
                    ? `Quitar de mi lista (${watchlistItem.estado})`
                    : t(lang, "animeDetailAddList")}
              </button>
              {watchlistItem && (
                <div className="flex gap-2">
                  {estadoOptions.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => toggleWatchlist(opt.value)}
                      disabled={watchlistLoading}
                      className={cn(
                        "flex-1 py-2 text-sm text-white rounded transition",
                        watchlistItem.estado === opt.value
                          ? "bg-red-600"
                          : "bg-gray-700 hover:bg-gray-600"
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
              {watchlistItem && (
                <div className="mt-4">
                  <p className="text-sm text-gray-400 mb-2">Tu puntuación</p>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((v) => (
                      <button
                        key={v}
                        onClick={() => setPuntuacion(v)}
                        disabled={watchlistLoading}
                        className={cn(
                          "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition",
                          puntuacion === v
                            ? "bg-yellow-500 text-black"
                            : "bg-gray-700 text-gray-400 hover:text-yellow-400"
                        )}
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                  {puntuacion && (
                    <p className="text-xs text-gray-500 mt-1">
                      {t(lang, "animeDetailScore")}: {`${puntuacion} / 10`}
                    </p>
                  )}
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={() => router.push("/auth/signin")}
              className="block w-full py-3 px-4 text-center text-white bg-red-600 hover:bg-red-700 rounded-lg font-medium transition"
            >
              {t(lang, "animeDetailAddList")}
            </button>
          )}
        </div>
        <div className="lg:col-span-8">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-6">
            <div>
              <h1 className="text-3xl font-bold text-white">{title}</h1>
              <p className="text-gray-400 mb-2">
                {anime.anio} • {anime.tipo || "—"} • {anime.estudio || "—"} • {anime.genero?.join(" • ")} • {anime.estado}
              </p>
              {anime.puntuacion && (
                <p className="text-sm text-yellow-400 font-medium">
                  ⭐ {anime.puntuacion} / 10
                </p>
              )}
            </div>
          </div>

          <div className="mb-8 whitespace-pre-line text-gray-300">
            {descripcion || sinopsis}
          </div>

          {anime.episodios_count && (
            <p className="text-sm text-gray-500 mb-6">
              {t(lang, "animeDetailEpisodesCount")}: {anime.episodios_count}
            </p>
          )}

          <h2 className="text-xl font-bold text-white mb-4">{t(lang, "animeDetailEpisodes")}</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {episodes
              .sort((a, b) => (a.orden || 0) - (b.orden || 0))
              .map((ep) => {
                const epTitle = lang === "es" ? ep.title_es : ep.title_en || ep.title_es || `Episodio ${ep.numero}`
                return (
                  <Link
                    key={ep.id}
                    href={`/anime/${slug}/${ep.numero}`}
                    className="group block p-4 bg-gray-800 rounded-lg hover:bg-red-600/20 border border-transparent hover:border-red-600 transition"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-bold text-red-600">#{ep.numero}</span>
                      <span className="text-xs text-gray-500 group-hover:text-red-400 transition">
                        {t(lang, "episodeWatch")}
                      </span>
                    </div>
                    <h3 className="text-sm text-white truncate group-hover:text-red-400 transition">
                      {epTitle}
                    </h3>
                  </Link>
                )
              })}
          </div>

          {similares.length > 0 && (
            <div className="mt-12">
              <h2 className="text-xl font-bold text-white mb-4">{t(lang, "animeDetailSimilar")}</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {similares.map((s) => {
                  const sTitle = lang === "es" ? s.title_es : s.title_en || s.title_es
                  return (
                    <Link key={s.id} href={`/anime/${s.slug}`} className="block">
                      <div className="relative aspect-[2/3] rounded-xl overflow-hidden bg-gray-800 mb-2">
                        <Image
                          src={s.poster_url && s.poster_url.startsWith("http") ? s.poster_url : "/placeholder-anime.svg"}
                          alt={sTitle}
                          className="w-full h-full object-cover"
                          width={200}
                          height={300}
                        />
                      </div>
                      <h3 className="text-sm font-medium text-white truncate">{sTitle}</h3>
                    </Link>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
