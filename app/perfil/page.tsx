"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Play, Bookmark, Clock, Sparkles, LogOut, User } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";
import type { AnimeRow } from "@/types/db";

interface Stats {
  animes_vistos: number;
  animes_viendo: number;
  animes_para_ver: number;
  minutos_vistos: number;
  genero_favorito: string;
}

type Nivel = "profileNovato" | "profileOtaku" | "profileVeterano" | "profileLeyenda";

function calcNivel(total: number): Nivel {
  if (total >= 50) return "profileLeyenda";
  if (total >= 20) return "profileVeterano";
  if (total >= 5) return "profileOtaku";
  return "profileNovato";
}

const nivelClass: Record<Nivel, string> = {
  profileNovato: "bg-white/10 text-gray-300 border-white/15",
  profileOtaku: "bg-blue-500/15 text-blue-300 border-blue-400/30",
  profileVeterano: "bg-[var(--gold)]/15 text-[var(--gold)] border-[var(--gold)]/40",
  profileLeyenda: "bg-[var(--brand-soft)] text-[var(--brand-bright)] border-[var(--brand)]/40",
};

export default function PerfilPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { t, lang } = useLanguage();
  const [stats, setStats] = useState<Stats | null>(null);
  const [recent, setRecent] = useState<Array<{ anime: AnimeRow; episodio_numero: number }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/auth/signin?callbackUrl=/perfil");
      return;
    }
    if (status !== "authenticated") return;
    let cancelled = false;

    const run = async () => {
      try {
        const [sRes, rRes] = await Promise.all([
          fetch("/api/perfil/stats", { cache: "no-store" }),
          fetch("/api/perfil/activity", { cache: "no-store" }),
        ]);
        if (sRes.ok) {
          const j = await sRes.json();
          if (!cancelled) setStats(j?.stats || null);
        }
        if (rRes.ok) {
          const j = await rRes.json();
          if (!cancelled) setRecent(Array.isArray(j?.items) ? j.items : []);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    run();
    return () => { cancelled = true; };
  }, [status, router]);

  const user = session?.user;
  const totals = stats ? stats.animes_vistos + stats.animes_viendo + stats.animes_para_ver : 0;
  const nivel = calcNivel(totals);
  const pct = totals > 0 && stats ? Math.round((stats.animes_vistos / totals) * 100) : 0;

  const cards = useMemo(() => ([
    { label: t("profileAnimesWatched"), value: stats?.animes_vistos ?? 0, icon: CheckCircle2, color: "text-emerald-400", bg: "bg-emerald-400/10" },
    { label: t("profileAnimesWatching"), value: stats?.animes_viendo ?? 0, icon: Play, color: "text-blue-400", bg: "bg-blue-400/10" },
    { label: t("profileAnimesPlan"), value: stats?.animes_para_ver ?? 0, icon: Bookmark, color: "text-[var(--gold)]", bg: "bg-[var(--gold)]/10" },
    { label: t("profileMinutes"), value: stats?.minutos_vistos ?? 0, icon: Clock, color: "text-purple-400", bg: "bg-purple-400/10" },
    { label: t("profileFavoriteGenre"), value: stats?.genero_favorito || "-", icon: Sparkles, color: "text-[var(--brand-bright)]", bg: "bg-[var(--brand-soft)]", text: true },
  ]), [stats, t]);

  if (status === "loading" || (status === "authenticated" && loading)) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="skeleton mb-6 h-40 rounded-3xl" />
        <div className="grid grid-cols-2 gap-4 md:grid-cols-5">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="skeleton h-24 rounded-xl" />)}</div>
      </div>
    );
  }
  if (status !== "authenticated" || !user) return null;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <section className="glass-panel relative mb-8 overflow-hidden rounded-3xl">
        <div className="absolute inset-0 bg-gradient-to-r from-[var(--brand)]/20 via-transparent to-[var(--gold)]/10" />
        <div className="relative flex flex-col gap-6 p-6 sm:p-8 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col items-center gap-5 sm:flex-row">
            <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-full border-2 border-[var(--brand)] bg-[var(--surface)]">
              {user.image ? <Image src={user.image} alt={user.name || "User"} fill sizes="96px" className="object-cover" /> : <div className="flex h-full w-full items-center justify-center text-gray-400"><User size={36} /></div>}
            </div>
            <div className="text-center sm:text-left">
              <span className={cn("mb-2 inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold", nivelClass[nivel])}>
                <Sparkles size={12} aria-hidden="true" /> {t("profileLevel")}: {t(nivel)}
              </span>
              <h1 className="text-2xl font-bold text-white">{user.name || "Usuario"}</h1>
              {user.email && <p className="text-sm text-gray-400">{user.email}</p>}
              {user.isAdmin && <span className="badge-brand mt-2 inline-flex rounded-full px-3 py-1 text-xs font-bold">{t("profileAdminBadge")}</span>}
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link href="/lista" className="btn-ghost inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold">{t("navMyList")}</Link>
            <button type="button" onClick={() => signOut({ callbackUrl: "/" })} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-gray-300 transition hover:border-red-400/40 hover:text-red-400">
              <LogOut size={16} aria-hidden="true" /> {t("navLogout")}
            </button>
          </div>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="mb-4 text-xl font-bold text-white">{t("profileStats")}</h2>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
          {cards.map((c) => (
            <div key={c.label} className="rounded-xl border border-white/8 bg-black/25 p-4">
              <div className={cn("mb-3 flex h-9 w-9 items-center justify-center rounded-lg", c.bg, c.color)}><c.icon size={18} aria-hidden="true" /></div>
              <div className="text-xs font-medium uppercase tracking-wider text-gray-500">{c.label}</div>
              <div className={cn("mt-1 truncate font-bold text-white", c.text ? "text-base" : "text-2xl")} title={typeof c.value === "string" ? c.value : undefined}>{c.value}</div>
            </div>
          ))}
        </div>
        {totals > 0 && (
          <div className="mt-4 rounded-xl border border-white/8 bg-black/25 p-4">
            <div className="mb-2 flex items-baseline justify-between"><span className="text-xs font-medium uppercase tracking-wider text-gray-500">{t("profileProgress")}</span><span className="text-sm font-bold text-white">{pct}%</span></div>
            <div className="h-2.5 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-gradient-to-r from-[var(--brand)] to-[var(--brand-bright)]" style={{ width: `${pct}%` }} /></div>
          </div>
        )}
      </section>

      <section>
        <div className="mb-4">
          <h2 className="text-xl font-bold text-white">{t("profileRecent")}</h2>
          <p className="mt-0.5 text-sm text-[var(--muted)]">{t("profileRecentSub")}</p>
        </div>
        {recent.length === 0 ? (
          <div className="rounded-xl border border-white/10 bg-[var(--surface)] p-8 text-center text-gray-400">{t("profileNoData")}</div>
        ) : (
          <div className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 sm:-mx-6 sm:px-6 lg:mx-0 lg:px-0">
            {recent.map(({ anime, episodio_numero }) => {
              const title = lang === "es" ? anime.title_es || anime.title_en : anime.title_en || anime.title_es;
              const poster = anime.poster_url && anime.poster_url.startsWith("http") ? anime.poster_url : "/placeholder-anime.svg";
              return (
                <Link key={anime.id} href={`/anime/${anime.slug}/${episodio_numero}`} className="group block w-[150px] shrink-0 snap-start sm:w-[170px]">
                  <div className="relative aspect-[2/3] overflow-hidden rounded-xl bg-[var(--surface)] ring-1 ring-white/5 transition group-hover:-translate-y-1 group-hover:ring-[var(--brand)]/60">
                    <Image src={poster} alt={title || "Anime"} fill sizes="170px" className="object-cover" />
                    <div className="gradient-card absolute inset-0" />
                    <div className="absolute inset-x-0 bottom-0 p-3">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--brand-bright)]">{t("continueEpisode")} {episodio_numero}</span>
                      <p className="mt-0.5 line-clamp-2 text-xs font-semibold text-white">{title}</p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}