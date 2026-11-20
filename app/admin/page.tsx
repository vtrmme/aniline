"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

interface UsuarioItem {
  user_id: string;
  email: string | null;
  name: string | null;
  image: string | null;
  provider: string | null;
  created_at: string | null;
  updated_at: string | null;
}

interface ActividadItem {
  id: string;
  user_id: string;
  email: string | null;
  name: string | null;
  anime_id: string;
  titulo: string | null;
  episodio_numero: number;
  started_at: string;
  ended_at: string | null;
  duracion_segundos: number | null;
  segundos_visto: number;
}

function formatearFecha(valor: string | null): string {
  if (!valor) return "Sin fecha";
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return "Sin fecha";
  return fecha.toLocaleString("es-ES");
}

function formatearDuracion(segundos: number | null): string {
  if (segundos === null || !Number.isFinite(segundos) || segundos < 0) return "0 seg";
  if (segundos < 60) return `${segundos} seg`;
  const minutos = Math.floor(segundos / 60);
  const resto = segundos % 60;
  if (minutos < 60) return `${minutos} min ${resto} seg`;
  const horas = Math.floor(minutos / 60);
  return `${horas} h ${minutos % 60} min`;
}

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [usuarios, setUsuarios] = useState<number | null>(null);
  const [listaUsuarios, setListaUsuarios] = useState<UsuarioItem[]>([]);
  const [actividad, setActividad] = useState<ActividadItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/auth/signin?callbackUrl=/admin");
      return;
    }
    if (status !== "authenticated") return;
    if (!session?.user?.isAdmin) return;

    let cancelado = false;
    const cargar = async () => {
      setLoading(true);
      setError(null);
      try {
        const [ru, ra] = await Promise.all([fetch("/api/usuarios"), fetch("/api/actividad")]);
        const ju = await ru.json() as { ok: boolean; count?: number; users?: UsuarioItem[] };
        const ja = await ra.json() as { ok: boolean; items?: ActividadItem[] };
        if (cancelado) return;
        if (!ru.ok || !ju.ok) {
          setError("No se pudo cargar la información de usuarios.");
        } else {
          setUsuarios(ju.count ?? 0);
          setListaUsuarios(Array.isArray(ju.users) ? ju.users : []);
        }
        if (ja.ok && Array.isArray(ja.items)) setActividad(ja.items);
        else if (!ra.ok || !ja.ok) setError((prev) => prev || "No se pudo cargar la actividad.");
      } catch {
        if (!cancelado) setError("No se pudo cargar la información.");
      } finally {
        if (!cancelado) setLoading(false);
      }
    };

    void cargar();
    const intervalId = setInterval(() => { void cargar(); }, 15000);
    return () => { cancelado = true; clearInterval(intervalId); };
  }, [status, session, router]);

  if (status === "loading") {
    return <div className="mx-auto max-w-6xl px-4 py-20 text-gray-400">Cargando...</div>;
  }
  if (status !== "authenticated") return null;
  if (!session?.user?.isAdmin) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center">
        <h1 className="text-2xl font-bold text-white">Acceso denegado</h1>
        <p className="mt-2 text-gray-400">No tienes permisos de administración.</p>
      </div>
    );
  }

  return (
    <div className="cinema-bg min-h-[calc(100vh-4rem)] pb-16">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-white">Panel de administración</h1>
        <p className="mt-2 text-sm text-gray-400">Registro de actividad y usuarios registrados.</p>

        {loading ? (
          <p className="mt-8 text-gray-400">Cargando información...</p>
        ) : error ? (
          <p className="mt-8 text-[var(--brand-bright)]">{error}</p>
        ) : (
          <>
            <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="glass-panel rounded-2xl p-6">
                <h2 className="text-sm font-bold uppercase tracking-wider text-gray-300">Usuarios registrados</h2>
                <p className="mt-3 text-4xl font-bold text-white">{usuarios ?? 0}</p>
              </div>
              <div className="glass-panel rounded-2xl p-6">
                <h2 className="text-sm font-bold uppercase tracking-wider text-gray-300">Registros de actividad</h2>
                <p className="mt-3 text-4xl font-bold text-white">{actividad.length}</p>
              </div>
            </div>

            <div className="glass-panel mt-8 rounded-2xl p-6">
              <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-gray-300">Usuarios registrados</h2>
              {listaUsuarios.length === 0 ? (
                <p className="text-sm text-gray-400">Aún no hay perfiles registrados.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-white/10 text-xs uppercase tracking-wider text-gray-400">
                        <th className="py-3 pr-4">Nombre</th>
                        <th className="py-3 pr-4">Correo</th>
                        <th className="py-3 pr-4">ID</th>
                        <th className="py-3 pr-4">Registrado</th>
                        <th className="py-3 pr-4">Último acceso</th>
                      </tr>
                    </thead>
                    <tbody>
                      {listaUsuarios.map((u) => (
                        <tr key={u.user_id} className="border-b border-white/5">
                          <td className="py-3 pr-4 text-white">{u.name || "-"}</td>
                          <td className="py-3 pr-4 text-gray-300">{u.email || "-"}</td>
                          <td className="py-3 pr-4 font-mono text-xs text-gray-400">{u.user_id}</td>
                          <td className="py-3 pr-4 text-gray-300">{formatearFecha(u.created_at)}</td>
                          <td className="py-3 pr-4 text-gray-300">{formatearFecha(u.updated_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="glass-panel mt-8 rounded-2xl p-6">
              <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-gray-300">Actividad reciente</h2>
              {actividad.length === 0 ? (
                <p className="text-sm text-gray-400">Aún no hay registros de actividad.</p>
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
                        <th className="py-3 pr-4">Duración</th>
                      </tr>
                    </thead>
                    <tbody>
                      {actividad.map((item) => (
                        <tr key={item.id} className="border-b border-white/5">
                          <td className="py-3 pr-4 text-white">{item.email || item.name || item.user_id}</td>
                          <td className="py-3 pr-4 text-gray-300">{item.titulo || item.anime_id}</td>
                          <td className="py-3 pr-4 text-gray-300">#{item.episodio_numero}</td>
                          <td className="py-3 pr-4 text-gray-300">{formatearFecha(item.started_at)}</td>
                          <td className="py-3 pr-4 text-gray-300">{formatearFecha(item.ended_at)}</td>
                          <td className="py-3 pr-4 text-gray-300">{formatearDuracion(item.duracion_segundos)}</td>
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
  );
}