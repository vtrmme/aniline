import type { Metadata } from "next"
import { Plus_Jakarta_Sans, Outfit } from "next/font/google"
import "./globals.css"
import { Navbar } from "@/components/Navbar"
import { Providers } from "@/app/providers"
import { LanguageProvider } from "@/contexts/LanguageContext"

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-plus-jakarta",
  display: "swap",
})

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
})

export const metadata: Metadata = {
  title: {
    template: "%s | AniLine",
    default: "AniLine - Anime Streaming Gratis",
  },
  description: "Ver anime online gratis en español e inglés",
  openGraph: {
    title: "AniLine - Anime Streaming Gratis",
    description: "Ver anime online gratis en español e inglés",
    type: "website",
    url: "https://aniline.vercel.app/",
    images: [{ url: "/og-image.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "AniLine - Anime Streaming Gratis",
    description: "Ver anime online gratis en español e inglés",
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es" className="scroll-smooth">
      <body
        className={`${plusJakarta.variable} ${outfit.variable} bg-[#0B0C0E] text-white antialiased`}
      >
        <LanguageProvider>
          <Providers>
            <Navbar />
            <main className="pt-16 min-h-screen">{children}</main>
          </Providers>
        </LanguageProvider>
      </body>
    </html>
  )
}
