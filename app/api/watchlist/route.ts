import { NextResponse, NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { createAdminSupabaseClient } from "@/lib/server/supabase";
import { rateLimit } from "@/lib/rate-limit";
import { obtenerIP, esUUID, esEstadoWatchlist, verificarOrigen, cuerpoDentroDelLimite, respuestaLimite, errorInterno } from "@/lib/security";

async function getUserId(req: Request): Promise<string | null> {
  const nextReq = new NextRequest(req.url, { headers: req.headers });
  const token = await getToken({ req: nextReq, secret: process.env.NEXTAUTH_SECRET });
  return token?.sub || null;
}

export async function GET(req: Request) {
  try {
    const userId = await getUserId(req);
    if (!userId) return NextResponse.json({ ok: true, inList: false, estado: null });

    const ip = obtenerIP(req);
    const limite = await rateLimit({ clave: `watchlist:${ip}`, maximo: 120, ventanaSegundos: 60 });
    if (!limite.permitido) return respuestaLimite();

    const { searchParams } = new URL(req.url);
    const animeId = searchParams.get("anime_id");
    if (!animeId || !esUUID(animeId)) {
      return NextResponse.json({ ok: false, error: "anime_id inválido." }, { status: 400 });
    }

    const supabase = createAdminSupabaseClient();
    const { data } = await supabase
      .from("watchlists")
      .select("estado")
      .eq("user_id", userId)
      .eq("anime_id", animeId)
      .maybeSingle();

    return NextResponse.json({ ok: true, inList: !!data, estado: data?.estado || null });
  } catch (err) {
    return errorInterno(err);
  }
}

export async function POST(req: Request) {
  try {
    if (!verificarOrigen(req)) return NextResponse.json({ ok: false, error: "Origen no permitido." }, { status: 403 });
    const userId = await getUserId(req);
    if (!userId) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });

    const ip = obtenerIP(req);
    const limite = await rateLimit({ clave: `watchlist:${ip}`, maximo: 60, ventanaSegundos: 60 });
    if (!limite.permitido) return respuestaLimite();
    if (!cuerpoDentroDelLimite(req)) return NextResponse.json({ ok: false, error: "Cuerpo demasiado grande." }, { status: 413 });

    const body = (await req.json()) as { anime_id?: unknown; estado?: unknown };
    const { anime_id, estado } = body;
    if (!esUUID(anime_id) || !esEstadoWatchlist(estado)) {
      return NextResponse.json({ ok: false, error: "Parámetros inválidos." }, { status: 400 });
    }

    const supabase = createAdminSupabaseClient();
    const { data: existing, error: selErr } = await supabase
      .from("watchlists")
      .select("id")
      .eq("user_id", userId)
      .eq("anime_id", anime_id)
      .maybeSingle();
    if (selErr) {
      console.error("Watchlist select error:", selErr.message);
      return NextResponse.json({ ok: false, error: "No se pudo consultar la lista." }, { status: 500 });
    }

    if (existing) {
      const { error } = await supabase.from("watchlists").update({ estado }).eq("id", existing.id);
      if (error) {
        console.error("Watchlist update error:", error.message);
        return NextResponse.json({ ok: false, error: "No se pudo actualizar la lista." }, { status: 500 });
      }
      return NextResponse.json({ ok: true, action: "updated", estado });
    }

    const { error } = await supabase.from("watchlists").insert({ user_id: userId, anime_id, estado });
    if (error) {
      console.error("Watchlist insert error:", error.message);
      return NextResponse.json({ ok: false, error: "No se pudo añadir a la lista." }, { status: 500 });
    }
    return NextResponse.json({ ok: true, action: "created", estado });
  } catch (err) {
    return errorInterno(err);
  }
}

export async function DELETE(req: Request) {
  try {
    if (!verificarOrigen(req)) return NextResponse.json({ ok: false, error: "Origen no permitido." }, { status: 403 });
    const userId = await getUserId(req);
    if (!userId) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });

    const ip = obtenerIP(req);
    const limite = await rateLimit({ clave: `watchlist:${ip}`, maximo: 60, ventanaSegundos: 60 });
    if (!limite.permitido) return respuestaLimite();

    const { searchParams } = new URL(req.url);
    const animeId = searchParams.get("anime_id");
    if (!animeId || !esUUID(animeId)) {
      return NextResponse.json({ ok: false, error: "anime_id inválido." }, { status: 400 });
    }

    const supabase = createAdminSupabaseClient();
    const { error } = await supabase.from("watchlists").delete().eq("user_id", userId).eq("anime_id", animeId);
    if (error) {
      console.error("Watchlist delete error:", error.message);
      return NextResponse.json({ ok: false, error: "No se pudo eliminar de la lista." }, { status: 500 });
    }
    return NextResponse.json({ ok: true, action: "deleted" });
  } catch (err) {
    return errorInterno(err);
  }
}