"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { ChevronLeft, ChevronRight, LayoutGrid, PlayCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";
import type { Lang } from "@/lib/i18n/translations";
import { EpisodePlayer, type StreamServerInfo, type SubtitleTrackInfo } from "@/components/episode/EpisodePlayer";
import { VideoPlayer } from "@/components/episode/VideoPlayer";
import type { StreamLang } from "@/lib/streaming";

interface EpisodeItem {
  id: string;
  numero: number;
  title_es: string | null;
  title_en: string | null;
  video_url: string | null;
  youtube_url: string | null;
}

interface AnimeInfo {
  id: string;
  slug: string;
  title_es: string | null;
  title_en: string | null;
  sinopsis_es: string | null;
  sinopsis_en: string | null;
  genero: string[] | null;
}

interface StreamData {
  servers: StreamServerInfo[];
  anilistId: number | null;
  nativeUrl: string | null;
  youtubeUrl: string | null;
  hlsUrl: string | null;
  hlsUrls: Record<string, string>;
  subtitles: SubtitleTrackInfo[];
}

interface Props {
  anime: AnimeInfo;
  episode: EpisodeItem;
  episodes: EpisodeItem[];
  lang: Lang;
}

export function EpisodeClient({ anime, episode, episodes, lang }: Props) {
  const { t } = useLanguage();
  const { status } = useSession();
  const [nativeFallback, setNativeFallback] = useState<string | null>(null);
  const [youtubeFallback, setYoutubeFallback] = useState<string | null>(episode.youtube_url || null);
  const [fallbackReady, setFallbackReady] = useState(false);
  const [fallbackUnavailable, setFallbackUnavailable] = useState(false);

  const [streamResult, setStreamResult] = useState<{ key: string; data: StreamData | null } | null>(null);
  const [streamLang, setStreamLang] = useState<StreamLang>("sub");
  const [savedSeconds, setSavedSeconds] = useState(0);

  const lastSentRef = useRef(0);
  const lastValueRef = useRef(0);
  const endedRef = useRef(false);

  const title = lang === "es" ? anime.title_es || anime.title_en : anime.title_en || anime.title_es;
  const epTitle = (lang === "es" ? episode.title_es : episode.title_en) || episode.title_es || episode.title_en || `${t("episode")} ${episode.numero}`;
  const sinopsis = (lang === "es" ? anime.sinopsis_es : anime.sinopsis_en) || anime.sinopsis_es || anime.sinopsis_en;

  const currentIndex = useMemo(() => episodes.findIndex((e) => e.numero === episode.numero), [episodes, episode.numero]);
  const prevEp = currentIndex > 0 ? episodes[currentIndex - 1] : null;
  const nextEp = currentIndex >= 0 && currentIndex < episodes.length - 1 ? episodes[currentIndex + 1] : null;

  useEffect(() => {
    let cancelled = false;
    endedRef.current = false;
    lastSentRef.current = 0;
    lastValueRef.current = 0;

    const resolveFallback = async () => {
      try {
        if (episode.youtube_url) {
          if (!cancelled) { setYoutubeFallback(episode.youtube_url); setFallbackReady(true); }
          return;
        }
        if (episode.video_url) {
          const res = await fetch(`/api/videos/play?path=${encodeURIComponent(episode.video_url)}`, { cache: "no-store" });
          if (res.ok) {
            const j = await res.json();
            if (!cancelled) {
              if (j?.videoUrl) setNativeFallback(j.videoUrl);
              else setFallbackUnavailable(true);
            }
          } else if (!cancelled) {
            setFallbackUnavailable(true);
          }
        } else if (!cancelled) {
          setFallbackUnavailable(true);
        }
      } catch {
        if (!cancelled) setFallbackUnavailable(true);
      } finally {
        if (!cancelled) setFallbackReady(true);
      }
    };

    const loadHistory = async () => {
      if (status !== "authenticated") return;
      try {
        const res = await fetch(`/api/historial?anime_id=${encodeURIComponent(anime.id)}&episodio_numero=${episode.numero}`, { cache: "no-store" });
        if (!res.ok) return;
        const j = await res.json();
        if (!cancelled && j?.ok && typeof j.segundos === "number") setSavedSeconds(j.segundos);
      } catch {}
    };

    resolveFallback();
    loadHistory();

    if (status === "authenticated") {
      fetch("/api/historial", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ anime_id: anime.id, episodio_numero: episode.numero, segundos: 0 }),
        keepalive: true,
      }).catch(() => {});
      fetch("/api/sesiones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ anime_id: anime.id, episodio_numero: episode.numero, segundos: 0, finalizar: false }),
        keepalive: true,
      }).catch(() => {});
    }

    return () => { cancelled = true; };
  }, [anime.id, episode.numero, episode.video_url, episode.youtube_url, status]);

  const requestKey = `${anime.slug}:${episode.numero}:${streamLang}`;
  const streamData = status === "authenticated" && streamResult?.key === requestKey ? streamResult.data : null;
  const serversLoading = status === "loading" || (status === "authenticated" && streamResult?.key !== requestKey);

  useEffect(() => {
    if (status !== "authenticated") return;
    let cancelled = false;

    const fetchServers = async () => {
      let data: StreamData | null = null;
      try {
        const res = await fetch(
          `/api/stream/servers?slug=${encodeURIComponent(anime.slug)}&episode=${episode.numero}&lang=${streamLang}`,
          { cache: "no-store" }
        );
        if (res.ok) {
          const json = await res.json() as {
            ok: boolean;
            servers?: StreamServerInfo[];
            anilistId?: number | null;
            nativeUrl?: string | null;
            youtubeUrl?: string | null;
            hlsUrl?: string | null;
            hlsUrls?: Record<string, string>;
            subtitles?: SubtitleTrackInfo[];
          };
          if (!cancelled && json.ok && Array.isArray(json.servers)) {
            data = {
              servers: json.servers,
              anilistId: typeof json.anilistId === "number" ? json.anilistId : null,
              nativeUrl: json.nativeUrl || null,
              youtubeUrl: json.youtubeUrl || null,
              hlsUrl: json.hlsUrl || null,
              hlsUrls: json.hlsUrls || {},
              subtitles: Array.isArray(json.subtitles) ? json.subtitles : [],
            };
          }
        }
      } catch {
        data = null;
      } finally {
        if (!cancelled) setStreamResult({ key: requestKey, data });
      }
    };

    fetchServers();
    return () => { cancelled = true; };
  }, [anime.slug, episode.numero, streamLang, status, requestKey]);

  const postProgress = useCallback((segundos: number, finalizar = false) => {
    if (status !== "authenticated") return;
    const s = Math.max(0, Math.floor(segundos));
    fetch("/api/historial", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ anime_id: anime.id, episodio_numero: episode.numero, segundos: s }),
      keepalive: true,
    }).catch(() => {});
    fetch("/api/sesiones", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ anime_id: anime.id, episodio_numero: episode.numero, segundos: s, finalizar }),
      keepalive: true,
    }).catch(() => {});
  }, [anime.id, episode.numero, status]);

  const handleProgress = useCallback((segundos: number) => {
    lastValueRef.current = segundos;
    postProgress(segundos, false);
  }, [postProgress]);

  const handleMarkWatched = useCallback(() => {
    if (endedRef.current) return;
    endedRef.current = true;
    postProgress(lastValueRef.current, true);
  }, [postProgress]);

  useEffect(() => {
    const flush = () => {
      if (status !== "authenticated") return;
      if (lastValueRef.current > 0 || endedRef.current) postProgress(lastValueRef.current, endedRef.current);
    };
    const onVis = () => { if (document.visibilityState === "hidden") flush(); };
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", onVis);
      flush();
    };
  }, [postProgress, status]);

  const hasPlayableStream = !!(streamData && streamData.servers.length > 0);
  const hasFallback = !!(nativeFallback || youtubeFallback);
  const hasSource = hasPlayableStream || hasFallback;
  const showPlayerLoading = !hasSource && (!fallbackReady || serversLoading);
  const showUnavailable = !hasSource && fallbackReady && !serversLoading;

  return (
    <div className="cinema-bg min-h-[calc(100vh-4rem)] pb-16">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        <nav className="mb-4 flex items-center gap-2 text-sm" aria-label="Breadcrumb">
          <Link href={`/anime/${anime.slug}`} className="truncate text-gray-400 transition hover:text-white">{title}</Link>
          <span className="text-gray-600" aria-hidden="true">/</span>
          <span className="text-white">{t("episodeWatch")} {episode.numero}</span>
        </nav>

        <div className="overflow-hidden rounded-xl bg-black shadow-[var(--shadow-elevated)] ring-1 ring-white/10">
          {showPlayerLoading ? (
            <div className="flex aspect-video w-full items-center justify-center bg-black/60">
              <div className="flex flex-col items-center gap-3 text-gray-400">
                <div className="h-10 w-10 animate-pulse rounded-full bg-[var(--surface)]" />
                <p className="text-sm">{t("playerLoading")}</p>
              </div>
            </div>
          ) : showUnavailable ? (
            <div className="flex aspect-video w-full items-center justify-center bg-black/60">
              <div className="max-w-md p-8 text-center">
                <PlayCircle size={48} className="mx-auto mb-4 text-gray-500" aria-hidden="true" />
                <p className="text-lg font-semibold text-white">{epTitle}</p>
                <p className="mt-2 text-sm text-gray-400">{t("episodeNotAvailable")}</p>
              </div>
            </div>
          ) : hasPlayableStream && streamData ? (
            <EpisodePlayer
              key={`${anime.slug}:${episode.numero}`}
              servers={streamData.servers}
              anilistId={streamData.anilistId}
              episode={episode.numero}
              lang={streamLang}
              onLangChange={setStreamLang}
              nativeUrl={streamData.nativeUrl || nativeFallback}
              youtubeUrl={streamData.youtubeUrl || youtubeFallback}
              hlsUrl={streamData.hlsUrl}
              hlsUrls={streamData.hlsUrls}
              subtitles={streamData.subtitles}
              storageKey={`${anime.slug}:${episode.numero}`}
              initialSeconds={savedSeconds}
              onProgress={handleProgress}
              onMarkWatched={handleMarkWatched}
              labels={{
                markWatched: t("markWatched"),
                sub: t("serverSub"),
                dub: t("serverDub"),
                notAvailable: t("episodeNotAvailable"),
                invalidYoutube: t("invalidYoutube"),
                noServers: t("serverNoServers"),
                loading: t("playerLoading"),
              }}
            />
          ) : (
            <VideoPlayer
              videoUrl={nativeFallback}
              youtubeUrl={youtubeFallback}
              initialSeconds={savedSeconds}
              onProgress={handleProgress}
              onEnded={handleMarkWatched}
            />
          )}
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          {prevEp ? (
            <Link href={`/anime/${anime.slug}/${prevEp.numero}`} className="btn-ghost inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold">
              <ChevronLeft size={16} aria-hidden="true" /> {t("episodePrev")} #{prevEp.numero}
            </Link>
          ) : <span />}
          <div className="flex items-center gap-2">
            {nextEp && (
              <Link href={`/anime/${anime.slug}/${nextEp.numero}`} className="btn-brand inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold">
                {t("episodeNext")} #{nextEp.numero} <ChevronRight size={16} aria-hidden="true" />
              </Link>
            )}
          </div>
        </div>

        {fallbackUnavailable && !hasSource && (
          <p className="mt-3 text-center text-sm text-gray-500">{t("episodeNotAvailable")}</p>
        )}

        {episodes.length > 0 && (
          <div className="glass-panel mt-8 rounded-2xl p-5">
            <div className="mb-4 flex items-center gap-2">
              <LayoutGrid size={16} className="text-[var(--brand-bright)]" aria-hidden="true" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-gray-300">{t("episodeSelect")}</h3>
            </div>
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10">
              {episodes.map((ep) => (
                <Link
                  key={ep.id}
                  href={`/anime/${anime.slug}/${ep.numero}`}
                  className={cn(
                    "flex h-9 items-center justify-center rounded-lg text-xs font-bold transition",
                    ep.numero === episode.numero
                      ? "bg-[var(--brand)] text-white shadow-[0_4px_16px_rgba(229,9,20,0.35)]"
                      : "bg-white/5 text-gray-300 hover:bg-white/12 hover:text-white",
                  )}
                >
                  {ep.numero}
                </Link>
              ))}
            </div>
          </div>
        )}

        <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-12">
          <div className="lg:col-span-8">
            <h1 className="mb-2 text-2xl font-bold text-white">{epTitle}</h1>
            {sinopsis && <p className="whitespace-pre-line leading-relaxed text-gray-400">{sinopsis}</p>}
          </div>
          <div className="lg:col-span-4">
            <div className="glass-panel rounded-2xl p-6">
              <h3 className="mb-4 font-bold text-white">{t("episodeInfo")}</h3>
              <p className="mb-2 text-sm text-gray-400"><span className="font-semibold text-white">Anime:</span> {title}</p>
              <p className="mb-2 text-sm text-gray-400"><span className="font-semibold text-white">{t("episode")}:</span> {episode.numero}</p>
              {anime.genero && anime.genero.length > 0 && (
                <p className="text-sm text-gray-400"><span className="font-semibold text-white">{t("genres")}:</span> {anime.genero.join(", ")}</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}