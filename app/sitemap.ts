import { createServerClient } from "@/lib/supabase"
import { getSiteUrl } from "@/lib/site"
import type { MetadataRoute } from "next"

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl: string = getSiteUrl()

  let animeUrls: MetadataRoute.Sitemap = []
  try {
    const supabase = createServerClient()
    const { data: animes } = await supabase
      .from("animes")
      .select("slug, updated_at")
      .order("created_at", { ascending: false })
      .limit(10000)

    animeUrls = (animes || []).map((a) => ({
      url: `${siteUrl}/anime/${a.slug}`,
      lastModified: a.updated_at ? new Date(a.updated_at) : new Date(),
    }))
  } catch {
    animeUrls = []
  }

  return [
    {
      url: `${siteUrl}/`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${siteUrl}/buscar`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${siteUrl}/lista`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.6,
    },
    {
      url: `${siteUrl}/perfil`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.6,
    },
    {
      url: `${siteUrl}/apoyanos`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.5,
    },
    ...animeUrls,
  ]
}
