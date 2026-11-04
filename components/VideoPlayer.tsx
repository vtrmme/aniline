"use client"

import { Plyr } from "react-plyr"
import "plyr/dist/plyr.css"

interface VideoPlayerProps {
  videoUrl: string
}

export function VideoPlayer({ videoUrl }: VideoPlayerProps) {
  const player = {
    controls: [
      "play-large",
      "play",
      "progress",
      "current-time",
      "mute",
      "volume",
      "fullscreen",
    ],
  } as const

  return (
    <div className="bg-gray-900 rounded-xl overflow-hidden shadow-2xl aspect-video w-full">
      <Plyr
        video={{
          sources: [{ src: videoUrl, type: "video/mp4", provider: "html5" }],
        }}
        options={player}
      />
    </div>
  )
}
