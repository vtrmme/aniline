import { NextResponse, NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { createAdminSupabaseClient } from "@/lib/server/supabase";
import { rateLimit } from "@/lib/rate-limit";
import { obtenerIP, esOwner, respuestaLimite, errorInterno, noAutorizado } from "@/lib/security";

export async function GET(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    const userId = token?.sub || null;
    const email = token?.email || null;
    if (!userId) return noAutorizado();
    if (!esOwner(userId, email)) return noAutorizado();

    const ip = obtenerIP(req);
    const limite = await rateLimit({ clave: `usuarios:${ip}`, maximo: 30, ventanaSegundos: 60 });
    if (!limite.permitido) return respuestaLimite();

    const supabase = createAdminSupabaseClient();
    const { data, error, count } = await supabase
      .from("profiles")
      .select("user_id,email,name,image,provider,created_at,updated_at", { count: "exact" })
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error obteniendo perfiles:", error.message);
      return NextResponse.json({ ok: false, error: "No se pudo cargar la información de usuarios." }, { status: 500 });
    }

    const users = data || [];
    return NextResponse.json({ ok: true, count: count ?? users.length, users });
  } catch (err) {
    return errorInterno(err);
  }
}