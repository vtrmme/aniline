import { NextResponse, NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { createAdminSupabaseClient } from "@/lib/server/supabase";
import { rateLimit } from "@/lib/rate-limit";
import { obtenerIP, esOwner, respuestaLimite, errorInterno, noAutorizado } from "@/lib/security";

interface ActividadSesion {
  id: string;
  user_id: string;
  anime_id: string;
  episodio_numero: number;
  started_at: string;
  ended_at: string | null;
  last_seen_at: string | null;
  segundos_visto: number | null;
}

export async function GET(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    const userId = token?.sub || null;
    const email = token?.email || null;
    if (!userId) return noAutorizado();
    if (!esOwner(userId, email)) return noAutorizado();

    const ip = obtenerIP(req);
    const limite = await rateLimit({ clave: `actividad:${ip}`, maximo: 60, ventanaSegundos: 60 });
    if (!limite.permitido) return respuestaLimite();

    const supabase = createAdminSupabaseClient();
    const { data, error } = await supabase
      .from("sesiones")
      .select("*")
      .order("started_at", { ascending: false })
      .limit(200);

    if (error) {
      console.error("Error consultando actividad:", error.message);
      return NextResponse.json({ ok: false, error: "No se pudo cargar la actividad." }, { status: 500 });
    }

    const sesiones = (data || []) as ActividadSesion[];
    const userIds = Array.from(new Set(sesiones.map((s) => s.user_id).filter(Boolean)));
    const animeIds = Array.from(new Set(sesiones.map((s) => s.anime_id).filter(Boolean)));

    const [profilesRes, animesRes] = await Promise.all([
      userIds.length ? supabase.from("profiles").select("user_id,email,name").in("user_id", userIds) : Promise.resolve({ data: [] as Array<{ user_id: string; email: string | null; name: string | null }> }),
      animeIds.length ? supabase.from("animes").select("id,title_es,title_en").in("id", animeIds) : Promise.resolve({ data: [] as Array<{ id: string; title_es: string | null; title_en: string | null }> }),
    ]);

    const profileMap = new Map<string, { email: string | null; name: string | null }>();
    for (const p of profilesRes.data || []) profileMap.set(p.user_id, { email: p.email, name: p.name });
    const animeMap = new Map<string, string | null>();
    for (const a of animesRes.data || []) animeMap.set(a.id, a.title_es || a.title_en || null);

    const items = sesiones.map((s) => {
      const inicio = new Date(s.started_at).getTime();
      const fin = s.ended_at ? new Date(s.ended_at).getTime() : Date.now();
      const duracion = Number.isFinite(inicio) && Number.isFinite(fin) ? Math.max(0, Math.floor((fin - inicio) / 1000)) : null;
      const prof = profileMap.get(s.user_id);
      return {
        id: s.id,
        user_id: s.user_id,
        email: prof?.email || null,
        name: prof?.name || null,
        anime_id: s.anime_id,
        titulo: animeMap.get(s.anime_id) || null,
        episodio_numero: s.episodio_numero,
        started_at: s.started_at,
        ended_at: s.ended_at,
        duracion_segundos: duracion,
        segundos_visto: s.segundos_visto || 0,
      };
    });

    return NextResponse.json({ ok: true, items });
  } catch (err) {
    return errorInterno(err);
  }
}