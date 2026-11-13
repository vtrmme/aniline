import {
  fetchTenraiPage,
  searchTenrai,
  fetchKitsuPage,
  searchKitsu,
  buscarAnimesConFallback,
} from "@/lib/fallback-providers"
import { mapAnilistToAnime } from "@/lib/anilist"

async function main() {
  console.log("== TENRAI catalog page ==")
  const tenrai = await fetchTenraiPage(1, 3)
  console.log(`items: ${tenrai.length}`)
  const t0 = tenrai[0]
  if (t0) {
    console.log(
      `  id(mal)=${t0.id} title=${t0.title.userPreferred} eps=${t0.episodes} status=${t0.status} genres=${(t0.genres || []).join(",")} poster=${t0.coverImage?.large?.slice(0, 60)}`
    )
    const animeT = mapAnilistToAnime(t0)
    console.log(`  -> anilist_id=${animeT.anilist_id} mal_id=${animeT.mal_id} slug=${animeT.slug} puntuacion=${animeT.puntuacion}`)
  }

  console.log("== TENRAI search ==")
  const busqT = await searchTenrai("frieren", 2)
  console.log(`items: ${busqT.length} | primero: ${busqT[0]?.title.userPreferred}`)

  console.log("== KITSU catalog page ==")
  const kitsu = await fetchKitsuPage(1, 3)
  console.log(`items: ${kitsu.length}`)
  const k0 = kitsu[0]
  if (k0) {
    console.log(
      `  id=${k0.id} title=${k0.title.userPreferred} en=${k0.title.english} eps=${k0.episodes} status=${k0.status} score=${k0.averageScore} poster=${k0.coverImage?.large?.slice(0, 60)}`
    )
    const animeK = mapAnilistToAnime(k0)
    console.log(`  -> anilist_id=${animeK.anilist_id} mal_id=${animeK.mal_id} slug=${animeK.slug} puntuacion=${animeK.puntuacion}`)
  }

  console.log("== KITSU search ==")
  const busqK = await searchKitsu("frieren", 2)
  console.log(`items: ${busqK.length} | primero: ${busqK[0]?.title.userPreferred}`)

  console.log("== FALLBACK global (búsqueda) ==")
  const global = await buscarAnimesConFallback("frieren", 2)
  console.log(`items: ${global.length} | fuente del primero: ${global[0]?.fuente ?? "anilist"} (${global[0]?.title.userPreferred})`)
}

main().catch((err) => {
  console.error("FALLO:", err instanceof Error ? err.message : err)
  process.exit(1)
})
