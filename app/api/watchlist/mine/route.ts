import { NextResponse, NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { createAdminSupabaseClient } from "@/lib/server/supabase";
import { rateLimit } from "@/lib/rate-limit";
import { obtenerIP, respuestaLimite, errorInterno } from "@/lib/security";

export async function GET(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    const userId = token?.sub || null;
    if (!userId) return NextResponse.json({ ok: true, items: [] });

    const ip = obtenerIP(req);
    const limite = await rateLimit({ clave: `watchlist-mine:${ip}`, maximo: 60, ventanaSegundos: 60 });
    if (!limite.permitido) return respuestaLimite();

    const supabase = createAdminSupabaseClient();
    const { data, error } = await supabase
      .from("watchlists")
      .select("*, animes(*)")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Watchlist mine error:", error.message);
      return NextResponse.json({ ok: false, error: "No se pudo cargar tu lista." }, { status: 500 });
    }

    return NextResponse.json({ ok: true, items: data || [] });
  } catch (err) {
    return errorInterno(err);
  }
}