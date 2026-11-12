"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { Play, Plus, Check, Star } from "lucide-react"
import { createClient } from "@/lib/supabase"
import { useLanguage } from "@/contexts/LanguageContext"
import { t } from "@/lib/translations"
import type { Anime } from "@/types"

export function HeroBanner() {
  const { lang } = useLanguage()
  const { data: session } = useSession()
  const router = useRouter()
  const [anime, setAnime] = useState<Anime | null>(null)
  const [loading, setLoading] = useState(true)
  const [enLista, setEnLista] = useState(false)
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    let cancelled = false
    const cargar = async () => {
      try {
        const supabase = createClient()
        const { data } = await supabase
          .from("animes")
          .select("*")
          .not("banner_url", "is", null)
          .neq("banner_url", "")
          .order("puntuacion", { ascending: false, nullsFirst: false })
          .limit(1)

        if (cancelled) return

        if (data && data.length > 0) {
          setAnime(data[0] as Anime)
        } else {
          const { data: fallback } = await supabase
            .from("animes")
            .select("*")
            .not("poster_url", "is", null)
            .order("puntuacion", { ascending: false, nullsFirst: false })
            .limit(1)
          if (!cancelled && fallback && fallback.length > 0) {
            setAnime(fallback[0] as Anime)
          }
        }
      } catch (err) {
        console.error("Error cargando destacado:", err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    cargar()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!session || !anime) return
    let cancelled = false
    const verificar = async () => {
      try {
        const res = await fetch(`/api/watchlist?anime_id=${anime.id}`)
        if (!cancelled && res.ok) {
          const json = (await res.json()) as { inList?: boolean }
          setEnLista(!!json.inList)
        }
      } catch {
        // ignore
      }
    }
    verificar()
    return () => {
      cancelled = true
    }
  }, [session, anime])

  const añadirLista = async () => {
    if (!anime) return
    if (!session) {
      router.push("/auth/signin")
      return
    }
    if (guardando) return
    setGuardando(true)
    try {
      if (enLista) {
        const res = await fetch(`/api/watchlist?anime_id=${anime.id}`, {
          method: "DELETE",
        })
        if (res.ok) setEnLista(false)
      } else {
        const res = await fetch("/api/watchlist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ anime_id: anime.id, estado: "para_ver" }),
        })
        if (res.ok) setEnLista(true)
      }
    } catch {
      // fallo silencioso
    } finally {
      setGuardando(false)
    }
  }

  if (loading) {
    return (
      <div className="relative mb-10 h-[62vh] min-h-[420px] max-h-[680px] w-full overflow-hidden">
        <div className="skeleton absolute inset-0" />
      </div>
    )
  }

  if (!anime) return null

  const titulo = lang === "es" ? anime.title_es : anime.title_en || anime.title_es
  const sinopsis = lang === "es" ? anime.sinopsis_es : anime.sinopsis_en || anime.sinopsis_es
  const imagen =
    anime.banner_url && anime.banner_url.startsWith("http")
      ? anime.banner_url
      : anime.poster_url && anime.poster_url.startsWith("http")
        ? anime.poster_url
        : "/placeholder-anime.svg"

  return (
    <section className="relative mb-10 h-[62vh] min-h-[420px] max-h-[680px] w-full overflow-hidden">
      <Image
        src={imagen}
        alt={titulo}
        fill
        priority
        sizes="100vw"
        className="object-cover object-center"
      />
      <div className="gradient-hero absolute inset-0" />

      <div className="relative z-10 mx-auto flex h-full max-w-7xl flex-col justify-end px-4 pb-12 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <div className="mb-3 flex flex-wrap items-center gap-2">
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
            {anime.tipo && (
              <span className="rounded-full border border-white/15 bg-black/40 px-2.5 py-1 text-xs font-medium text-gray-200 backdrop-blur">
                {anime.tipo}
              </span>
            )}
            {anime.genero && anime.genero.length > 0 && (
              <span className="rounded-full border border-white/15 bg-black/40 px-2.5 py-1 text-xs font-medium text-gray-200 backdrop-blur">
                {anime.genero.slice(0, 2).join(" · ")}
              </span>
            )}
            <span className="rounded-full border border-white/15 bg-black/40 px-2.5 py-1 text-xs font-medium text-gray-200 backdrop-blur">
              Sub | Dob
            </span>
          </div>

          <h1 className="text-3xl font-bold leading-tight text-white drop-shadow-lg sm:text-4xl md:text-5xl">
            {titulo}
          </h1>

          {sinopsis && (
            <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-gray-300 sm:text-base">
              {sinopsis}
            </p>
          )}

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Link
              href={`/anime/${anime.slug}`}
              className="btn-brand inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-bold"
            >
              <Play size={18} fill="currentColor" />
              {t(lang, "heroWatch")}
            </Link>
            <button
              type="button"
              onClick={añadirLista}
              disabled={guardando}
              className="btn-ghost inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-bold disabled:opacity-60"
            >
              {enLista ? <Check size={18} /> : <Plus size={18} />}
              {enLista ? t(lang, "heroInList") : t(lang, "heroAddList")}
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
