import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site";
import { createAdminSupabaseClient } from "@/lib/server/supabase";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getSiteUrl();

  let animeUrls: MetadataRoute.Sitemap = [];
  try {
    const supabase = createAdminSupabaseClient();
    const { data: animes } = await supabase
      .from("animes")
      .select("slug, updated_at")
      .order("created_at", { ascending: false })
      .limit(10000);
    animeUrls = (animes || []).map((a) => ({
      url: `${siteUrl}/anime/${a.slug}`,
      lastModified: a.updated_at ? new Date(a.updated_at) : new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    }));
  } catch {
    animeUrls = [];
  }

  return [
    { url: `${siteUrl}/`, lastModified: new Date(), changeFrequency: "daily", priority: 1 },
    { url: `${siteUrl}/buscar`, lastModified: new Date(), changeFrequency: "daily", priority: 0.8 },
    ...animeUrls,
  ];
}