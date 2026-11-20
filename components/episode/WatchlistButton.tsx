"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Check, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";

type Estado = "para_ver" | "viendo" | "visto";

const estados: Estado[] = ["para_ver", "viendo", "visto"];

export function WatchlistButton({ animeId, className }: { animeId: string; className?: string }) {
  const { status } = useSession();
  const router = useRouter();
  const { t } = useLanguage();
  const [estado, setEstado] = useState<Estado | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (status !== "authenticated") return;
    let cancelled = false;
    fetch(`/api/watchlist?anime_id=${encodeURIComponent(animeId)}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => {
        if (cancelled) return;
        if (j?.ok && j.inList && estados.includes(j.estado)) setEstado(j.estado);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [animeId, status]);

  if (status === "loading") return null;

  const labelFor = (e: Estado | null) => {
    if (e === "para_ver") return t("watchlistPlan");
    if (e === "viendo") return t("watchlistWatching");
    if (e === "visto") return t("watchlistCompleted");
    return t("watchlistAdd");
  };

  const set = async (next: Estado | null) => {
    if (status !== "authenticated") {
      router.push(`/auth/signin?callbackUrl=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    setLoading(true);
    try {
      if (next === null) {
        const res = await fetch(`/api/watchlist?anime_id=${encodeURIComponent(animeId)}`, { method: "DELETE" });
        if (res.ok) setEstado(null);
      } else {
        const res = await fetch("/api/watchlist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ anime_id: animeId, estado: next }),
        });
        if (res.ok) setEstado(next);
      }
    } finally {
      setLoading(false);
    }
  };

  if (!estado) {
    return (
      <button
        type="button"
        disabled={loading}
        onClick={() => set("para_ver")}
        className={cn("btn-ghost inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold disabled:opacity-60", className)}
      >
        <Plus size={16} aria-hidden="true" /> {t("watchlistAdd")}
      </button>
    );
  }

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {estados.map((e) => (
        <button
          key={e}
          type="button"
          disabled={loading}
          onClick={() => set(e === estado ? null : e)}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-bold transition disabled:opacity-60",
            estado === e ? "bg-[var(--brand)] text-white" : "bg-white/10 text-gray-300 hover:bg-white/15 hover:text-white",
          )}
          title={e === estado ? t("watchlistRemove") : undefined}
        >
          {estado === e && <Check size={13} aria-hidden="true" />}
          {labelFor(e)}
        </button>
      ))}
    </div>
  );
}