import type { Metadata } from "next"
import AnimeDetailClient from "./AnimeDetailClient"
import { createServerClient } from "@/lib/supabase"
import { getSiteUrl, siteConfig } from "@/lib/site"

interface PageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const fallback: Metadata = {
    title: "Anime",
    description: siteConfig.description,
  }

  try {
    const supabase = createServerClient()
    const { data } = await supabase
      .from("animes")
      .select("title_es, title_en, sinopsis_es, sinopsis_en, poster_url, banner_url")
      .eq("slug", slug)
      .single()

    if (!data) {
      return {
        title: "Anime no encontrado",
        description: "No se encontró el anime solicitado.",
      }
    }

    const title: string = data.title_es || data.title_en || siteConfig.name
    const descriptionRaw: string =
      data.sinopsis_es || data.sinopsis_en || siteConfig.description
    const description: string = descriptionRaw.replace(/\s+/g, " ").trim().slice(0, 160)
    const image: string = data.banner_url || data.poster_url || "/og-image.svg"
    const url: string = `${getSiteUrl()}/anime/${slug}`

    return {
      title,
      description,
      alternates: { canonical: url },
      openGraph: {
        title,
        description,
        url,
        type: "website",
        images: [{ url: image }],
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        images: [image],
      },
    }
  } catch {
    return fallback
  }
}

export default function AnimePage({ params }: PageProps) {
  return <AnimeDetailClient params={params} />
}
