"use client"

import { createClient } from "@/lib/supabase"
import { notFound, useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { useEffect, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { Play, Plus, Check, Star } from "lucide-react"
import type { Anime, Episode } from "@/types"
import { useLanguage } from "@/contexts/LanguageContext"
import { t } from "@/lib/translations"
import { cn } from "@/lib/utils"
import { AnimeCard } from "@/components/AnimeCard"

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
        body: JSON.stringify({ anime_id: animeId, estado }),
      })
      if (res.ok) {
        const json = await res.json()
        setWatchlistItem({ estado: json.estado, puntuacion: watchlistItem?.puntuacion ?? undefined })
      } else {
        const json = await res.json().catch(() => ({}))
        setErrorMsg(json.error || "Error al agregar a la lista")
      }
    }
    setWatchlistLoading(false)
  }

  const setPuntuacion = async (valor: number) => {
    if (!userId || !animeId) return
    setPuntuacionState(valor)
    const res = await fetch("/api/watchlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ anime_id: animeId, estado: watchlistItem?.estado || "para_ver", puntuacion: valor }),
    })
    if (!res.ok) {
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
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-center text-gray-400">
          <div className="mb-4 h-12 w-12 animate-pulse rounded-full bg-[var(--surface)]" />
          {t(lang, "animeDetailEpisodes")}
        </div>
      </div>
    )
  }

  if (!anime) {
    notFound()
  }

  const episodes = ((anime.episodes || []) as Episode[]).sort(
    (a, b) => (a.orden || 0) - (b.orden || 0)
  )
  const title = lang === "es" ? anime.title_es : anime.title_en || anime.title_es
  const sinopsis = lang === "es" ? anime.sinopsis_es : anime.sinopsis_en || anime.sinopsis_es
  const descripcion = lang === "es" ? anime.descripcion : anime.descripcion

  const primerEpisodio = episodes.length > 0 ? episodes[0] : null

  const youtubeId = anime.trailer_url
    ? anime.trailer_url.match(
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/
      )?.[1]
    : null

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {(anime.banner_url || anime.poster_url) &&
        (anime.banner_url || "").startsWith("http") && (
          <div className="relative mb-6 aspect-video w-full overflow-hidden rounded-2xl bg-[var(--surface)]">
            <Image
              src={(anime.banner_url as string) || ""}
              alt={title}
              fill
              className="object-cover"
              priority
            />
            <div className="gradient-hero absolute inset-0" />
            <div className="absolute inset-x-0 bottom-0 flex flex-wrap items-end justify-between gap-4 p-6 md:p-10">
              <div className="max-w-2xl">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  {anime.puntuacion != null && (
                    <span className="badge-gold inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold">
                      <Star size={12} fill="currentColor" />
                      {anime.puntuacion}
                    </span>
                  )}
                  {anime.estado && (
                    <span className="badge-brand rounded-full px-2.5 py-1 text-xs font-bold uppercase tracking-wide">
                      {anime.estado}
                    </span>
                  )}
                </div>
                <h1 className="text-3xl font-bold text-white drop-shadow-lg md:text-5xl">
                  {title}
                </h1>
              </div>
              {primerEpisodio && (
                <Link
                  href={`/anime/${slug}/${primerEpisodio.numero}`}
                  className="btn-brand inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-bold"
                >
                  <Play size={18} fill="currentColor" />
                  {t(lang, "heroWatch")}
                </Link>
              )}
            </div>
          </div>
        )}

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        <div className="lg:col-span-4">
          {!(anime.banner_url || "").startsWith("http") && (
            <div className="relative mb-4 aspect-[2/3] overflow-hidden rounded-xl bg-[var(--surface)] shadow-[var(--shadow-card)]">
              <Image
                src={anime.poster_url && anime.poster_url.startsWith("http") ? anime.poster_url : "/placeholder-anime.svg"}
                alt={title}
                fill
                className="object-cover"
                priority
              />
            </div>
          )}

          {(anime.banner_url || "").startsWith("http") && anime.poster_url && (
            <div className="relative -mt-24 mb-4 aspect-[2/3] w-40 overflow-hidden rounded-xl border-4 border-[var(--bg)] bg-[var(--surface)] shadow-[var(--shadow-elevated)] md:hidden">
              <Image
                src={anime.poster_url}
                alt={title}
                fill
                className="object-cover"
              />
            </div>
          )}

          {youtubeId && (
            <div className="mb-6">
              <h3 className="mb-2 text-sm font-bold uppercase tracking-wider text-gray-400">
                {t(lang, "animeDetailTrailer")}
              </h3>
              <div className="aspect-video overflow-hidden rounded-xl bg-black">
                <iframe
                  src={`https://www.youtube.com/embed/${youtubeId}?rel=0`}
                  title="Tráiler"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="h-full w-full"
                />
              </div>
            </div>
          )}

          {session ? (
            <div className="glass-panel space-y-2 rounded-2xl p-4">
              <button
                onClick={() => toggleWatchlist(watchlistItem?.estado || "para_ver")}
                disabled={watchlistLoading}
                className={cn(
                  "flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 font-semibold transition",
                  watchlistItem
                    ? "btn-ghost"
                    : "btn-brand"
                )}
              >
                {watchlistItem ? <Check size={18} /> : <Plus size={18} />}
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
                        "flex-1 rounded-lg py-2 text-sm font-medium transition",
                        watchlistItem.estado === opt.value
                          ? "bg-[var(--brand)] text-white"
                          : "bg-white/5 text-gray-300 hover:bg-white/10"
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
              {watchlistItem && (
                <div className="pt-2">
                  <p className="mb-2 text-sm text-gray-400">Tu puntuación</p>
                  <div className="flex flex-wrap gap-1">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((v) => (
                      <button
                        key={v}
                        onClick={() => setPuntuacion(v)}
                        disabled={watchlistLoading}
                        className={cn(
                          "flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold transition",
                          puntuacion === v
                            ? "bg-[var(--gold)] text-black"
                            : "bg-white/8 text-gray-400 hover:text-[var(--gold)]"
                        )}
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                  {puntuacion && (
                    <p className="mt-1 text-xs text-gray-500">
                      {t(lang, "animeDetailScore")}: {`${puntuacion} / 10`}
                    </p>
                  )}
                </div>
              )}
              {errorMsg && (
                <p className="rounded-lg bg-[var(--brand-soft)] px-3 py-2 text-xs text-[var(--brand-bright)]">
                  {errorMsg}
                </p>
              )}
            </div>
          ) : (
            <button
              onClick={() => router.push("/auth/signin")}
              className="btn-brand flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 font-semibold"
            >
              <Plus size={18} />
              {t(lang, "animeDetailAddList")}
            </button>
          )}
        </div>

        <div className="lg:col-span-8">
          {(anime.banner_url || "").startsWith("http") && (
            <h1 className="mb-2 hidden text-3xl font-bold text-white md:block">{title}</h1>
          )}

          <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div className={!((anime.banner_url || "").startsWith("http")) ? "" : "contents"}>
              {!(anime.banner_url || "").startsWith("http") && (
                <h1 className="text-3xl font-bold text-white">{title}</h1>
              )}
              <p className="text-sm text-gray-400">
                {anime.anio} • {anime.tipo || "—"} • {anime.estudio || "—"} •{" "}
                {anime.genero?.join(" • ")} • {anime.estado}
              </p>
              {anime.puntuacion && (
                <p className="text-sm font-medium text-[var(--gold)]">
                  ⭐ {anime.puntuacion} / 10
                </p>
              )}
            </div>

            {primerEpisodio && (anime.banner_url || "").startsWith("http") === false && (
              <Link
                href={`/anime/${slug}/${primerEpisodio.numero}`}
                className="btn-brand inline-flex shrink-0 items-center gap-2 rounded-full px-6 py-3 text-sm font-bold"
              >
                <Play size={18} fill="currentColor" />
                {t(lang, "heroWatch")}
              </Link>
            )}
          </div>

          <div className="mb-8 whitespace-pre-line leading-relaxed text-gray-300">
            {descripcion || sinopsis}
          </div>

          {anime.episodios_count && (
            <p className="mb-6 text-sm text-gray-500">
              {t(lang, "animeDetailEpisodesCount")}: {anime.episodios_count}
            </p>
          )}

          <h2 className="mb-4 text-xl font-bold text-white">{t(lang, "animeDetailEpisodes")}</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {episodes.map((ep) => {
              const epTitle = lang === "es" ? ep.title_es : ep.title_en || ep.title_es || `Episodio ${ep.numero}`
              return (
                <Link
                  key={ep.id}
                  href={`/anime/${slug}/${ep.numero}`}
                  className="group block rounded-xl border border-white/8 bg-[var(--surface)] p-4 transition hover:-translate-y-0.5 hover:border-[var(--brand)]/60 hover:bg-[var(--surface-hover)] hover:shadow-[var(--shadow-card)]"
                >
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-bold text-[var(--brand-bright)]">#{ep.numero}</span>
                    <span className="text-xs text-gray-500 transition group-hover:text-[var(--brand-bright)]">
                      {t(lang, "episodeWatch")}
                    </span>
                  </div>
                  <h3 className="truncate text-sm text-white transition group-hover:text-[var(--brand-bright)]">
                    {epTitle}
                  </h3>
                </Link>
              )
            })}
          </div>

          {similares.length > 0 && (
            <div className="mt-12">
              <h2 className="mb-4 text-xl font-bold text-white">{t(lang, "animeDetailSimilar")}</h2>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                {similares.map((s) => (
                  <AnimeCard key={s.id} anime={s} lang={lang} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
