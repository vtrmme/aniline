import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAnimeBySlug, animeTitle } from "@/lib/server/catalog";
import { getSiteUrl, siteConfig } from "@/lib/site";
import { getLang } from "@/lib/i18n/get-lang";
import { t } from "@/lib/i18n/translations";
import { EpisodeClient } from "@/components/episode/EpisodeClient";

type Params = Promise<{ slug: string; episode: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const [{ slug, episode }, lang] = await Promise.all([params, getLang()]);
  try {
    const anime = await getAnimeBySlug(slug);
    if (!anime) return { title: t(lang, "animeNotFound") };
    const num = Number(episode);
    const ep = anime.episodes.find((e) => e.numero === num);
    const title = animeTitle(anime, lang);
    const epTitle = ep ? (ep.title_es || ep.title_en || `${t(lang, "episode")} ${ep.numero}`) : `${t(lang, "episode")} ${episode}`;
    const fullTitle = `${title} - ${epTitle}`;
    const descRaw = (lang === "es" ? anime.sinopsis_es : anime.sinopsis_en) || anime.sinopsis_es || anime.sinopsis_en || siteConfig.description;
    const description = descRaw.replace(/\s+/g, " ").trim().slice(0, 160);
    const image = anime.banner_url || anime.poster_url || "/og-image.svg";
    const url = `${getSiteUrl()}/anime/${slug}/${episode}`;
    return {
      title: fullTitle,
      description,
      alternates: { canonical: url },
      openGraph: { title: fullTitle, description, url, type: "video.episode", images: [{ url: image }] },
      twitter: { card: "summary_large_image", title: fullTitle, description, images: [image] },
    };
  } catch {
    return { title: t(lang, "episode"), description: siteConfig.description };
  }
}

export default async function EpisodePage({ params }: { params: Params }) {
  const [{ slug, episode }, lang] = await Promise.all([params, getLang()]);
  const anime = await getAnimeBySlug(slug);
  if (!anime) notFound();
  const num = Number(episode);
  const ep = anime.episodes.find((e) => e.numero === num);
  if (!ep) notFound();

  const episodes = anime.episodes.map((e) => ({
    id: e.id,
    numero: e.numero,
    title_es: e.title_es,
    title_en: e.title_en,
    video_url: e.video_url,
    youtube_url: e.youtube_url,
  }));

  return (
    <EpisodeClient
      key={ep.id}
      lang={lang}
      anime={{
        id: anime.id,
        slug: anime.slug,
        title_es: anime.title_es,
        title_en: anime.title_en,
        sinopsis_es: anime.sinopsis_es,
        sinopsis_en: anime.sinopsis_en,
        genero: anime.genero,
      }}
      episode={{
        id: ep.id,
        numero: ep.numero,
        title_es: ep.title_es,
        title_en: ep.title_en,
        video_url: ep.video_url,
        youtube_url: ep.youtube_url,
      }}
      episodes={episodes}
    />
  );
}