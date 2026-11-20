import type { Metadata } from "next";
import { Suspense } from "react";
import { Search } from "lucide-react";
import { getLang } from "@/lib/i18n/get-lang";
import { t } from "@/lib/i18n/translations";
import { getCatalogFacets, listAnimes, type SortOrder } from "@/lib/server/catalog";
import { ExploreFilters } from "@/components/ExploreFilters";
import { AnimeCard } from "@/components/AnimeCard";
import { Pagination } from "@/components/Pagination";

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLang();
  return {
    title: t(lang, "searchTitle"),
    description: t(lang, "searchSubtitle"),
  };
}

export const revalidate = 60;

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function str(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

export default async function BuscarPage({ searchParams }: { searchParams: SearchParams }) {
  const [sp, lang] = await Promise.all([searchParams, getLang()]);
  const q = str(sp.q) || "";
  const genero = str(sp.genero);
  const anio = str(sp.anio);
  const estado = str(sp.estado);
  const orden = (str(sp.orden) as SortOrder) || "recientes";
  const page = Math.max(1, Number(str(sp.page) || "1") || 1);

  const [facets, catalog] = await Promise.all([
    getCatalogFacets(),
    listAnimes({ q, genero, anio, estado, orden, page, perPage: 24 }),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white">{t(lang, "searchTitle")}</h1>
        <p className="mt-1 text-gray-400">{t(lang, "searchSubtitle")}</p>
      </div>

      <form action="/buscar" method="get" className="relative mb-6" role="search">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" aria-hidden="true" />
        <label htmlFor="q" className="sr-only">{t(lang, "searchTitle")}</label>
        <input
          id="q"
          type="search"
          name="q"
          defaultValue={q}
          placeholder={t(lang, "searchPlaceholder")}
          className="input-base py-3.5 pl-12 pr-4"
        />
        {genero && <input type="hidden" name="genero" value={genero} />}
        {anio && <input type="hidden" name="anio" value={anio} />}
        {estado && <input type="hidden" name="estado" value={estado} />}
        {orden !== "recientes" && <input type="hidden" name="orden" value={orden} />}
      </form>

      <div className="mb-6">
        <Suspense fallback={<div className="skeleton h-10 w-full max-w-md rounded-xl" />}>
          <ExploreFilters facets={facets} basePath="/buscar" />
        </Suspense>
      </div>

      {catalog.items.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-[var(--surface)] py-20 text-center text-gray-400">
          {q ? t(lang, "searchNoResultsFor", { q }) : t(lang, "searchNoResults")}
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
        basePath="/buscar"
        lang={lang}
        params={{ q: q || undefined, genero, anio, estado, orden: orden !== "recientes" ? orden : undefined }}
      />
    </div>
  );
}