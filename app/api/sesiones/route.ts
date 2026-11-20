import { NextResponse, NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { createAdminSupabaseClient } from "@/lib/server/supabase";
import { rateLimit } from "@/lib/rate-limit";
import { obtenerIP, esUUID, esEnteroEnRango, verificarOrigen, cuerpoDentroDelLimite, respuestaLimite, errorInterno, noAutorizado } from "@/lib/security";

export async function GET(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    const userId = token?.sub || null;
    if (!userId) return noAutorizado();

    const ip = obtenerIP(req);
    const limite = await rateLimit({ clave: `sesiones:${ip}`, maximo: 120, ventanaSegundos: 60 });
    if (!limite.permitido) return respuestaLimite();

    const supabase = createAdminSupabaseClient();
    const { data, error } = await supabase
      .from("sesiones")
      .select("*")
      .eq("user_id", userId)
      .order("last_seen_at", { ascending: false })
      .limit(200);

    if (error) {
      console.error("Sesiones GET error:", error.message);
      return NextResponse.json({ ok: false, error: "No se pudieron consultar las sesiones." }, { status: 500 });
    }
    return NextResponse.json({ ok: true, items: data || [] });
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
    if (!userId) return NextResponse.json({ ok: false, error: "No autenticado." }, { status: 401 });

    const ip = obtenerIP(req);
    const limite = await rateLimit({ clave: `sesiones:${ip}`, maximo: 120, ventanaSegundos: 60 });
    if (!limite.permitido) return respuestaLimite();
    if (!cuerpoDentroDelLimite(req)) return NextResponse.json({ ok: false, error: "Cuerpo demasiado grande." }, { status: 413 });

    const body = (await req.json()) as { anime_id?: unknown; episodio_numero?: unknown; segundos?: unknown; finalizar?: unknown };
    const { anime_id, episodio_numero, finalizar } = body;
    const segundosIngresos = typeof body.segundos === "number" && Number.isFinite(body.segundos) ? Math.min(86400, Math.max(0, Math.floor(body.segundos))) : 0;

    if (!esUUID(anime_id)) return NextResponse.json({ ok: false, error: "anime_id no válido." }, { status: 400 });
    if (!esEnteroEnRango(episodio_numero, 1, 100000)) return NextResponse.json({ ok: false, error: "episodio_numero no válido." }, { status: 400 });

    const supabase = createAdminSupabaseClient();
    const ahora = new Date().toISOString();

    if (finalizar === true) {
      const { error } = await supabase
        .from("sesiones")
        .update({ ended_at: ahora, last_seen_at: ahora, updated_at: ahora, segundos_visto: segundosIngresos })
        .eq("user_id", userId)
        .eq("anime_id", anime_id)
        .eq("episodio_numero", episodio_numero)
        .is("ended_at", null);
      if (error) {
        console.error("Sesiones finalizar error:", error.message);
        return NextResponse.json({ ok: false, error: "No se pudo finalizar la sesión." }, { status: 500 });
      }
      return NextResponse.json({ ok: true });
    }

    const { data: abiertas, error: errAbiertas } = await supabase
      .from("sesiones")
      .select("id, segundos_visto")
      .eq("user_id", userId)
      .eq("anime_id", anime_id)
      .eq("episodio_numero", episodio_numero)
      .is("ended_at", null)
      .order("started_at", { ascending: false })
      .limit(1);

    if (errAbiertas) {
      console.error("Sesiones abiertas error:", errAbiertas.message);
      return NextResponse.json({ ok: false, error: "No se pudo consultar la sesión." }, { status: 500 });
    }

    if (abiertas && abiertas.length > 0) {
      const abierta = abiertas[0] as { id: string; segundos_visto: number | null };
      const nuevos = Math.max(abierta.segundos_visto || 0, segundosIngresos);
      const { error } = await supabase
        .from("sesiones")
        .update({ last_seen_at: ahora, updated_at: ahora, segundos_visto: nuevos })
        .eq("id", abierta.id);
      if (error) {
        console.error("Sesiones update error:", error.message);
        return NextResponse.json({ ok: false, error: "No se pudo actualizar la sesión." }, { status: 500 });
      }
      return NextResponse.json({ ok: true });
    }

    const { error } = await supabase.from("sesiones").insert({
      user_id: userId,
      anime_id,
      episodio_numero,
      started_at: ahora,
      ended_at: null,
      last_seen_at: ahora,
      segundos_visto: segundosIngresos,
      updated_at: ahora,
    });
    if (error) {
      console.error("Sesiones insert error:", error.message);
      return NextResponse.json({ ok: false, error: "No se pudo crear la sesión." }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorInterno(err);
  }
}