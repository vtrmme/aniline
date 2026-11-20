"use client";

import { useRouter, useSearchParams } from "next/navigation";
import type { CatalogFacets } from "@/lib/server/catalog";
import { useLanguage } from "@/contexts/LanguageContext";

interface ExploreFiltersProps {
  facets: CatalogFacets;
  basePath?: string;
}

export function ExploreFilters({ facets, basePath = "/" }: ExploreFiltersProps) {
  const router = useRouter();
  const sp = useSearchParams();
  const { t } = useLanguage();

  const genero = sp.get("genero") || "todos";
  const anio = sp.get("anio") || "todos";
  const estado = sp.get("estado") || "todos";
  const orden = sp.get("orden") || "recientes";

  function update(key: string, value: string) {
    const params = new URLSearchParams(sp.toString());
    if (value === "todos" || (key === "orden" && value === "recientes")) params.delete(key);
    else params.set(key, value);
    params.delete("page");
    const qs = params.toString();
    router.push(qs ? `${basePath}?${qs}` : basePath, { scroll: false });
  }

  const select =
    "rounded-xl border border-white/10 bg-[var(--surface)] px-3 py-2.5 text-sm text-white transition focus:border-[var(--brand)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/25";

  return (
    <div className="flex flex-wrap gap-3">
      <select value={genero} onChange={(e) => update("genero", e.target.value)} className={select} aria-label={t("filterAllGenres")}>
        <option value="todos">{t("filterAllGenres")}</option>
        {facets.generos.map((g) => <option key={g} value={g}>{g}</option>)}
      </select>
      <select value={anio} onChange={(e) => update("anio", e.target.value)} className={select} aria-label={t("filterAllYears")}>
        <option value="todos">{t("filterAllYears")}</option>
        {facets.anios.map((a) => <option key={a} value={String(a)}>{a}</option>)}
      </select>
      <select value={estado} onChange={(e) => update("estado", e.target.value)} className={select} aria-label={t("filterAllStatus")}>
        <option value="todos">{t("filterAllStatus")}</option>
        {facets.estados.map((e) => <option key={e} value={e}>{e}</option>)}
      </select>
      <select value={orden} onChange={(e) => update("orden", e.target.value)} className={select} aria-label={t("sortRecent")}>
        <option value="recientes">{t("sortRecent")}</option>
        <option value="puntuacion">{t("sortRating")}</option>
      </select>
    </div>
  );
}