import { Suspense } from "react";
import { getSession } from "@/lib/server/auth";
import { getLang } from "@/lib/i18n/get-lang";
import { t } from "@/lib/i18n/translations";
import {
  getFeaturedAnime,
  getAnimeRow,
  getLatestEpisodes,
  getContinueWatching,
  getCatalogFacets,
  listAnimes,
  type SortOrder,
} from "@/lib/server/catalog";
import { HeroBanner } from "@/components/HeroBanner";
import { AnimeSection } from "@/components/AnimeSection";
import { LatestEpisodesSection } from "@/components/LatestEpisodesSection";
import { ContinueWatchingSection } from "@/components/ContinueWatchingSection";
import { ExploreFilters } from "@/components/ExploreFilters";
import { AnimeCard } from "@/components/AnimeCard";
import { Pagination } from "@/components/Pagination";

export const revalidate = 120;

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function str(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

export default async function HomePage({ searchParams }: { searchParams: SearchParams }) {
  const [sp, lang] = await Promise.all([searchParams, getLang()]);
  const genero = str(sp.genero);
  const anio = str(sp.anio);
  const estado = str(sp.estado);
  const orden = (str(sp.orden) as SortOrder) || "recientes";
  const page = Math.max(1, Number(str(sp.page) || "1") || 1);

  const hayFiltro = !!(genero || anio || estado || str(sp.orden) || page > 1);
  const sessionPromise = getSession();

  const [featured, simulcasts, popular, action, latest, facets, catalog] = await Promise.all([
    hayFiltro ? Promise.resolve(null) : getFeaturedAnime(),
    hayFiltro ? Promise.resolve([]) : getAnimeRow({ estado: "en emisión", orden: "puntuacion", limit: 18 }),
    hayFiltro ? Promise.resolve([]) : getAnimeRow({ orden: "puntuacion", limit: 18 }),
    hayFiltro ? Promise.resolve([]) : getAnimeRow({ genero: "Action", orden: "puntuacion", limit: 18 }),
    hayFiltro ? Promise.resolve([]) : getLatestEpisodes(12),
    getCatalogFacets(),
    listAnimes({ genero, anio, estado, orden, page, perPage: 24 }),
  ]);

  const session = await sessionPromise;
  const continueWatching = session?.user?.id && !hayFiltro ? await getContinueWatching(session.user.id, 12) : [];

  const exploreTitle =
    estado === "en emisión"
      ? t(lang, "exploreTitleSimulcasts")
      : orden === "puntuacion"
        ? t(lang, "exploreTitlePopular")
        : t(lang, "exploreTitle");

  return (
    <div>
      {!hayFiltro && featured && <HeroBanner anime={featured} lang={lang} />}

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {!hayFiltro && (
          <>
            <ContinueWatchingSection items={continueWatching} lang={lang} />
            <LatestEpisodesSection items={latest} lang={lang} />
            <AnimeSection title={t(lang, "sectionSimulcasts")} subtitle={t(lang, "sectionSimulcastsSub")} animes={simulcasts} lang={lang} />
            <AnimeSection title={t(lang, "sectionPopular")} subtitle={t(lang, "sectionPopularSub")} animes={popular} lang={lang} />
            <AnimeSection title={t(lang, "sectionAction")} animes={action} lang={lang} />
          </>
        )}

        <section id="explorar" className="mb-8 scroll-mt-24">
          <div className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
            <div>
              <h1 className="text-3xl font-bold text-white">{exploreTitle}</h1>
              <p className="mt-1 text-gray-400">{t(lang, "exploreSubtitle")}</p>
            </div>
            <Suspense fallback={<div className="skeleton h-10 w-full max-w-md rounded-xl" />}>
              <ExploreFilters facets={facets} basePath="/" />
            </Suspense>
          </div>

          {catalog.items.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-[var(--surface)] py-20 text-center text-gray-400">
              {t(lang, "noResults")}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-6 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8">
              {catalog.items.map((anime) => (
                <AnimeCard key={anime.id} anime={anime} lang={lang} />
              ))}
            </div>
          )}

          <Pagination
            page={catalog.page}
            totalPages={catalog.totalPages}
            basePath="/"
            lang={lang}
            params={{ genero, anio, estado, orden: orden !== "recientes" ? orden : undefined }}
          />
        </section>
      </div>
    </div>
  );
}