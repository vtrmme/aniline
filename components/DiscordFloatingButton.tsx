"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";

const DISCORD_URL = "https://discord.gg/3jYzeheaMb";

export function DiscordFloatingButton() {
  const pathname = usePathname();
  const esReproduccion = /^\/anime\/[^/]+\/[^/]+\/?$/.test(pathname);
  if (esReproduccion) return null;

  return (
    <a
      href={DISCORD_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Discord"
      className="fixed bottom-4 right-4 z-50 transition-transform hover:scale-105 sm:bottom-6 sm:right-6"
    >
      <Image src="/discord-logo.png" alt="Discord" width={56} height={56} className="h-12 w-12 rounded-full shadow-lg sm:h-14 sm:w-14" />
    </a>
  );
}