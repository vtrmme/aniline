import type { Metadata } from "next"
import EpisodeClient from "./EpisodeClient"
import { createServerClient } from "@/lib/supabase"
import { getSiteUrl, siteConfig } from "@/lib/site"

interface PageProps {
  params: Promise<{ slug: string; episode: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug, episode } = await params
  const fallback: Metadata = {
    title: "Episodio",
    description: siteConfig.description,
  }

  try {
    const numero: number = Number(episode)
    const supabase = createServerClient()

    const { data: anime } = await supabase
      .from("animes")
      .select("id, title_es, title_en, poster_url, banner_url, sinopsis_es, sinopsis_en")
      .eq("slug", slug)
      .single()

    if (!anime) {
      return {
        title: "Episodio no encontrado",
        description: "No se encontró el episodio solicitado.",
      }
    }

    let epTitle: string | null = null
    if (Number.isInteger(numero) && numero > 0) {
      const { data: ep } = await supabase
        .from("episodes")
        .select("title_es, title_en")
        .eq("anime_id", anime.id)
        .eq("numero", numero)
        .maybeSingle()
      if (ep) {
        epTitle = (ep.title_es as string | null) || (ep.title_en as string | null) || null
      }
    }

    const animeTitle: string = anime.title_es || anime.title_en || siteConfig.name
    const title: string = Number.isFinite(numero)
      ? `${animeTitle} - Episodio ${numero}${epTitle ? `: ${epTitle}` : ""}`
      : animeTitle
    const descriptionRaw: string =
      anime.sinopsis_es || anime.sinopsis_en || siteConfig.description
    const description: string = descriptionRaw.replace(/\s+/g, " ").trim().slice(0, 160)
    const image: string = anime.banner_url || anime.poster_url || "/og-image.svg"
    const url: string = `${getSiteUrl()}/anime/${slug}/${episode}`

    return {
      title,
      description,
      alternates: { canonical: url },
      openGraph: {
        title,
        description,
        url,
        type: "video.episode",
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

export default function EpisodePage({ params }: PageProps) {
  return <EpisodeClient params={params} />
}
