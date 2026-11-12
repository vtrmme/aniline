import { createServerClient } from "@/lib/supabase"
import { buscarEnEspanol } from "@/lib/tmdb"
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
  title_en: string | null
  sinopsis_es: string | null
  sinopsis_en: string | null
  anio: number | null
  tipo: string | null
}

function dormir(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function yaEnriquecido(a: AnimeRow): boolean {
  return (
    a.title_es !== a.title_en &&
    !!a.sinopsis_es &&
    a.sinopsis_es !== a.sinopsis_en
  )
}

async function enrichSpanish() {
  if (!process.env.TMDB_API_KEY || !process.env.TMDB_API_KEY.trim()) {
    throw new Error(
      "TMDB_API_KEY no está definida. Crée la clave gratuita en https://www.themoviedb.org/settings/api"
    )
  }

  const supabase = createServerClient()

  const { data, error } = await supabase
    .from("animes")
    .select("id, title_es, title_en, sinopsis_es, sinopsis_en, anio, tipo")

  if (error) {
    throw new Error(error.message)
  }

  const animes = (data || []) as AnimeRow[]
  const pendientes = animes.filter((a) => !yaEnriquecido(a))

  console.log(`Animes: ${animes.length} | pendientes de traducir: ${pendientes.length}`)

  let traducidos = 0
  let sinMatch = 0
  let errores = 0
  let procesados = 0

  for (const anime of pendientes) {
    try {
      const candidatos = [anime.title_en, anime.title_es].filter(
        (t): t is string => !!t && t.trim().length > 0
      )
      const unicos = Array.from(new Set(candidatos))

      const match = await buscarEnEspanol(unicos, anime.anio, anime.tipo || undefined)

      if (match) {
        const update: { title_es: string; sinopsis_es?: string } = {
          title_es: match.title_es,
        }
        if (match.sinopsis_es) {
          update.sinopsis_es = match.sinopsis_es
        }

        const { error: updError } = await supabase
          .from("animes")
          .update(update)
          .eq("id", anime.id)

        if (updError) {
          errores++
          console.log(`  ERROR ${anime.title_es}: ${updError.message}`)
        } else {
          traducidos++
        }
      } else {
        sinMatch++
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error desconocido"
      errores++
      console.log(`  ERROR ${anime.title_es}: ${message}`)
    }

    procesados++
    if (procesados % 50 === 0) {
      console.log(`  Progreso: ${procesados}/${pendientes.length} (${traducidos} traducidos)`)
    }
    await dormir(250)
  }

  console.log(`\nCompletado:`)
  console.log(`  Traducidos: ${traducidos}`)
  console.log(`  Sin match en TMDB: ${sinMatch}`)
  console.log(`  Errores: ${errores}`)
}

enrichSpanish().catch((err) => {
  console.error("Error:", err instanceof Error ? err.message : err)
  process.exit(1)
})
