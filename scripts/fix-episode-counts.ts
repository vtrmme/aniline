import { createServerClient } from "@/lib/supabase"
import { fetchAnimeById, computeTotalEpisodes } from "@/lib/anilist"
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
  slug: string
  title_es: string
  anilist_id: number | null
}

interface EpisodeInsert {
  anime_id: string
  numero: number
  title_es: string
  title_en: string
  video_url: string
  orden: number
}

function dormir(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function fixEpisodeCounts() {
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from("animes")
    .select("id, slug, title_es, anilist_id")

  if (error) {
    throw new Error(error.message)
  }

  const animes = (data || []) as AnimeRow[]
  console.log(`Animes a revisar: ${animes.length}`)

  let corregidos = 0
  let sinId = 0
  let errores = 0

  for (const anime of animes) {
    if (typeof anime.anilist_id !== "number") {
      sinId++
      console.log(`  SIN ID ${anime.slug}`)
      continue
    }

    try {
      const { data: epsActuales, error: epsError } = await supabase
        .from("episodes")
        .select("numero")
        .eq("anime_id", anime.id)

      if (epsError) {
        throw new Error(epsError.message)
      }

      const existentes = new Set<number>(
        (epsActuales || []).map((e: { numero: number }) => e.numero)
      )
      const actual = existentes.size

      let media = await fetchAnimeById(anime.anilist_id)
      await dormir(1500)
      if (!media) {
        // AniList puede limitar peticiones: reintento tras una espera
        await dormir(8000)
        media = await fetchAnimeById(anime.anilist_id)
        await dormir(1500)
      }

      if (!media) {
        console.log(`  NO ENCONTRADO en AniList: ${anime.title_es}`)
        errores++
        continue
      }

      const total = computeTotalEpisodes(media, actual)

      if (total > actual) {
        const faltantes: EpisodeInsert[] = []
        for (let i = 1; i <= total; i++) {
          if (existentes.has(i)) continue
          faltantes.push({
            anime_id: anime.id,
            numero: i,
            title_es: `Episodio ${i}`,
            title_en: `Episode ${i}`,
            video_url: "",
            orden: i,
          })
        }

        for (let i = 0; i < faltantes.length; i += 500) {
          const lote = faltantes.slice(i, i + 500)
          const { error: insError } = await supabase.from("episodes").insert(lote)
          if (insError) {
            throw new Error(insError.message)
          }
        }

        corregidos++
        console.log(`  OK ${anime.title_es}: ${actual} → ${total} episodios (+${faltantes.length})`)
      }

      await supabase
        .from("animes")
        .update({ episodios_count: total })
        .eq("id", anime.id)
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error desconocido"
      console.log(`  ERROR ${anime.title_es}: ${message}`)
      errores++
    }
  }

  console.log(`\nCorregidos: ${corregidos}, sin anilist_id: ${sinId}, errores: ${errores}`)
}

fixEpisodeCounts().catch((err) => {
  console.error("Error:", err instanceof Error ? err.message : err)
  process.exit(1)
})
