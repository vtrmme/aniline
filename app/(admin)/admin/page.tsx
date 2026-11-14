"use client"

import { useSession } from "next-auth/react"
import { useEffect, useState } from "react"



interface ActividadItem {
  id: string
  user_id: string
  email: string | null
  anime_id: string
  titulo: string | null
  episodio_numero: number
  started_at: string
  ended_at: string | null
  duracion_segundos: number | null
  segundos_visto: number
}

function formatearFecha(valor: string | null): string {
  if (!valor) {
    return "Sin fecha"
  }
  const fecha = new Date(valor)
  if (Number.isNaN(fecha.getTime())) {
    return "Sin fecha"
  }
  return fecha.toLocaleString("es-ES")
}

function formatearDuracion(segundos: number | null): string {
  if (segundos === null || !Number.isFinite(segundos) || segundos < 0) {
    return "0 seg"
  }
  if (segundos < 60) {
    return `${segundos} seg`
  }
  const minutos = Math.floor(segundos / 60)
  const resto = segundos % 60
  if (minutos < 60) {
    return `${minutos} min ${resto} seg`
  }
  const horas = Math.floor(minutos / 60)
  return `${horas} h ${minutos % 60} min`
}

export default function AdminPage() {

  const { data: session, status } = useSession()
  const userId = (session?.user as { id?: string } | undefined)?.id ?? null
  const email = (session?.user as { email?: string | null } | undefined)?.email ?? null

  const [usuarios, setUsuarios] = useState<number | null>(null)
  const [actividad, setActividad] = useState<ActividadItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (status !== "authenticated" || !userId) {
      return
    }
    let cancelado = false
    const cargar = async () => {
      setLoading(true)
      setError(null)
      try {
        const [respuestaUsuarios, respuestaActividad] = await Promise.all([
          fetch("/api/usuarios"),
          fetch("/api/actividad"),
        ])
        const jsonUsuarios = (await respuestaUsuarios.json()) as {
          ok: boolean
          count?: number
        }
        const jsonActividad = (await respuestaActividad.json()) as {
          ok: boolean
          items?: ActividadItem[]
        }
        if (cancelado) {
          return
        }
        if (!respuestaUsuarios.ok || !jsonUsuarios.ok) {
          setError("No se pudo cargar la informacion de usuarios.")
          return
        }
        setUsuarios(jsonUsuarios.count ?? 0)
        if (jsonActividad.ok && Array.isArray(jsonActividad.items)) {
          setActividad(jsonActividad.items)
        }
        if (!respuestaActividad.ok || !jsonActividad.ok) {
          setError("No se pudo cargar la actividad.")
        }
      } catch {
        if (!cancelado) {
          setError("No se pudo cargar la informacion.")
        }
      } finally {
        if (!cancelado) {
          setLoading(false)
        }
      }
    }
    const intervalId = setInterval(() => {
      void cargar()
    }, 15000)
    return () => {
      cancelado = true
      clearInterval(intervalId)
    }
  }, [status, userId])

  if (status === "loading") {
    return (
      <div className="mx-auto max-w-6xl px-4 py-20 text-gray-400">Cargando...</div>
    )
  }

  if (status === "unauthenticated" || !session) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-20 text-gray-400">
        Necesitas iniciar sesion para ver esta pagina.
      </div>
    )
  }

  const emailAdmin = (process.env.NEXT_PUBLIC_ADMIN_EMAIL || "").trim().toLowerCase()
  const esAdmin = !!emailAdmin && !!email && email.trim().toLowerCase() === emailAdmin

  if (!esAdmin) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-20 text-gray-400">
        No autorizado.
      </div>
    )
  }

  return (
    <div className="cinema-bg min-h-[calc(100vh-4rem)] pb-16">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-white">Panel de administracion</h1>
        <p className="mt-2 text-sm text-gray-400">
          Registro de actividad de los usuarios y conteo de usuarios registrados.
        </p>

        {loading ? (
          <p className="mt-8 text-gray-400">Cargando informacion...</p>
        ) : error ? (
          <p className="mt-8 text-[var(--brand-bright)]">{error}</p>
        ) : (
          <>
            <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="glass-panel rounded-2xl p-6">
                <h2 className="text-sm font-bold uppercase tracking-wider text-gray-300">
                  Usuarios registrados
                </h2>
                <p className="mt-3 text-4xl font-bold text-white">{usuarios ?? 0}</p>
              </div>
              <div className="glass-panel rounded-2xl p-6">
                <h2 className="text-sm font-bold uppercase tracking-wider text-gray-300">
                  Registros de actividad
                </h2>
                <p className="mt-3 text-4xl font-bold text-white">{actividad.length}</p>
              </div>
            </div>

            <div className="glass-panel mt-8 rounded-2xl p-6">
              <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-gray-300">
                Actividad reciente
              </h2>
              {actividad.length === 0 ? (
                <p className="text-sm text-gray-400">Aun no hay registros de actividad.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-white/10 text-xs uppercase tracking-wider text-gray-400">
                        <th className="py-3 pr-4">Usuario</th>
                        <th className="py-3 pr-4">Anime</th>
                        <th className="py-3 pr-4">Episodio</th>
                        <th className="py-3 pr-4">Inicio</th>
                        <th className="py-3 pr-4">Fin</th>
                        <th className="py-3 pr-4">Duracion</th>
                      </tr>
                    </thead>
                    <tbody>
                      {actividad.map((item) => (
                        <tr key={item.id} className="border-b border-white/5">
                          <td className="py-3 pr-4 text-white">{item.email || item.user_id}</td>
                          <td className="py-3 pr-4 text-gray-300">{item.titulo || item.anime_id}</td>
                          <td className="py-3 pr-4 text-gray-300">#{item.episodio_numero}</td>
                          <td className="py-3 pr-4 text-gray-300">{formatearFecha(item.started_at)}</td>
                          <td className="py-3 pr-4 text-gray-300">{formatearFecha(item.ended_at)}</td>
                          <td className="py-3 pr-4 text-gray-300">
                            {formatearDuracion(item.duracion_segundos)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}





