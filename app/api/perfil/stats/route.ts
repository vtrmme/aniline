import { NextResponse, NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { createAdminSupabaseClient } from "@/lib/server/supabase";
import { rateLimit } from "@/lib/rate-limit";
import { obtenerIP, respuestaLimite, errorInterno } from "@/lib/security";

export async function GET(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    const userId = token?.sub || null;
    if (!userId) return NextResponse.json({ ok: true, stats: null });

    const ip = obtenerIP(req);
    const limite = await rateLimit({ clave: `perfil-stats:${ip}`, maximo: 60, ventanaSegundos: 60 });
    if (!limite.permitido) return respuestaLimite();

    const supabase = createAdminSupabaseClient();

    const [{ data: watch }, { data: hist }] = await Promise.all([
      supabase.from("watchlists").select("estado, anime_id").eq("user_id", userId),
      supabase.from("historial").select("anime_id, segundos").eq("user_id", userId),
    ]);

    let animes_vistos = 0;
    let animes_viendo = 0;
    let animes_para_ver = 0;
    const animeIds = new Set<string>();
    for (const w of watch || []) {
      if (w.estado === "visto") animes_vistos++;
      else if (w.estado === "viendo") animes_viendo++;
      else if (w.estado === "para_ver") animes_para_ver++;
      if (w.anime_id) animeIds.add(w.anime_id);
    }

    let segundosTotales = 0;
    for (const h of hist || []) {
      segundosTotales += typeof h.segundos === "number" ? h.segundos : 0;
      if (h.anime_id) animeIds.add(h.anime_id);
    }

    let genero_favorito = "";
    if (animeIds.size > 0) {
      const ids = Array.from(animeIds).slice(0, 200);
      const { data: animes } = await supabase.from("animes").select("genero").in("id", ids);
      const counts = new Map<string, number>();
      for (const a of animes || []) {
        if (!Array.isArray(a.genero)) continue;
        for (const g of a.genero) {
          if (typeof g === "string" && g) counts.set(g, (counts.get(g) || 0) + 1);
        }
      }
      let best = "";
      let bestN = 0;
      for (const [g, n] of counts.entries()) {
        if (n > bestN) { best = g; bestN = n; }
      }
      genero_favorito = best;
    }

    return NextResponse.json({
      ok: true,
      stats: {
        animes_vistos,
        animes_viendo,
        animes_para_ver,
        minutos_vistos: Math.round(segundosTotales / 60),
        genero_favorito,
      },
    });
  } catch (err) {
    return errorInterno(err);
  }
}