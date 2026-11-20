import Link from "next/link";
import Image from "next/image";
import { Play, Info, Star } from "lucide-react";
import type { AnimeRow } from "@/types/db";
import { animeTitle } from "@/lib/server/catalog";
import type { Lang } from "@/lib/i18n/translations";
import { t } from "@/lib/i18n/translations";

export function HeroBanner({ anime, lang }: { anime: AnimeRow; lang: Lang }) {
  const title = animeTitle(anime, lang);
  const image = anime.banner_url && anime.banner_url.startsWith("http")
    ? anime.banner_url
    : anime.poster_url && anime.poster_url.startsWith("http")
      ? anime.poster_url
      : "/placeholder-anime.svg";
  const sinopsis = (lang === "es" ? anime.sinopsis_es : anime.sinopsis_en) || anime.sinopsis_es || anime.sinopsis_en || "";

  return (
    <section className="relative mb-10 h-[62vh] min-h-[420px] max-h-[720px] w-full overflow-hidden">
      <Image src={image} alt={title} fill priority sizes="100vw" className="object-cover object-center" />
      <div className="gradient-hero absolute inset-0" />
      <div className="relative z-10 mx-auto flex h-full max-w-7xl flex-col justify-end px-4 pb-12 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            {anime.puntuacion != null && (
              <span className="badge-gold inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold">
                <Star size={12} fill="currentColor" /> {anime.puntuacion}
              </span>
            )}
            {anime.estado && (
              <span className="badge-brand rounded-full px-2.5 py-1 text-xs font-bold uppercase tracking-wide">{anime.estado}</span>
            )}
            {anime.tipo && (
              <span className="rounded-full border border-white/15 bg-black/40 px-2.5 py-1 text-xs font-medium text-gray-200 backdrop-blur">{anime.tipo}</span>
            )}
            {anime.anio && (
              <span className="rounded-full border border-white/15 bg-black/40 px-2.5 py-1 text-xs font-medium text-gray-200 backdrop-blur">{anime.anio}</span>
            )}
          </div>
          <h1 className="text-3xl font-bold leading-tight text-white drop-shadow-lg sm:text-4xl md:text-5xl lg:text-6xl">{title}</h1>
          {sinopsis && <p className="mt-3 line-clamp-3 max-w-xl text-sm leading-relaxed text-gray-300 sm:text-base">{sinopsis}</p>}
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Link href={`/anime/${anime.slug}`} className="btn-brand inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-bold">
              <Play size={18} fill="currentColor" /> {t(lang, "heroWatch")}
            </Link>
            <Link href={`/anime/${anime.slug}`} className="btn-ghost inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-bold">
              <Info size={18} /> {t(lang, "heroInfo")}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}