"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { useSession } from "next-auth/react"
import { useLanguage } from "@/contexts/LanguageContext"
import { t } from "@/lib/translations"

interface PerfilStats {
  animes_vistos: number
  animes_viendo: number
  animes_para_ver: number
  minutos_vistos: number
  genero_favorito: string
}

export default function Perfil() {
  const { lang } = useLanguage()
  const { data: session } = useSession()
  const [stats, setStats] = useState<PerfilStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const cargar = async () => {
      try {
        const res = await fetch("/api/perfil/stats")
        if (res.ok) {
          const json = await res.json()
          setStats(json.stats || null)
        }
      } catch {
        // ignore
      } finally {
        setLoading(false)
      }
    }
    cargar()
  }, [lang])

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center text-gray-400">
        <div className="mx-auto mb-4 h-12 w-12 animate-pulse rounded-full bg-[var(--surface)]" />
        {t(lang, "perfilTitle")}
      </div>
    )
  }

  const avatar = session?.user?.image
  const nombre = session?.user?.name || session?.user?.email || "—"

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="glass-panel rounded-3xl p-8">
        <div className="mb-8 flex flex-col items-center gap-6 md:flex-row md:items-center">
          <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full border-2 border-[var(--gold)]/50 bg-[var(--surface)]">
            {avatar ? (
              <Image src={avatar} alt={nombre} fill sizes="80px" className="object-cover" />
            ) : (
              <span className="flex h-full w-full items-center justify-center text-4xl font-bold text-white">
                {nombre.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <div className="text-center md:text-left">
            <h1 className="text-2xl font-bold text-white">{t(lang, "perfilTitle")}</h1>
            <p className="text-gray-400">{nombre}</p>
          </div>
        </div>

        <h2 className="mb-6 text-xl font-bold text-white">{t(lang, "perfilStats")}</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[
            { label: t(lang, "perfilAnimesVistos"), value: stats?.animes_vistos ?? 0, color: "text-emerald-400" },
            { label: t(lang, "perfilAnimesViendo"), value: stats?.animes_viendo ?? 0, color: "text-blue-400" },
            { label: t(lang, "perfilAnimesParaVer"), value: stats?.animes_para_ver ?? 0, color: "text-[var(--gold)]" },
            { label: t(lang, "perfilMinutos"), value: stats?.minutos_vistos ?? 0, color: "text-purple-400" },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-xl border border-white/8 bg-black/25 p-4 transition hover:border-white/15"
            >
              <div className={`mb-1 text-xs font-medium uppercase tracking-wider ${stat.color}`}>
                {stat.label}
              </div>
              <div className="text-2xl font-bold text-white">{stat.value}</div>
            </div>
          ))}
          <div className="rounded-xl border border-white/8 bg-black/25 p-4 transition hover:border-white/15">
            <div className="mb-1 text-xs font-medium uppercase tracking-wider text-gray-400">
              {t(lang, "perfilGeneroFavorito")}
            </div>
            <div className="text-2xl font-bold text-white">{stats?.genero_favorito || "—"}</div>
          </div>
        </div>

        {stats === null && !loading && (
          <p className="py-10 text-center text-gray-400">{t(lang, "msgSinDatos")}</p>
        )}
      </div>
    </div>
  )
}
