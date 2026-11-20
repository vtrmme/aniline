"use client";

import "plyr/dist/plyr.css";
import { useEffect, useRef } from "react";
import Hls from "hls.js";

interface VideoPlayerProps {
  videoUrl?: string | null;
  youtubeUrl?: string | null;
  initialSeconds?: number;
  onProgress?: (seconds: number) => void;
  onEnded?: () => void;
}

export function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /youtube\.com\/watch\?.*v=([^&\n?#]+)/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

export function VideoPlayer({ videoUrl, youtubeUrl, initialSeconds = 0, onProgress, onEnded }: VideoPlayerProps) {
  const ref = useRef<HTMLVideoElement>(null);
  const playerRef = useRef<{ destroy(): void } | null>(null);
  const lastReportRef = useRef(0);
  const onProgressRef = useRef(onProgress);
  const onEndedRef = useRef(onEnded);
  const initialRef = useRef(initialSeconds);

  useEffect(() => {
    onProgressRef.current = onProgress;
    onEndedRef.current = onEnded;
    initialRef.current = initialSeconds;
  });

  useEffect(() => {
    if (youtubeUrl) {
      if (playerRef.current) {
        playerRef.current.destroy();
        playerRef.current = null;
      }
      return;
    }
    const video = ref.current;
    if (!video || !videoUrl) return;

    let hls: Hls | null = null;
    let destroyed = false;

    const startPlyr = () => {
      if (destroyed || !ref.current) return;
      import("plyr").then((m) => {
        if (destroyed || !ref.current) return;
        const Plyr = m.default;
        playerRef.current = new Plyr(ref.current, {
          controls: ["play-large", "play", "progress", "current-time", "mute", "volume", "captions", "settings", "fullscreen"],
          hideControls: false,
          clickToPlay: true,
        });
      });
    };

    const isHls = /\.m3u8(\?|$)/.test(videoUrl);
    if (isHls) {
      if (video.canPlayType("application/vnd.apple.mpegurl")) {
        video.src = videoUrl;
        startPlyr();
      } else if (Hls.isSupported()) {
        hls = new Hls({ enableWorker: true, backBufferLength: 90 });
        hls.loadSource(videoUrl);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, startPlyr);
      } else {
        video.src = videoUrl;
        startPlyr();
      }
    } else {
      video.src = videoUrl;
      startPlyr();
    }

    const report = () => {
      const now = Date.now();
      if (now - lastReportRef.current < 5000) return;
      lastReportRef.current = now;
      onProgressRef.current?.(Math.floor(video.currentTime));
    };
    const onLoaded = () => {
      const s = initialRef.current;
      if (s > 10 && Number.isFinite(video.duration) && video.duration > s + 30) {
        video.currentTime = s;
      }
    };
    const onEnd = () => onEndedRef.current?.();

    video.addEventListener("timeupdate", report);
    video.addEventListener("loadedmetadata", onLoaded);
    video.addEventListener("ended", onEnd);

    return () => {
      destroyed = true;
      video.removeEventListener("timeupdate", report);
      video.removeEventListener("loadedmetadata", onLoaded);
      video.removeEventListener("ended", onEnd);
      if (playerRef.current) {
        playerRef.current.destroy();
        playerRef.current = null;
      }
      if (hls) hls.destroy();
      video.removeAttribute("src");
      video.load();
    };
  }, [videoUrl, youtubeUrl]);

  if (youtubeUrl) {
    const videoId = extractYouTubeId(youtubeUrl);
    if (!videoId) {
      return (
        <div className="flex aspect-video w-full items-center justify-center bg-[var(--surface)] text-gray-400">
          URL de YouTube inválida
        </div>
      );
    }
    return (
      <div className="aspect-video w-full bg-black">
        <iframe
          src={`https://www.youtube.com/embed/${videoId}?rel=0`}
          title="YouTube video player"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          className="h-full w-full"
        />
      </div>
    );
  }

  if (!videoUrl) {
    return (
      <div className="flex aspect-video w-full items-center justify-center bg-[var(--surface)] text-gray-400">
        Video no disponible
      </div>
    );
  }

  return (
    <div className="aspect-video w-full bg-black">
      <video ref={ref} className="h-full w-full" playsInline />
    </div>
  );
}