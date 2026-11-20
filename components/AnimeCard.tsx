import Link from "next/link";
import Image from "next/image";
import { Play, Star } from "lucide-react";
import type { AnimeRow } from "@/types/db";
import { animeTitle } from "@/lib/server/catalog";
import type { Lang } from "@/lib/i18n/translations";
import { t } from "@/lib/i18n/translations";

interface AnimeCardProps {
  anime: Pick<AnimeRow, "slug" | "title_es" | "title_en" | "poster_url" | "puntuacion" | "estado" | "tipo" | "anio">;
  lang?: Lang;
  priority?: boolean;
}

export function AnimeCard({ anime, lang = "es", priority = false }: AnimeCardProps) {
  const title = animeTitle(anime, lang);
  const poster = anime.poster_url && anime.poster_url.startsWith("http") ? anime.poster_url : "/placeholder-anime.svg";

  return (
    <Link href={`/anime/${anime.slug}`} className="group block h-full focus-visible:rounded-xl">
      <article className="relative aspect-[2/3] overflow-hidden rounded-xl bg-[var(--surface)] ring-1 ring-white/5 transition duration-300 group-hover:-translate-y-1.5 group-hover:ring-[var(--brand)]/60 group-hover:shadow-[var(--shadow-elevated)]">
        <Image
          src={poster}
          alt={title}
          fill
          priority={priority}
          sizes="(max-width: 640px) 45vw, (max-width: 1024px) 22vw, 180px"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />
        {anime.puntuacion != null && (
          <span className="badge-gold absolute left-2 top-2 z-10 inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-bold backdrop-blur">
            <Star size={10} fill="currentColor" aria-hidden="true" />
            {Number(anime.puntuacion).toFixed(1).replace(/\.0$/, "")}
          </span>
        )}
        <div className="gradient-card absolute inset-0 flex flex-col justify-end p-3 opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-visible:opacity-100">
          <div className="mb-2 flex flex-wrap items-center gap-1.5 text-[10px] font-semibold">
            {anime.tipo && <span className="rounded bg-black/60 px-1.5 py-0.5 text-gray-200 backdrop-blur">{anime.tipo}</span>}
            {anime.estado && <span className="badge-brand rounded bg-black/60 px-1.5 py-0.5 backdrop-blur">{anime.estado}</span>}
          </div>
          <span className="inline-flex items-center justify-center gap-1.5 rounded-full bg-[var(--brand)] px-3 py-1.5 text-xs font-bold text-white">
            <Play size={12} fill="currentColor" aria-hidden="true" />
            {t(lang, "watch")}
          </span>
        </div>
      </article>
      <h3 className="mt-2 line-clamp-2 text-sm font-medium leading-snug text-gray-200 transition group-hover:text-white">{title}</h3>
      {anime.anio && <p className="mt-0.5 text-xs text-gray-500">{anime.anio}</p>}
    </Link>
  );
}