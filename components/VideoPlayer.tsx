"use client"

import Plyr from "plyr"
import "plyr/dist/plyr.css"
import { useEffect, useRef } from "react"

interface VideoPlayerProps {
  videoUrl: string
}

export function VideoPlayer({ videoUrl }: VideoPlayerProps) {
  const ref = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    if (!ref.current) return
    const player = new Plyr(ref.current, {
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
    return () => player.destroy()
  }, [videoUrl])

  return (
    <div className="bg-gray-900 rounded-xl overflow-hidden shadow-2xl aspect-video w-full">
      <video ref={ref} src={videoUrl} />
    </div>
  )
}
