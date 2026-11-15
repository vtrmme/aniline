import { NextRequest, NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const SLUG_RE = /^[0-9]+(?:-[a-z0-9]+)*$/
const PATH_VIDEO_RE = /^[A-Za-z0-9_\-/\.]+$/
const ESTADOS_WATCHLIST = new Set(["para_ver", "viendo", "visto"])
const EXTENSIONES_VIDEO = new Set(["mp4", "webm", "mov", "mkv", "m4v"])

const MAX_CUERPO_JSON = 16 * 1024

export function esUUID(valor: unknown): valor is string {
  return typeof valor === "string" && UUID_RE.test(valor)
}

export function esSlugSeguro(valor: unknown): valor is string {
  return typeof valor === "string" && valor.length >= 1 && valor.length <= 130 && SLUG_RE.test(valor)
}

export function esEstadoWatchlist(valor: unknown): valor is string {
  return typeof valor === "string" && ESTADOS_WATCHLIST.has(valor)
}

export function esExtensionVideo(ext: unknown): ext is string {
  return typeof ext === "string" && EXTENSIONES_VIDEO.has(ext)
}

export function esPathVideoSeguro(valor: unknown): valor is string {
  if (typeof valor !== "string" || valor.length === 0 || valor.length > 300) return false
  if (valor.includes("..") || valor.includes("\\") || valor.startsWith("/")) return false
  return PATH_VIDEO_RE.test(valor)
}

export function esEnteroEnRango(valor: unknown, min: number, max: number): valor is number {
  return typeof valor === "number" && Number.isInteger(valor) && valor >= min && valor <= max
}

export function obtenerIP(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for")
  if (forwarded) {
    const primera = forwarded.split(",")[0]?.trim()
    if (primera) return primera
  }
  return req.headers.get("x-real-ip") || "desconocido"
}

export function verificarOrigen(req: Request): boolean {
  const origin = req.headers.get("origin")
  if (!origin) return true
  const host = req.headers.get("host")
  if (!host) return false
  try {
    return new URL(origin).host === host
  } catch {
    return false
  }
}

export function cuerpoDentroDelLimite(req: Request, maximo: number = MAX_CUERPO_JSON): boolean {
  const length = req.headers.get("content-length")
  if (!length) return true
  const numero = Number(length)
  return Number.isFinite(numero) && numero >= 0 && numero <= maximo
}

async function hashSeguro(valor: string): Promise<string> {
  const datos = new TextEncoder().encode(valor)
  const digest = await crypto.subtle.digest("SHA-256", datos)
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
}

export async function secretosIguales(a: string, b: string): Promise<boolean> {
  const hashA = await hashSeguro(a)
  const hashB = await hashSeguro(b)
  if (hashA.length !== hashB.length) return false
  let diferencia = 0
  for (let i = 0; i < hashA.length; i++) {
    diferencia |= hashA.charCodeAt(i) ^ hashB.charCodeAt(i)
  }
  return diferencia === 0
}

export async function verificarBearerAdmin(req: Request): Promise<boolean> {
  const esperado = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!esperado || !esperado.trim()) return false
  const auth = req.headers.get("authorization")
  if (!auth || !auth.startsWith("Bearer ")) return false
  const token = auth.slice(7).trim()
  if (!token) return false
  return secretosIguales(token, esperado)
}

export async function usuarioAutenticado(req: Request): Promise<string | null> {
  const nextReq = new NextRequest(req.url, { headers: req.headers })
  const token = await getToken({
    req: nextReq,
    secret: process.env.NEXTAUTH_SECRET,
  })
  return token?.sub || null
}

export function respuestaLimite(): NextResponse {
  return NextResponse.json(
    { ok: false, error: "Demasiadas solicitudes. Intenta de nuevo más tarde." },
    { status: 429, headers: { "Retry-After": "60" } }
  )
}

export function errorInterno(err: unknown): NextResponse {
  console.error("Error interno de API:", err)
  return NextResponse.json(
    { ok: false, error: "Error interno del servidor." },
    { status: 500 }
  )
}

export function noAutorizado(): NextResponse {
  return NextResponse.json({ ok: false, error: "No autorizado." }, { status: 401 })
}

export function esOwner(userId: string | null, email: string | null | undefined): boolean {
  const emailOwner = process.env.OWNER_EMAIL?.trim().toLowerCase()
  if (emailOwner && email) {
    return email.trim().toLowerCase() === emailOwner
  }
  const userIdOwner = process.env.OWNER_USER_ID?.trim()
  if (userIdOwner && userId) {
    return userId === userIdOwner
  }
  return false
}

