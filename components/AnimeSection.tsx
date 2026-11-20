import { AnimeCard } from "@/components/AnimeCard";
import type { AnimeRow } from "@/types/db";
import type { Lang } from "@/lib/i18n/translations";

interface AnimeSectionProps {
  title: string;
  subtitle?: string;
  animes: AnimeRow[];
  lang?: Lang;
}

export function AnimeSection({ title, subtitle, animes, lang = "es" }: AnimeSectionProps) {
  if (animes.length === 0) return null;
  return (
    <section className="mb-10">
      <div className="mb-4">
        <h2 className="text-xl font-bold text-white md:text-2xl">{title}</h2>
        {subtitle && <p className="mt-0.5 text-sm text-[var(--muted)]">{subtitle}</p>}
      </div>
      <div className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth px-4 pb-2 sm:-mx-6 sm:px-6 lg:mx-0 lg:px-0" role="list">
        {animes.map((anime) => (
          <div key={anime.id} className="w-[150px] shrink-0 snap-start sm:w-[170px]" role="listitem">
            <AnimeCard anime={anime} lang={lang} />
          </div>
        ))}
      </div>
    </section>
  );
}