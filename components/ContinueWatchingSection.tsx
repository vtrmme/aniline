import Link from "next/link";
import Image from "next/image";
import { Play } from "lucide-react";
import type { AnimeRow } from "@/types/db";
import { animeTitle } from "@/lib/server/catalog";
import type { Lang } from "@/lib/i18n/translations";
import { t } from "@/lib/i18n/translations";

export function ContinueWatchingSection({ items, lang }: { items: Array<{ anime: AnimeRow; episodio_numero: number }>; lang: Lang }) {
  if (items.length === 0) return null;
  return (
    <section className="mb-10">
      <div className="mb-4">
        <h2 className="text-xl font-bold text-white md:text-2xl">{t(lang, "sectionContinue")}</h2>
        <p className="mt-0.5 text-sm text-[var(--muted)]">{t(lang, "sectionContinueSub")}</p>
      </div>
      <div className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth px-4 pb-2 sm:-mx-6 sm:px-6 lg:mx-0 lg:px-0" role="list">
        {items.map(({ anime, episodio_numero }) => {
          const title = animeTitle(anime, lang);
          const poster = anime.poster_url && anime.poster_url.startsWith("http") ? anime.poster_url : "/placeholder-anime.svg";
          return (
            <Link key={anime.id} href={`/anime/${anime.slug}/${episodio_numero}`} className="group block w-[150px] shrink-0 snap-start sm:w-[170px]" role="listitem">
              <div className="relative aspect-[2/3] overflow-hidden rounded-xl bg-[var(--surface)] ring-1 ring-white/5 transition duration-300 group-hover:-translate-y-1 group-hover:ring-[var(--brand)]/60">
                <Image src={poster} alt={title} fill sizes="170px" className="object-cover transition-transform duration-300 group-hover:scale-105" />
                <div className="gradient-card absolute inset-0" />
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--brand)] text-white"><Play size={20} fill="currentColor" aria-hidden="true" /></span>
                </div>
                <div className="absolute inset-x-0 bottom-0 p-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--brand-bright)]">{t(lang, "episode")} {episodio_numero}</span>
                  <p className="mt-0.5 line-clamp-2 text-xs font-semibold text-white">{title}</p>
                </div>
              </div>
              <p className="mt-2 line-clamp-2 text-sm text-gray-400 transition group-hover:text-white">{title}</p>
            </Link>
          );
        })}
      </div>
    </section>
  );
}