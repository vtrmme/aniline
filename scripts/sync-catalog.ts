import { syncCatalog } from "@/lib/catalog"
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

const argumento = process.argv[2]
const meta = argumento ? Number(argumento) : 2000

if (!Number.isInteger(meta) || meta < 1) {
  console.error("Uso: npx tsx scripts/sync-catalog.ts [meta]\nEjemplo: npx tsx scripts/sync-catalog.ts 2000")
  process.exit(1)
}

async function main() {
  console.log(`Sincronizando catálogo AniList hasta ${meta} animes...`)

  const resultado = await syncCatalog({
    meta,
    onProgreso: (pagina, procesados, insertados) => {
      console.log(`  Página ${pagina}: ${procesados} procesados, ${insertados} nuevos`)
    },
  })

  console.log("\nSincronización completada:")
  console.log(`  Insertados: ${resultado.insertados}`)
  console.log(`  Actualizados: ${resultado.actualizados}`)
  console.log(`  Episodios creados: ${resultado.episodiosCreados}`)
  console.log(`  Errores: ${resultado.errores}`)
}

main().catch((err) => {
  console.error("Error fatal:", err instanceof Error ? err.message : err)
  process.exit(1)
})
