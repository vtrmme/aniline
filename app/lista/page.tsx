"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { ListVideo } from "lucide-react";
import { AnimeCard } from "@/components/AnimeCard";
import { useLanguage } from "@/contexts/LanguageContext";
import type { AnimeRow } from "@/types/db";

type Estado = "para_ver" | "viendo" | "visto";

interface Item {
  anime_id: string;
  estado: Estado;
  animes: AnimeRow | null;
}

export default function ListaPage() {
  const { status } = useSession();
  const router = useRouter();
  const { t, lang } = useLanguage();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/watchlist/mine", { cache: "no-store" });
      if (res.ok) {
        const j = await res.json();
        const arr = Array.isArray(j.items) ? j.items : [];
        setItems(arr.filter((x: Item) => x && x.animes));
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/auth/signin?callbackUrl=/lista");
      return;
    }
    if (status === "authenticated") load();
  }, [status, router, load]);

  const changeEstado = async (animeId: string, estado: Estado) => {
    setItems((prev) => prev.map((it) => it.anime_id === animeId ? { ...it, estado } : it));
    await fetch("/api/watchlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ anime_id: animeId, estado }),
    }).catch(() => {});
  };

  const remove = async (animeId: string) => {
    setItems((prev) => prev.filter((it) => it.anime_id !== animeId));
    await fetch(`/api/watchlist?anime_id=${encodeURIComponent(animeId)}`, { method: "DELETE" }).catch(() => {});
  };

  if (status === "loading" || (status === "authenticated" && loading)) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-white">{t("myListTitle")}</h1>
        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {Array.from({ length: 8 }).map((_, i) => <div key={i} className="skeleton aspect-[2/3] rounded-xl" />)}
        </div>
      </div>
    );
  }

  if (status !== "authenticated") return null;

  const labelFor = (e: Estado) => e === "para_ver" ? t("watchlistPlan") : e === "viendo" ? t("watchlistWatching") : t("watchlistCompleted");
  const estados: Estado[] = ["para_ver", "viendo", "visto"];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="mb-8 text-3xl font-bold text-white">{t("myListTitle")}</h1>
      {items.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-[var(--surface)] px-6 py-16 text-center">
          <ListVideo size={40} className="mx-auto mb-4 text-gray-500" aria-hidden="true" />
          <p className="text-lg font-semibold text-white">{t("myListEmpty")}</p>
          <p className="mt-2 text-sm text-gray-400">{t("myListEmptyDesc")}</p>
          <Link href="/" className="btn-brand mt-6 inline-flex rounded-full px-6 py-2.5 text-sm font-semibold">
            {t("navExplore")}
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {items.map(({ anime_id, estado, animes }) => {
            if (!animes) return null;
            return (
              <div key={anime_id} className="flex flex-col">
                <AnimeCard anime={animes} lang={lang} />
                <div className="mt-2 flex gap-1.5">
                  {estados.map((e) => (
                    <button
                      key={e}
                      type="button"
                      onClick={() => changeEstado(anime_id, e)}
                      className={`flex-1 rounded-md py-1 text-[10px] font-semibold uppercase tracking-wide transition ${estado === e ? "bg-[var(--brand)] text-white" : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white"}`}
                    >
                      {labelFor(e)}
                    </button>
                  ))}
                </div>
                <button type="button" onClick={() => remove(anime_id)} className="mt-1.5 text-center text-[11px] text-gray-500 transition hover:text-red-400">
                  {t("watchlistRemove")}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}