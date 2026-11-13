/* Prueba la web en navegador real: home, buscar y un anime. */
import { chromium } from "playwright"

const BASE = process.env.TEST_BASE || "http://localhost:3000"

async function main() {
  const browser = await chromium.launch()
  const page = await browser.newPage()

  const erroresConsola: string[] = []
  const fallosRed: string[] = []
  page.on("console", (msg) => {
    if (msg.type() === "error") erroresConsola.push(msg.text().slice(0, 300))
  })
  page.on("requestfailed", (req) => {
    fallosRed.push(`${req.url().slice(0, 150)} => ${req.failure()?.errorText}`)
  })
  page.on("response", (res) => {
    if (res.status() >= 400) fallosRed.push(`${res.status()} ${res.url().slice(0, 150)}`)
  })

  console.log(`== HOME ${BASE}/ ==`)
  await page.goto(BASE + "/", { waitUntil: "networkidle", timeout: 45000 })
  await page.waitForTimeout(3000)
  const cards = await page.locator("a[href^='/anime/']").count()
  const imgs = await page.locator("img").count()
  const h1 = await page.locator("h1").first().textContent().catch(() => null)
  console.log(`links anime: ${cards} | imgs: ${imgs} | h1: ${h1}`)

  console.log(`== BUSCAR ==`)
  await page.goto(BASE + "/buscar?q=naruto", { waitUntil: "networkidle", timeout: 45000 })
  await page.waitForTimeout(3000)
  const cards2 = await page.locator("a[href^='/anime/']").count()
  console.log(`resultados: ${cards2}`)

  console.log(`== ANIME (primer link de home) ==`)
  await page.goto(BASE + "/", { waitUntil: "domcontentloaded", timeout: 45000 })
  const primerLink = await page.locator("a[href^='/anime/']").first().getAttribute("href")
  if (primerLink) {
    await page.goto(BASE + primerLink, { waitUntil: "networkidle", timeout: 45000 })
    await page.waitForTimeout(2500)
    const episodios = await page.locator("a[href*='/anime/']").count()
    const titulo = await page.locator("h1").first().textContent().catch(() => null)
    console.log(`anime: ${primerLink} | h1: ${titulo} | anchors: ${episodios}`)
  }

  console.log("\n== ERRORES CONSOLA ==")
  console.log(erroresConsola.length ? erroresConsola.join("\n") : "(ninguno)")
  console.log("\n== FALLOS RED ==")
  console.log(fallosRed.length ? Array.from(new Set(fallosRed)).join("\n") : "(ninguno)")

  await browser.close()
}

main().catch((e) => {
  console.error("FATAL:", e.message)
  process.exit(1)
})
