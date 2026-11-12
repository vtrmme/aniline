import { createServerClient } from "@/lib/supabase"
import type { MetadataRoute } from "next"

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = createServerClient()

  const { data: animes } = await supabase
    .from("animes")
    .select("slug, updated_at")
    .order("created_at", { ascending: false })
    .limit(10000)

  const animeUrls = (animes || []).map((a) => ({
    url: `https://aniline.vercel.app/anime/${a.slug}`,
    lastModified: a.updated_at ? new Date(a.updated_at) : new Date(),
  }))

  return [
    {
      url: "https://aniline.vercel.app/",
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: "https://aniline.vercel.app/buscar",
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: "https://aniline.vercel.app/lista",
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.6,
    },
    {
      url: "https://aniline.vercel.app/perfil",
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.6,
    },
    ...animeUrls,
  ]
}
