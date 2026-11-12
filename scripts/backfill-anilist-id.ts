import { createServerClient } from "@/lib/supabase"
import { searchAnimes } from "@/lib/anilist"
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

function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "")
}

function bigrams(texto: string): Set<string> {
  const set = new Set<string>()
  for (let i = 0; i < texto.length - 1; i++) {
    set.add(texto.slice(i, i + 2))
  }
  return set
}

function similitud(a: string, b: string): number {
  const na = normalizar(a)
  const nb = normalizar(b)
  if (!na || !nb) return 0
  if (na === nb) return 1
  const ba = bigrams(na)
  const bb = bigrams(nb)
  if (ba.size === 0 || bb.size === 0) return 0
  let comunes = 0
  for (const g of ba) {
    if (bb.has(g)) comunes++
  }
  return (2 * comunes) / (ba.size + bb.size)
}

function dormir(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

interface AnimeRow {
  id: string
  slug: string
  title_es: string
}

async function backfill() {
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from("animes")
    .select("id, slug, title_es")
    .is("anilist_id", null)

  if (error) {
    throw new Error(error.message)
  }

  const pendientes = (data || []) as AnimeRow[]
  console.log(`Animes sin anilist_id: ${pendientes.length}`)

  let completados = 0
  const sinCoincidencia: string[] = []

  for (const anime of pendientes) {
    try {
      const candidatos = await searchAnimes(anime.title_es, 5)
      await dormir(600)

      let mejorPuntaje = 0
      let mejorId: number | null = null
      let mejorTitulo = ""

      for (const c of candidatos) {
        const opciones = [
          c.title.english,
          c.title.romaji,
          c.title.native,
          c.title.userPreferred,
          ...(c.synonyms || []),
        ].filter((t): t is string => typeof t === "string" && t.length > 0)

        for (const opcion of opciones) {
          const puntaje = similitud(anime.title_es, opcion)
          if (puntaje > mejorPuntaje) {
            mejorPuntaje = puntaje
            mejorId = c.id
            mejorTitulo = opcion
          }
        }
      }

      if (mejorId !== null && mejorPuntaje >= 0.8) {
        const { error: updError } = await supabase
          .from("animes")
          .update({ anilist_id: mejorId })
          .eq("id", anime.id)

        if (updError) {
          console.log(`  ERROR ${anime.slug}: ${updError.message}`)
        } else {
          completados++
          console.log(`  OK ${anime.title_es} -> #${mejorId} (${mejorTitulo}, ${mejorPuntaje.toFixed(2)})`)
        }
      } else {
        sinCoincidencia.push(`${anime.title_es} (mejor: ${mejorTitulo || "nada"} ${mejorPuntaje.toFixed(2)})`)
        console.log(`  SIN MATCH ${anime.title_es} (mejor ${mejorPuntaje.toFixed(2)})`)
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error desconocido"
      console.log(`  ERROR ${anime.slug}: ${message}`)
    }
  }

  console.log(`\nCompletados: ${completados}/${pendientes.length}`)
  if (sinCoincidencia.length > 0) {
    console.log("Pendientes de revisión manual:")
    for (const item of sinCoincidencia) {
      console.log(`  - ${item}`)
    }
  }
}

backfill().catch((err) => {
  console.error("Error:", err instanceof Error ? err.message : err)
  process.exit(1)
})
