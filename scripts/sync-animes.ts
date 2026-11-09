import { createServerClient } from "@/lib/supabase"
import { searchAnimes, mapAnilistToAnime } from "@/lib/anilist"
import * as fs from "fs"
import * as path from "path"

// Cargar variables de entorno desde .env.local si no están definidas
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

const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SERVICE_ROLE_KEY) {
  throw new Error("SUPABASE_SERVICE_ROLE_KEY no está definida en las variables de entorno")
}

interface EpisodeInsert {
  anime_id: string
  numero: number
  title_es?: string
  title_en?: string
  video_url?: string | null
  youtube_url?: string | null
  orden?: number
}

async function syncAnimes() {
  console.log("Iniciando sincronización de animes desde AniList...")

  const supabase = createServerClient()
  const animes = await searchAnimes("", 50)
  console.log(`Obtenidos ${animes.length} animes de AniList`)

  let inserted = 0
  let updated = 0
  let errors = 0

  for (const media of animes) {
    let animeId: string
    try {
      const animeData = mapAnilistToAnime(media)

      // Verificar si ya existe por slug
      const { data: existing } = await supabase
        .from("animes")
        .select("id")
        .eq("slug", animeData.slug)
        .single()

      if (existing) {
        // Actualizar existente
        const { error } = await supabase
          .from("animes")
          .update({
            title_es: animeData.title_es,
            title_en: animeData.title_en,
            sinopsis_es: animeData.sinopsis_es,
            sinopsis_en: animeData.sinopsis_en,
            poster_url: animeData.poster_url,
            banner_url: animeData.banner_url,
            genero: animeData.genero,
            anio: animeData.anio,
            estado: animeData.estado,
          })
          .eq("id", existing.id)

        if (error) {
          console.error(`Error actualizando ${animeData.slug}:`, error.message)
          errors++
          continue
        }
        updated++
        console.log(`Actualizado: ${animeData.title_es}`)
        animeId = existing.id
      } else {
        // Insertar nuevo
        const { data, error } = await supabase
          .from("animes")
          .insert(animeData)
          .select("id")
          .single()

        if (error) {
          console.error(`Error insertando ${animeData.slug}:`, error.message)
          errors++
          continue
        }

        inserted++
        console.log(`Insertado: ${animeData.title_es}`)
        animeId = data.id
      }

      // Crear/actualizar episodios (1 a N) con video_url vacío
      const totalEpisodes = media.episodes || 12
      const episodesToInsert: EpisodeInsert[] = []

      for (let i = 1; i <= totalEpisodes; i++) {
        episodesToInsert.push({
          anime_id: animeId,
          numero: i,
          title_es: `Episodio ${i}`,
          title_en: `Episode ${i}`,
          video_url: "",
          orden: i,
        })
      }

      if (episodesToInsert.length > 0) {
        // Eliminar episodios existentes para evitar duplicados
        await supabase.from("episodes").delete().eq("anime_id", animeId)

        const { error: epError } = await supabase
          .from("episodes")
          .insert(episodesToInsert)

        if (epError) {
          console.error(`Error creando episodios para ${animeData.slug}:`, epError.message)
        } else {
          console.log(`  Creados ${episodesToInsert.length} episodios`)
        }
      }
    } catch (err) {
      console.error(`Error procesando anime:`, err)
      errors++
    }
  }

  console.log(`\nSincronización completada: ${inserted} insertados, ${updated} actualizados, ${errors} errores`)
  return { inserted, updated, errors }
}

syncAnimes().catch((err) => {
  console.error("Error fatal en sincronización:", err)
  process.exit(1)
})
