import { createServerClient } from "@/lib/supabase"
import * as fs from "fs"
import * as path from "path"

function loadEnv() {
  const envPath = path.resolve(process.cwd(), ".env.local")
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, "utf-8")
    for (const line of content.split("\n")) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith("#")) continue
      const eqIndex = trimmed.indexOf("=")
      if (eqIndex === -1) continue
      const key = trimmed.slice(0, eqIndex).trim()
      const value = trimmed.slice(eqIndex + 1).trim()
      if (key && !process.env[key]) {
        process.env[key] = value
      }
    }
  }
}

loadEnv()

interface AnimeRow {
  id: string
  title_es: string
  mal_id: number | null
  puntuacion_mal: number | null
}

interface JikanResponse {
  data?: {
    score?: number | null
    scored_by?: number | null
  }
}

const JIKAN_API_URL = "https://api.jikan.moe/v4"
const PAUSA_MS = 1100

function dormir(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function parseLimit(): number | null {
  const arg = process.argv.find((a) => a.startsWith("--limit="))
  if (!arg) return null
  const valor = Number(arg.slice("--limit=".length))
  return Number.isInteger(valor) && valor > 0 ? valor : null
}

async function fetchJikan(malId: number): Promise<JikanResponse["data"] | null> {
  let ultimoError = "Error desconocido de Jikan"

  for (let intento = 1; intento <= 3; intento++) {
    try {
      const response = await fetch(`${JIKAN_API_URL}/anime/${malId}`, {
        signal: AbortSignal.timeout(8000),
      })

      if (response.status === 429) {
        ultimoError = "Jikan limitó las peticiones (429)"
        await dormir(2000 * intento)
        continue
      }

      if (!response.ok) {
        return null
      }

      const json = (await response.json()) as JikanResponse
      return json.data || null
    } catch (err) {
      ultimoError = err instanceof Error ? err.message : "Error de red"
      await dormir(1500 * intento)
    }
  }

  console.log(`  ${ultimoError}`)
  return null
}

async function enrichMal() {
  const supabase = createServerClient()
  const limite = parseLimit()

  const { data, error } = await supabase
    .from("animes")
    .select("id, title_es, mal_id, puntuacion_mal")
    .not("mal_id", "is", null)
    .is("puntuacion_mal", null)

  if (error) {
    throw new Error(error.message)
  }

  let animes = (data || []) as AnimeRow[]
  if (limite !== null) {
    animes = animes.slice(0, limite)
  }

  console.log(`Animes con mal_id sin puntuación MAL: ${animes.length}`)

  let actualizados = 0
  let sinDatos = 0
  let errores = 0

  for (const anime of animes) {
    if (typeof anime.mal_id !== "number") continue

    const datos = await fetchJikan(anime.mal_id)

    if (datos && typeof datos.score === "number" && datos.score > 0) {
      const { error: updError } = await supabase
        .from("animes")
        .update({ puntuacion_mal: datos.score })
        .eq("id", anime.id)

      if (updError) {
        errores++
        console.log(`  ERROR ${anime.title_es}: ${updError.message}`)
      } else {
        actualizados++
      }
    } else {
      sinDatos++
    }

    await dormir(PAUSA_MS)
  }

  console.log(`\nCompletado:`)
  console.log(`  Actualizados: ${actualizados}`)
  console.log(`  Sin puntuación en MAL: ${sinDatos}`)
  console.log(`  Errores: ${errores}`)
}

enrichMal().catch((err) => {
  console.error("Error:", err instanceof Error ? err.message : err)
  process.exit(1)
})
