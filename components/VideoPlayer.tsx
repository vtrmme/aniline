"use client"

import "plyr/dist/plyr.css"
import { useEffect, useRef } from "react"

interface VideoPlayerProps {
  videoUrl?: string | null
  youtubeUrl?: string | null
}

export function VideoPlayer({ videoUrl, youtubeUrl }: VideoPlayerProps) {
  const ref = useRef<HTMLVideoElement>(null)
  const playerRef = useRef<{ destroy(): void } | null>(null)

  useEffect(() => {
    if (youtubeUrl) {
      if (playerRef.current) {
        playerRef.current.destroy()
        playerRef.current = null
      }
      return
    }
    if (!ref.current) return
    import("plyr").then((plyrModule) => {
      const Plyr = plyrModule.default
      if (!ref.current) return
      playerRef.current = new Plyr(ref.current, {
        controls: [
          "play-large",
          "play",
          "progress",
          "current-time",
          "mute",
          "volume",
          "fullscreen",
        ],
      })
    })
    return () => {
      if (playerRef.current) {
        playerRef.current.destroy()
        playerRef.current = null
      }
    }
  }, [videoUrl, youtubeUrl])

  if (youtubeUrl) {
    const videoId = extractYouTubeId(youtubeUrl)
    if (!videoId) {
      return (
        <div className="bg-gray-800 rounded-xl overflow-hidden shadow-2xl aspect-video w-full flex items-center justify-center">
          <p className="text-gray-400 text-center p-8">URL de YouTube inválida</p>
        </div>
      )
    }
    return (
      <div className="bg-gray-900 rounded-xl overflow-hidden shadow-2xl aspect-video w-full">
        <iframe
          src={`https://www.youtube.com/embed/${videoId}?rel=0`}
          title="YouTube video player"
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          className="w-full h-full"
        />
      </div>
    )
  }

  if (!videoUrl) {
    return (
      <div className="bg-gray-800 rounded-xl overflow-hidden shadow-2xl aspect-video w-full flex items-center justify-center">
        <p className="text-gray-400 text-center p-8">Video no disponible aún</p>
      </div>
    )
  }

  return (
    <div className="bg-gray-900 rounded-xl overflow-hidden shadow-2xl aspect-video w-full">
      <video ref={ref} src={videoUrl} />
    </div>
  )
}

export function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /youtube\.com\/watch\?.*v=([^&\n?#]+)/,
  ]
  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match) {
      return match[1]
    }
  }
  return null
}
