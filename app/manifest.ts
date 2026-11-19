import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "AniLine",
    short_name: "AniLine",
    description: "Ver anime online gratis en español e inglés",
    start_url: "/",
    display: "standalone",
    background_color: "#0B0C0E",
    theme_color: "#0B0C0E",
    lang: "es",
    icons: [
      {
        src: "/aniline-logo.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
  }
}
