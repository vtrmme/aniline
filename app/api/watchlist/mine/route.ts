import { createServerClient } from "@/lib/supabase"
import { NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"
import { NextRequest } from "next/server"

async function getUserIdentifiers(req: NextRequest): Promise<{ userId: string | null; userEmail: string | null }> {
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  })
  return {
    userId: token?.sub ?? null,
    userEmail: token?.email ?? null,
  }
}

export async function GET(req: NextRequest) {
  try {
    const { userId, userEmail } = await getUserIdentifiers(req)
    if (!userId && !userEmail) {
      return NextResponse.json({ ok: true, items: [] })
    }

    const supabase = createServerClient()

    // Intentar primero con userId (sub de Google), luego con email como fallback
    let query = supabase
      .from("watchlists")
      .select("*, animes(*)")
      .order("created_at", { ascending: false })

    if (userId) {
      query = query.eq("user_id", userId)
    }

    const { data, error } = await query

    // Si no hay resultados con userId, intentar con email
    let finalData = data || []
    if ((!finalData || finalData.length === 0) && userEmail) {
      const { data: emailData, error: emailError } = await supabase
        .from("watchlists")
        .select("*, animes(*)")
        .eq("user_id", userEmail)
        .order("created_at", { ascending: false })
      if (!emailError && emailData) {
        finalData = emailData
      }
    }

    if (error && !userEmail) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      ok: true,
      items: finalData,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido"
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
