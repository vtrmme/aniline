import { NextResponse, NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { createAdminSupabaseClient } from "@/lib/server/supabase";
import { rateLimit } from "@/lib/rate-limit";
import { obtenerIP, esUUID, esEnteroEnRango, verificarOrigen, cuerpoDentroDelLimite, respuestaLimite, errorInterno } from "@/lib/security";

export async function GET(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    const userId = token?.sub || null;
    if (!userId) return NextResponse.json({ ok: true, items: [], inList: false, segundos: 0 });

    const ip = obtenerIP(req);
    const limite = await rateLimit({ clave: `historial:${ip}`, maximo: 120, ventanaSegundos: 60 });
    if (!limite.permitido) return respuestaLimite();

    const { searchParams } = new URL(req.url);
    const animeId = searchParams.get("anime_id");
    const epParam = searchParams.get("episodio_numero");

    if (animeId && !esUUID(animeId)) {
      return NextResponse.json({ ok: false, error: "anime_id inválido." }, { status: 400 });
    }

    const supabase = createAdminSupabaseClient();
    let query = supabase.from("historial").select("*").eq("user_id", userId).order("visto_en", { ascending: false });

    if (animeId) query = query.eq("anime_id", animeId);
    if (epParam) {
      const n = Number(epParam);
      if (!Number.isInteger(n) || n < 1 || n > 100000) {
        return NextResponse.json({ ok: false, error: "episodio_numero inválido." }, { status: 400 });
      }
      query = query.eq("episodio_numero", n);
    }

    const { data, error } = await query.limit(200);
    if (error) {
      console.error("Historial GET error:", error.message);
      return NextResponse.json({ ok: false, error: "No se pudo consultar el historial." }, { status: 500 });
    }

    const items = data || [];
    const item = animeId && epParam ? items.find((h) => h.anime_id === animeId && h.episodio_numero === Number(epParam)) : null;

    return NextResponse.json({
      ok: true,
      items,
      inList: !!item,
      episodio_numero: item?.episodio_numero ?? null,
      segundos: typeof item?.segundos === "number" ? item.segundos : 0,
    });
  } catch (err) {
    return errorInterno(err);
  }
}

export async function POST(req: Request) {
  try {
    if (!verificarOrigen(req)) return NextResponse.json({ ok: false, error: "Origen no permitido." }, { status: 403 });

    const nextReq = new NextRequest(req.url, { headers: req.headers });
    const token = await getToken({ req: nextReq, secret: process.env.NEXTAUTH_SECRET });
    const userId = token?.sub || null;
    if (!userId) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });

    const ip = obtenerIP(req);
    const limite = await rateLimit({ clave: `historial-post:${ip}`, maximo: 120, ventanaSegundos: 60 });
    if (!limite.permitido) return respuestaLimite();

    if (!cuerpoDentroDelLimite(req)) {
      return NextResponse.json({ ok: false, error: "Cuerpo demasiado grande." }, { status: 413 });
    }

    const body = (await req.json()) as { anime_id?: unknown; episodio_numero?: unknown; segundos?: unknown };
    const { anime_id, episodio_numero, segundos } = body;

    if (!esUUID(anime_id)) return NextResponse.json({ ok: false, error: "anime_id inválido." }, { status: 400 });
    if (!esEnteroEnRango(episodio_numero, 1, 100000)) {
      return NextResponse.json({ ok: false, error: "episodio_numero inválido." }, { status: 400 });
    }

    const segundosLimpios = typeof segundos === "number" && Number.isFinite(segundos) ? Math.min(86400, Math.max(0, Math.floor(segundos))) : 0;
    const supabase = createAdminSupabaseClient();

    const { error } = await supabase.from("historial").upsert(
      {
        user_id: userId,
        anime_id,
        episodio_numero,
        segundos: segundosLimpios,
        visto_en: new Date().toISOString(),
      },
      { onConflict: "user_id,anime_id,episodio_numero" },
    );

    if (error) {
      console.error("Historial POST error:", error.message);
      return NextResponse.json({ ok: false, error: "No se pudo guardar el historial." }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorInterno(err);
  }
}