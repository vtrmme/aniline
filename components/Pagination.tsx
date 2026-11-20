import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Lang } from "@/lib/i18n/translations";
import { t } from "@/lib/i18n/translations";

interface PaginationProps {
  page: number;
  totalPages: number;
  basePath: string;
  params: Record<string, string | undefined>;
  lang?: Lang;
}

export function Pagination({ page, totalPages, basePath, params, lang = "es" }: PaginationProps) {
  if (totalPages <= 1) return null;

  function href(p: number) {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v) sp.set(k, v);
    }
    if (p > 1) sp.set("page", String(p));
    else sp.delete("page");
    const qs = sp.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  }

  const baseBtn = "inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition";

  return (
    <nav className="mt-10 flex items-center justify-between" aria-label="Pagination">
      {page > 1 ? (
        <Link href={href(page - 1)} className={`${baseBtn} bg-[var(--surface)] text-white hover:bg-[var(--surface-hover)]`}>
          <ChevronLeft size={16} aria-hidden="true" /> {t(lang, "prev")}
        </Link>
      ) : (
        <span className={`${baseBtn} bg-[var(--surface)] text-gray-500`}>
          <ChevronLeft size={16} aria-hidden="true" /> {t(lang, "prev")}
        </span>
      )}
      <span className="text-sm text-gray-400">{t(lang, "pageOf", { page, total: totalPages })}</span>
      {page < totalPages ? (
        <Link href={href(page + 1)} className={`${baseBtn} bg-[var(--surface)] text-white hover:bg-[var(--surface-hover)]`}>
          {t(lang, "next")} <ChevronRight size={16} aria-hidden="true" />
        </Link>
      ) : (
        <span className={`${baseBtn} bg-[var(--surface)] text-gray-500`}>
          {t(lang, "next")} <ChevronRight size={16} aria-hidden="true" />
        </span>
      )}
    </nav>
  );
}