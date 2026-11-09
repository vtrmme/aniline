"use client"

import { useEffect, useState } from "react"
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
      <div className="max-w-2xl mx-auto px-4 py-20 text-center text-gray-400">
        <div className="animate-pulse rounded-full h-12 w-12 bg-gray-800 mx-auto mb-4"></div>
        {t(lang, "perfilTitle")}
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-gray-800 rounded-2xl p-8 border border-gray-700 dark:border-gray-600">
        <div className="flex flex-col md:flex-row md:items-center gap-6 mb-8">
          <div className="w-20 h-20 rounded-full bg-gray-700 flex items-center justify-center text-4xl font-bold text-white mb-4 md:mb-0">
            A
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">{t(lang, "perfilTitle")}</h1>
            <p className="text-gray-400">usuario@email.com</p>
          </div>
        </div>

        <h2 className="text-xl font-bold text-white mb-6">{t(lang, "perfilStats")}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: t(lang, "perfilAnimesVistos"), value: stats?.animes_vistos ?? 0, color: "text-green-400" },
            { label: t(lang, "perfilAnimesViendo"), value: stats?.animes_viendo ?? 0, color: "text-blue-400" },
            { label: t(lang, "perfilAnimesParaVer"), value: stats?.animes_para_ver ?? 0, color: "text-yellow-400" },
            { label: t(lang, "perfilMinutos"), value: stats?.minutos_vistos ?? 0, color: "text-purple-400" },
          ].map((stat) => (
            <div key={stat.label} className="bg-gray-800/50 p-4 rounded-xl border border-gray-700">
              <div className={`text-xs font-medium ${stat.color} uppercase tracking-wider mb-1`}>
                {stat.label}
              </div>
              <div className="text-2xl font-bold text-white">{stat.value}</div>
            </div>
          ))}
          <div className="bg-gray-800/50 p-4 rounded-xl border border-gray-700">
            <div className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">
              {t(lang, "perfilGeneroFavorito")}
            </div>
            <div className="text-2xl font-bold text-white">{stats?.genero_favorito || "—"}</div>
          </div>
        </div>

        {stats === null && !loading && (
          <p className="text-gray-400 text-center py-10">{t(lang, "msgSinDatos")}</p>
        )}
      </div>
    </div>
  )
}
