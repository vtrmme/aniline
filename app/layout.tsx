import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { Navbar } from "@/components/Navbar"
import { Providers } from "@/app/providers"
import { LanguageProvider } from "@/contexts/LanguageContext"

const inter = Inter({ subsets: ["latin"] })

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
      <body className={`${inter.className} bg-[#0f0f0f] text-white antialiased dark:bg-[#050505] dark:text-gray-100`}>
        <LanguageProvider>
          <Providers>
            <Navbar />
            <main className="pt-20 min-h-screen">{children}</main>
          </Providers>
        </LanguageProvider>
      </body>
    </html>
  )
}
