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
  slug: string
  title_es: string
  anilist_id: number | null
}

interface WatchlistRow {
  id: string
  user_id: string
}

interface HistorialRow {
  id: string
  user_id: string
  episodio_numero: number
}

const SLUG_CON_PREFIJO = /^\d+-/

async function unifyDuplicates() {
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from("animes")
    .select("id, slug, title_es, anilist_id")

  if (error) {
    throw new Error(error.message)
  }

  const animes = (data || []) as AnimeRow[]

  // Agrupar por anilist_id
  const grupos = new Map<number, AnimeRow[]>()
  for (const anime of animes) {
    if (typeof anime.anilist_id !== "number") continue
    const grupo = grupos.get(anime.anilist_id) || []
    grupo.push(anime)
    grupos.set(anime.anilist_id, grupo)
  }

  let eliminados = 0
  let watchlistMigradas = 0
  let watchlistBorradas = 0
  let historialMigrado = 0
  let historialBorrado = 0

  for (const [, grupo] of grupos) {
    if (grupo.length < 2) continue

    // Canónico: el slug con prefijo de ID de AniList
    const canonico = grupo.find((a) => SLUG_CON_PREFIJO.test(a.slug)) || grupo[0]
    const duplicados = grupo.filter((a) => a.id !== canonico.id)

    console.log(
      `Grupo "${canonico.title_es}" (${canonico.slug}): canónico + ${duplicados.length} duplicado(s)`
    )

    for (const dup of duplicados) {
      // Watchlist: migrar al canónico si no hay conflicto
      const { data: wl, error: wlError } = await supabase
        .from("watchlists")
        .select("id, user_id")
        .eq("anime_id", dup.id)

      if (wlError) {
        console.log(`  ERROR leyendo watchlist de ${dup.slug}: ${wlError.message}`)
        continue
      }

      for (const row of (wl || []) as WatchlistRow[]) {
        const { data: existente } = await supabase
          .from("watchlists")
          .select("id")
          .eq("user_id", row.user_id)
          .eq("anime_id", canonico.id)
          .maybeSingle()

        if (existente) {
          const { error: delError } = await supabase
            .from("watchlists")
            .delete()
            .eq("id", row.id)
          if (!delError) watchlistBorradas++
        } else {
          const { error: updError } = await supabase
            .from("watchlists")
            .update({ anime_id: canonico.id })
            .eq("id", row.id)
          if (!updError) watchlistMigradas++
        }
      }

      // Historial: migrar al canónico si no hay conflicto
      const { data: hist, error: histError } = await supabase
        .from("historial")
        .select("id, user_id, episodio_numero")
        .eq("anime_id", dup.id)

      if (histError) {
        console.log(`  ERROR leyendo historial de ${dup.slug}: ${histError.message}`)
        continue
      }

      for (const row of (hist || []) as HistorialRow[]) {
        const { data: existente } = await supabase
          .from("historial")
          .select("id")
          .eq("user_id", row.user_id)
          .eq("anime_id", canonico.id)
          .eq("episodio_numero", row.episodio_numero)
          .maybeSingle()

        if (existente) {
          const { error: delError } = await supabase
            .from("historial")
            .delete()
            .eq("id", row.id)
          if (!delError) historialBorrado++
        } else {
          const { error: updError } = await supabase
            .from("historial")
            .update({ anime_id: canonico.id })
            .eq("id", row.id)
          if (!updError) historialMigrado++
        }
      }

      // Borrar el duplicado (episodios se eliminan en cascada)
      const { error: delAnime } = await supabase
        .from("animes")
        .delete()
        .eq("id", dup.id)

      if (delAnime) {
        console.log(`  ERROR borrando ${dup.slug}: ${delAnime.message}`)
      } else {
        eliminados++
        console.log(`  BORRADO ${dup.slug} → unificado en ${canonico.slug}`)
      }
    }
  }

  console.log(`\nDuplicados eliminados: ${eliminados}`)
  console.log(`Watchlist migradas: ${watchlistMigradas}, borradas por conflicto: ${watchlistBorradas}`)
  console.log(`Historial migrado: ${historialMigrado}, borrado por conflicto: ${historialBorrado}`)
}

unifyDuplicates().catch((err) => {
  console.error("Error:", err instanceof Error ? err.message : err)
  process.exit(1)
})
