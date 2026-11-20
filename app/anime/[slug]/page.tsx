import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Play, Star, Calendar, Film, Tv, Clapperboard } from "lucide-react";
import { getAnimeBySlug, getSimilarAnimes, animeTitle } from "@/lib/server/catalog";
import { getSiteUrl, siteConfig } from "@/lib/site";
import { getLang } from "@/lib/i18n/get-lang";
import { t } from "@/lib/i18n/translations";
import { AnimeSection } from "@/components/AnimeSection";
import { WatchlistButton } from "@/components/episode/WatchlistButton";

type Params = Promise<{ slug: string }>;

export const revalidate = 300;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const [{ slug }, lang] = await Promise.all([params, getLang()]);
  try {
    const anime = await getAnimeBySlug(slug);
    if (!anime) return { title: t(lang, "animeNotFound") };
    const title = animeTitle(anime, lang);
    const description = ((lang === "es" ? anime.sinopsis_es : anime.sinopsis_en) || anime.sinopsis_es || anime.sinopsis_en || siteConfig.description)
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 160);
    const image = anime.banner_url || anime.poster_url || "/og-image.svg";
    const url = `${getSiteUrl()}/anime/${slug}`;
    return {
      title,
      description,
      alternates: { canonical: url },
      openGraph: { title, description, url, type: "website", images: [{ url: image }] },
      twitter: { card: "summary_large_image", title, description, images: [image] },
    };
  } catch {
    return { title: "Anime", description: siteConfig.description };
  }
}

function youtubeId(url: string | null): string | null {
  if (!url) return null;
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/);
  return m?.[1] ?? null;
}

export default async function AnimeDetailPage({ params }: { params: Params }) {
  const [{ slug }, lang] = await Promise.all([params, getLang()]);
  const anime = await getAnimeBySlug(slug);
  if (!anime) notFound();

  const title = animeTitle(anime, lang);
  const sinopsis = (lang === "es" ? anime.sinopsis_es : anime.sinopsis_en) || anime.sinopsis_es || anime.sinopsis_en;
  const poster = anime.poster_url && anime.poster_url.startsWith("http") ? anime.poster_url : "/placeholder-anime.svg";
  const banner = anime.banner_url && anime.banner_url.startsWith("http") ? anime.banner_url : null;
  const episodes = anime.episodes || [];
  const firstEp = episodes.length > 0 ? episodes[0] : null;
  const trailer = youtubeId(anime.trailer_url);
  const similares = await getSimilarAnimes(anime, 12);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {banner && (
        <div className="relative mb-6 aspect-video w-full overflow-hidden rounded-2xl bg-[var(--surface)]">
          <Image src={banner} alt={title} fill className="object-cover" priority sizes="100vw" />
          <div className="gradient-hero absolute inset-0" />
          <div className="absolute inset-x-0 bottom-0 flex flex-wrap items-end justify-between gap-4 p-6 md:p-10">
            <div className="max-w-2xl">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                {anime.puntuacion != null && (
                  <span className="badge-gold inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold">
                    <Star size={12} fill="currentColor" aria-hidden="true" /> {anime.puntuacion}
                  </span>
                )}
                {anime.estado && (
                  <span className="badge-brand rounded-full px-2.5 py-1 text-xs font-bold uppercase tracking-wide">{anime.estado}</span>
                )}
              </div>
              <h1 className="text-3xl font-bold text-white drop-shadow-lg md:text-5xl">{title}</h1>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <WatchlistButton animeId={anime.id} />
              {firstEp && (
                <Link href={`/anime/${slug}/${firstEp.numero}`} className="btn-brand inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-bold">
                  <Play size={18} fill="currentColor" aria-hidden="true" /> {t(lang, "startWatching")}
                </Link>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        <aside className="lg:col-span-4">
          {!banner && (
            <div className="relative mb-4 aspect-[2/3] overflow-hidden rounded-xl bg-[var(--surface)] shadow-[var(--shadow-card)]">
              <Image src={poster} alt={title} fill className="object-cover" priority sizes="(max-width: 1024px) 100vw, 360px" />
            </div>
          )}
          {banner && (
            <div className="relative -mt-24 mb-4 aspect-[2/3] w-40 overflow-hidden rounded-xl border-4 border-[var(--bg)] bg-[var(--surface)] shadow-[var(--shadow-elevated)] md:hidden">
              <Image src={poster} alt={title} fill className="object-cover" sizes="160px" />
            </div>
          )}

          <div className="glass-panel space-y-3 rounded-2xl p-5">
            <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400">{t(lang, "info")}</h3>
            <dl className="space-y-2 text-sm">
              {anime.tipo && (
                <div className="flex items-center gap-2 text-gray-300">
                  <Tv size={15} className="text-gray-500" aria-hidden="true" />
                  <span className="text-gray-500">{t(lang, "type")}:</span> {anime.tipo}
                </div>
              )}
              {anime.anio && (
                <div className="flex items-center gap-2 text-gray-300">
                  <Calendar size={15} className="text-gray-500" aria-hidden="true" />
                  <span className="text-gray-500">{t(lang, "year")}:</span> {anime.anio}
                </div>
              )}
              {anime.estudio && (
                <div className="flex items-center gap-2 text-gray-300">
                  <Clapperboard size={15} className="text-gray-500" aria-hidden="true" />
                  <span className="text-gray-500">{t(lang, "studio")}:</span> {anime.estudio}
                </div>
              )}
              {anime.episodios_count != null && (
                <div className="flex items-center gap-2 text-gray-300">
                  <Film size={15} className="text-gray-500" aria-hidden="true" />
                  <span className="text-gray-500">{t(lang, "episodes")}:</span> {anime.episodios_count}
                </div>
              )}
              {anime.puntuacion != null && (
                <div className="flex items-center gap-2 text-gray-300">
                  <Star size={15} className="text-[var(--gold)]" aria-hidden="true" />
                  <span className="text-gray-500">{t(lang, "score")}:</span> {anime.puntuacion}
                </div>
              )}
              {anime.estado && (
                <div className="flex items-center gap-2 text-gray-300">
                  <span className="text-gray-500">{t(lang, "status")}:</span>
                  <span className="badge-brand rounded-full px-2 py-0.5 text-xs">{anime.estado}</span>
                </div>
              )}
            </dl>
            {anime.genero && anime.genero.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {anime.genero.map((g) => (
                  <Link key={g} href={`/?genero=${encodeURIComponent(g)}`} className="chip text-xs">
                    {g}
                  </Link>
                ))}
              </div>
            )}
          </div>

          {trailer && (
            <div className="mt-6">
              <h3 className="mb-2 text-sm font-bold uppercase tracking-wider text-gray-400">{t(lang, "trailer")}</h3>
              <div className="aspect-video overflow-hidden rounded-xl bg-black ring-1 ring-white/10">
                <iframe
                  src={`https://www.youtube.com/embed/${trailer}?rel=0`}
                  title={t(lang, "trailer")}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  loading="lazy"
                  className="h-full w-full"
                />
              </div>
            </div>
          )}
        </aside>

        <div className="lg:col-span-8">
          {!banner && (
            <div className="mb-4">
              <h1 className="text-3xl font-bold text-white md:text-4xl">{title}</h1>
              {anime.title_en && anime.title_en !== anime.title_es && (
                <p className="mt-1 text-sm text-gray-500">{anime.title_en}</p>
              )}
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <WatchlistButton animeId={anime.id} />
                {firstEp && (
                  <Link href={`/anime/${slug}/${firstEp.numero}`} className="btn-brand inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-bold">
                    <Play size={18} fill="currentColor" aria-hidden="true" /> {t(lang, "startWatching")}
                  </Link>
                )}
              </div>
            </div>
          )}

          {sinopsis && (
            <div className="mb-8">
              <h2 className="mb-2 text-xl font-bold text-white">{t(lang, "synopsis")}</h2>
              <p className="whitespace-pre-line leading-relaxed text-gray-300">{sinopsis}</p>
            </div>
          )}

          <section>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">{t(lang, "episodes")}</h2>
              <span className="text-sm text-gray-500">{t(lang, "episodesCount", { count: episodes.length })}</span>
            </div>
            {episodes.length === 0 ? (
              <div className="rounded-xl border border-white/10 bg-[var(--surface)] p-8 text-center text-gray-400">
                {t(lang, "noEpisodes")}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5">
                {episodes.map((ep) => {
                  const epTitle = ep.title_es || ep.title_en || `${t(lang, "episode")} ${ep.numero}`;
                  return (
                    <Link
                      key={ep.id}
                      href={`/anime/${slug}/${ep.numero}`}
                      className="group block rounded-xl border border-white/8 bg-[var(--surface)] p-4 transition hover:-translate-y-0.5 hover:border-[var(--brand)]/60 hover:bg-[var(--surface-hover)] hover:shadow-[var(--shadow-card)]"
                    >
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-sm font-bold text-[var(--brand-bright)]">#{ep.numero}</span>
                        <span className="text-xs text-gray-500 transition group-hover:text-[var(--brand-bright)]">{t(lang, "watch")}</span>
                      </div>
                      <h3 className="line-clamp-2 text-sm text-white transition group-hover:text-[var(--brand-bright)]">{epTitle}</h3>
                    </Link>
                  );
                })}
              </div>
            )}
          </section>

          {similares.length > 0 && (
            <div className="mt-12">
              <AnimeSection title={t(lang, "sectionSimilar")} animes={similares} lang={lang} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}