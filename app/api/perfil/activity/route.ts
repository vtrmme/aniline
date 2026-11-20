import { NextResponse, NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { createAdminSupabaseClient } from "@/lib/server/supabase";
import { rateLimit } from "@/lib/rate-limit";
import { obtenerIP, respuestaLimite, errorInterno } from "@/lib/security";
import type { AnimeRow } from "@/types/db";

export async function GET(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    const userId = token?.sub || null;
    if (!userId) return NextResponse.json({ ok: true, items: [] });

    const ip = obtenerIP(req);
    const limite = await rateLimit({ clave: `perfil-activity:${ip}`, maximo: 60, ventanaSegundos: 60 });
    if (!limite.permitido) return respuestaLimite();

    const supabase = createAdminSupabaseClient();
    const { data: historial, error } = await supabase
      .from("historial")
      .select("anime_id, episodio_numero, visto_en")
      .eq("user_id", userId)
      .order("visto_en", { ascending: false })
      .limit(120);

    if (error) {
      console.error("Perfil activity error:", error.message);
      return NextResponse.json({ ok: false, error: "No se pudo cargar la actividad." }, { status: 500 });
    }

    const seen = new Set<string>();
    const picks: Array<{ anime_id: string; episodio_numero: number }> = [];
    for (const h of historial || []) {
      if (!h.anime_id || seen.has(h.anime_id)) continue;
      seen.add(h.anime_id);
      picks.push({ anime_id: h.anime_id, episodio_numero: h.episodio_numero });
      if (picks.length >= 12) break;
    }
    if (picks.length === 0) return NextResponse.json({ ok: true, items: [] });

    const ids = picks.map((p) => p.anime_id);
    const { data: animes } = await supabase.from("animes").select("*").in("id", ids);
    const byId = new Map<string, AnimeRow>();
    for (const a of (animes || []) as AnimeRow[]) byId.set(a.id, a);

    const items = picks
      .map((p) => {
        const anime = byId.get(p.anime_id);
        if (!anime) return null;
        return { anime, episodio_numero: p.episodio_numero };
      })
      .filter(Boolean);

    return NextResponse.json({ ok: true, items });
  } catch (err) {
    return errorInterno(err);
  }
}