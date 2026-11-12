"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { useSession, signOut } from "next-auth/react"
import {
  CheckCircle2,
  Play,
  Bookmark,
  Clock,
  Sparkles,
  ListVideo,
  Compass,
  Heart,
  MessageCircle,
  LogOut,
} from "lucide-react"
import { useLanguage } from "@/contexts/LanguageContext"
import { t } from "@/lib/translations"
import { createClient } from "@/lib/supabase"
import { Carousel } from "@/components/Carousel"
import { cn } from "@/lib/utils"
import type { Anime } from "@/types"

interface PerfilStats {
  animes_vistos: number
  animes_viendo: number
  animes_para_ver: number
  minutos_vistos: number
  genero_favorito: string
}

interface HistorialEntry {
  anime_id: string
  episodio_numero: number
  segundos?: number
}

interface ActividadItem {
  anime: Anime
  episodio_numero: number
}

type NivelFan = "perfilNovato" | "perfilOtaku" | "perfilVeterano" | "perfilLeyenda"

function calcularNivel(total: number): NivelFan {
  if (total >= 50) return "perfilLeyenda"
  if (total >= 20) return "perfilVeterano"
  if (total >= 5) return "perfilOtaku"
  return "perfilNovato"
}

const NIVEL_CLASES: Record<NivelFan, string> = {
  perfilNovato: "bg-white/10 text-gray-300 border-white/15",
  perfilOtaku: "bg-blue-500/15 text-blue-300 border-blue-400/30",
  perfilVeterano: "bg-[var(--gold)]/15 text-[var(--gold)] border-[var(--gold)]/40",
  perfilLeyenda:
    "bg-[var(--brand-soft)] text-[var(--brand-bright)] border-[var(--brand)]/40",
}

function SkeletonPerfil() {
  return (
    <div className="mx-auto max-w-5xl animate-pulse px-4 py-8 sm:px-6 lg:px-8">
      <div className="glass-panel mb-6 h-44 rounded-3xl" />
      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-24 rounded-xl border border-white/8 bg-black/25" />
        ))}
      </div>
      <div className="mb-6 h-8 w-48 rounded-lg bg-[var(--surface)]" />
      <div className="flex gap-4 overflow-hidden">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-56 w-[150px] shrink-0 rounded-xl bg-[var(--surface)]" />
        ))}
      </div>
    </div>
  )
}

export default function Perfil() {
  const { lang } = useLanguage()
  const { data: session, status } = useSession()
  const [stats, setStats] = useState<PerfilStats | null>(null)
  const [actividad, setActividad] = useState<ActividadItem[]>([])
  const [minutosReales, setMinutosReales] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status !== "authenticated") return
    let cancelled = false

    const cargar = async () => {
      try {
        const res = await fetch("/api/perfil/stats")
        if (res.ok) {
          const json = (await res.json()) as { stats?: PerfilStats | null }
          if (!cancelled) setStats(json.stats ?? null)
        }
      } catch {
        // ignore
      }

      try {
        const res = await fetch("/api/historial")
        if (res.ok) {
          const json = (await res.json()) as {
            ok: boolean
            items?: HistorialEntry[]
          }
          const items = json.ok && Array.isArray(json.items) ? json.items : []

          const totalSegundos = items.reduce(
            (suma, h) => suma + (typeof h.segundos === "number" ? h.segundos : 0),
            0
          )
          if (!cancelled && totalSegundos > 0) {
            setMinutosReales(Math.round(totalSegundos / 60))
          }

          const vistos = new Set<string>()
          const unicos: HistorialEntry[] = []
          for (const h of items) {
            if (!h.anime_id || vistos.has(h.anime_id)) continue
            vistos.add(h.anime_id)
            unicos.push(h)
            if (unicos.length >= 12) break
          }

          if (unicos.length > 0) {
            const supabase = createClient()
            const { data: animes } = await supabase
              .from("animes")
              .select("*")
              .in("id", unicos.map((h) => h.anime_id))

            if (cancelled) return
            const porId = new Map<string, Anime>()
            ;((animes || []) as Anime[]).forEach((a) => porId.set(a.id, a))

            const completos: ActividadItem[] = []
            for (const h of unicos) {
              const anime = porId.get(h.anime_id)
              if (anime) completos.push({ anime, episodio_numero: h.episodio_numero })
            }
            setActividad(completos)
          }
        }
      } catch {
        // ignore
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    cargar()
    return () => {
      cancelled = true
    }
  }, [status])

  if (status === "loading" || loading) {
    return <SkeletonPerfil />
  }

  const avatar = session?.user?.image
  const nombre = session?.user?.name || session?.user?.email || "—"
  const email = session?.user?.email || ""

  const vistos = stats?.animes_vistos ?? 0
  const viendo = stats?.animes_viendo ?? 0
  const paraVer = stats?.animes_para_ver ?? 0
  const totalLista = vistos + viendo + paraVer
  const porcentaje = totalLista > 0 ? Math.round((vistos / totalLista) * 100) : 0
  const nivel = calcularNivel(totalLista)
  const minutos = minutosReales ?? stats?.minutos_vistos ?? 0

  const statCards = [
    {
      label: t(lang, "perfilAnimesVistos"),
      value: vistos,
      icon: CheckCircle2,
      color: "text-emerald-400",
      bg: "bg-emerald-400/10",
    },
    {
      label: t(lang, "perfilAnimesViendo"),
      value: viendo,
      icon: Play,
      color: "text-blue-400",
      bg: "bg-blue-400/10",
    },
    {
      label: t(lang, "perfilAnimesParaVer"),
      value: paraVer,
      icon: Bookmark,
      color: "text-[var(--gold)]",
      bg: "bg-[var(--gold)]/10",
    },
    {
      label: t(lang, "perfilMinutos"),
      value: minutos,
      icon: Clock,
      color: "text-purple-400",
      bg: "bg-purple-400/10",
    },
    {
      label: t(lang, "perfilGeneroFavorito"),
      value: stats?.genero_favorito || "—",
      icon: Sparkles,
      color: "text-[var(--brand-bright)]",
      bg: "bg-[var(--brand-soft)]",
      texto: true,
    },
  ]

  const accesos = [
    {
      href: "/lista",
      label: t(lang, "navMyList"),
      sub: t(lang, "perfilGoListSub"),
      icon: ListVideo,
      activo: true,
    },
    {
      href: "/",
      label: t(lang, "navExplorar"),
      sub: t(lang, "perfilGoExploreSub"),
      icon: Compass,
      activo: true,
    },
    {
      href: "/apoyanos",
      label: t(lang, "navSupport"),
      sub: t(lang, "perfilGoSupportSub"),
      icon: Heart,
      activo: true,
      destacado: true,
    },
    {
      href: null,
      label: "Discord",
      sub: t(lang, "perfilDiscordSub"),
      icon: MessageCircle,
      activo: false,
      badge: t(lang, "perfilDiscordSoon"),
    },
  ]

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <section className="glass-panel relative mb-8 overflow-hidden rounded-3xl">
        <div className="absolute inset-0 bg-gradient-to-r from-[var(--brand)]/25 via-transparent to-[var(--gold)]/10" />
        <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-[var(--brand)]/20 blur-3xl" />
        <div className="absolute -bottom-20 left-1/3 h-44 w-44 rounded-full bg-[var(--gold)]/10 blur-3xl" />

        <div className="relative flex flex-col gap-6 p-6 sm:p-8 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col items-center gap-5 sm:flex-row">
            <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-full border-2 border-[var(--brand)] bg-[var(--surface)] shadow-[0_0_24px_rgba(229,9,20,0.35)]">
              {avatar ? (
                <Image src={avatar} alt={nombre} fill sizes="96px" className="object-cover" />
              ) : (
                <span className="flex h-full w-full items-center justify-center text-4xl font-bold text-white">
                  {nombre.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <div className="text-center sm:text-left">
              <div className="mb-2 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold",
                    NIVEL_CLASES[nivel]
                  )}
                >
                  <Sparkles size={12} />
                  {t(lang, "perfilFanLevel")}: {t(lang, nivel)}
                </span>
              </div>
              <h1 className="text-2xl font-bold text-white">{nombre}</h1>
              {email && <p className="truncate text-sm text-gray-400">{email}</p>}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 md:justify-end">
            <Link
              href="/lista"
              className="btn-ghost inline-flex items-center gap-2 px-4 py-2.5 text-sm"
            >
              <ListVideo size={16} />
              {t(lang, "navMyList")}
            </Link>
            <Link
              href="/apoyanos"
              className="btn-brand inline-flex items-center gap-2 px-4 py-2.5 text-sm"
            >
              <Heart size={16} fill="currentColor" />
              {t(lang, "navSupport")}
            </Link>
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-gray-300 transition hover:border-red-400/40 hover:text-red-400"
            >
              <LogOut size={16} />
              {t(lang, "navLogout")}
            </button>
          </div>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="mb-4 text-xl font-bold text-white">{t(lang, "perfilStats")}</h2>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
          {statCards.map((stat) => (
            <div
              key={stat.label}
              className="rounded-xl border border-white/8 bg-black/25 p-4 transition hover:border-white/15"
            >
              <div
                className={cn(
                  "mb-3 flex h-9 w-9 items-center justify-center rounded-lg",
                  stat.bg,
                  stat.color
                )}
              >
                <stat.icon size={18} />
              </div>
              <div className="text-xs font-medium uppercase tracking-wider text-gray-500">
                {stat.label}
              </div>
              <div
                className={cn(
                  "mt-1 truncate font-bold text-white",
                  stat.texto ? "text-lg" : "text-2xl"
                )}
                title={typeof stat.value === "string" ? stat.value : undefined}
              >
                {stat.value}
              </div>
            </div>
          ))}
        </div>

        {totalLista > 0 && (
          <div className="mt-4 rounded-xl border border-white/8 bg-black/25 p-4">
            <div className="mb-2 flex items-baseline justify-between gap-4">
              <span className="text-xs font-medium uppercase tracking-wider text-gray-500">
                {t(lang, "perfilProgress")}
              </span>
              <span className="text-sm font-bold text-white">
                {porcentaje}% <span className="font-normal text-gray-500">{t(lang, "perfilOfTotal")}</span>
              </span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[var(--brand)] to-[var(--brand-bright)] transition-all duration-700"
                style={{ width: `${porcentaje}%` }}
              />
            </div>
          </div>
        )}

        {stats === null && (
          <p className="py-8 text-center text-gray-400">{t(lang, "msgSinDatos")}</p>
        )}
      </section>

      {actividad.length > 0 && (
        <Carousel title={t(lang, "perfilRecent")} subtitle={t(lang, "historialTitle")}>
          {actividad.map(({ anime, episodio_numero }) => {
            const titulo = lang === "es" ? anime.title_es : anime.title_en || anime.title_es
            return (
              <Link
                key={anime.id}
                href={`/anime/${anime.slug}/${episodio_numero}`}
                className="group block w-[150px] shrink-0 snap-start sm:w-[170px]"
              >
                <div className="relative aspect-[2/3] overflow-hidden rounded-xl bg-[var(--surface)] ring-1 ring-white/5 transition duration-300 group-hover:-translate-y-1 group-hover:ring-[var(--brand)]/60">
                  <Image
                    src={
                      anime.poster_url && anime.poster_url.startsWith("http")
                        ? anime.poster_url
                        : "/placeholder-anime.svg"
                    }
                    alt={titulo}
                    fill
                    sizes="180px"
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  <div className="gradient-card absolute inset-0 opacity-80" />
                  <div className="absolute inset-x-0 bottom-0 p-3">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--brand-bright)]">
                      {t(lang, "continueEpisode")} {episodio_numero}
                    </span>
                    <p className="mt-0.5 truncate text-xs font-semibold text-white">{titulo}</p>
                  </div>
                </div>
                <p className="mt-2 truncate text-sm text-gray-400 transition group-hover:text-white">
                  {titulo}
                </p>
              </Link>
            )
          })}
        </Carousel>
      )}

      <section className="mb-10">
        <h2 className="mb-4 text-xl font-bold text-white">{t(lang, "perfilQuickActions")}</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {accesos.map((acceso) => {
            const contenido = (
              <>
                <div
                  className={cn(
                    "mb-3 flex h-11 w-11 items-center justify-center rounded-xl",
                    acceso.destacado
                      ? "bg-[var(--brand-soft)] text-[var(--brand-bright)]"
                      : acceso.activo
                        ? "bg-white/10 text-gray-300"
                        : "bg-white/5 text-gray-500"
                  )}
                >
                  <acceso.icon size={22} />
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "font-semibold",
                      acceso.activo ? "text-white" : "text-gray-500"
                    )}
                  >
                    {acceso.label}
                  </span>
                  {"badge" in acceso && acceso.badge && (
                    <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                      {acceso.badge}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm text-gray-500">{acceso.sub}</p>
              </>
            )

            const clase = cn(
              "rounded-xl border p-5 transition",
              acceso.activo
                ? acceso.destacado
                  ? "border-[var(--brand)]/40 bg-[var(--brand-soft)]/50 hover:border-[var(--brand)]/70 hover:shadow-[0_0_24px_rgba(229,9,20,0.12)]"
                  : "border-white/8 bg-black/25 hover:border-white/20 hover:bg-black/40"
                : "border-white/5 bg-black/15 opacity-70"
            )

            return acceso.href ? (
              <Link key={acceso.label} href={acceso.href} className={clase}>
                {contenido}
              </Link>
            ) : (
              <div key={acceso.label} className={clase} aria-disabled="true">
                {contenido}
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}
