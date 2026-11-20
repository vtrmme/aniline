import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, Outfit } from "next/font/google";
import "./globals.css";
import { getSiteUrl, siteConfig } from "@/lib/site";
import { getLang } from "@/lib/i18n/get-lang";
import { t } from "@/lib/i18n/translations";
import { Providers } from "./providers";
import { Navbar } from "@/components/Navbar";
import { DiscordFloatingButton } from "@/components/DiscordFloatingButton";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-plus-jakarta",
  display: "swap",
});

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
});

const siteUrl = getSiteUrl();

export const viewport: Viewport = {
  themeColor: "#0B0C0E",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLang();
  const description = t(lang, "tagline");
  return {
    metadataBase: new URL(siteUrl),
    title: {
      template: `%s | ${siteConfig.name}`,
      default: `${siteConfig.name} - Anime Streaming`,
    },
    description,
    applicationName: siteConfig.name,
    manifest: "/manifest.webmanifest",
    icons: {
      icon: [
        { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
        { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
      ],
      apple: [{ url: "/icon-192.png", sizes: "192x192", type: "image/png" }],
    },
    openGraph: {
      title: `${siteConfig.name} - Anime Streaming`,
      description,
      type: "website",
      url: siteUrl,
      siteName: siteConfig.name,
      locale: lang === "es" ? "es_ES" : "en_US",
    },
  };
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const lang = await getLang();
  return (
    <html lang={lang} className="scroll-smooth">
      <body className={`${plusJakarta.variable} ${outfit.variable} bg-[#0B0C0E] text-white antialiased`}>
        <Providers initialLang={lang}>
          <a
            href="#content"
            className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-[var(--brand)] focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
          >
            {t(lang, "skipToContent")}
          </a>
          <Navbar />
          <main id="content" className="min-h-screen pt-16">
            {children}
          </main>
          <DiscordFloatingButton />
          <ServiceWorkerRegister />
        </Providers>
      </body>
    </html>
  );
}