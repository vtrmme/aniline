import { NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/server/supabase";
import { rateLimit } from "@/lib/rate-limit";
import { obtenerIP, usuarioAutenticado, respuestaLimite, noAutorizado, errorInterno } from "@/lib/security";

const BUCKET = "episode-videos";

export async function GET(req: Request) {
  try {
    const userId = await usuarioAutenticado(req);
    if (!userId) return noAutorizado();

    const ip = obtenerIP(req);
    const limite = await rateLimit({ clave: `video-play:${ip}`, maximo: 120, ventanaSegundos: 60 });
    if (!limite.permitido) return respuestaLimite();

    const { searchParams } = new URL(req.url);
    const path = searchParams.get("path");
    if (!path || path.length > 500 || path.includes("..") || path.startsWith("/") || path.startsWith("\\")) {
      return NextResponse.json({ ok: false, error: "Ruta inválida." }, { status: 400 });
    }

    const supabase = createAdminSupabaseClient();
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 3600);
    if (error || !data?.signedUrl) {
      return NextResponse.json({ ok: false, error: "No se pudo obtener el video." }, { status: 404 });
    }

    return NextResponse.json({ ok: true, videoUrl: data.signedUrl });
  } catch (err) {
    return errorInterno(err);
  }
}