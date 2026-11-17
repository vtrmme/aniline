import type { Metadata } from "next"
import { Plus_Jakarta_Sans, Outfit } from "next/font/google"
import "./globals.css"
import { Navbar } from "@/components/Navbar"
import { DiscordFloatingButton } from "@/components/DiscordFloatingButton"
import { Providers } from "@/app/providers"
import { LanguageProvider } from "@/contexts/LanguageContext"
import { getSiteUrl, siteConfig } from "@/lib/site"

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

const siteUrl: string = getSiteUrl()

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    template: `%s | ${siteConfig.name}`,
    default: `${siteConfig.name} - Anime Streaming Gratis`,
  },
  description: siteConfig.description,
  applicationName: siteConfig.name,
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    shortcut: ["/icon.svg"],
    apple: [{ url: "/aniline-logo.png" }],
  },
  openGraph: {
    title: `${siteConfig.name} - Anime Streaming Gratis`,
    description: siteConfig.description,
    type: "website",
    url: siteUrl,
    siteName: siteConfig.name,
    locale: "es_ES",
    images: [{ url: "/og-image.svg", width: 1200, height: 630, alt: siteConfig.name }],
  },
  twitter: {
    card: "summary_large_image",
    title: `${siteConfig.name} - Anime Streaming Gratis`,
    description: siteConfig.description,
    images: ["/og-image.svg"],
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
            <DiscordFloatingButton />
          </Providers>
        </LanguageProvider>
      </body>
    </html>
  )
}
