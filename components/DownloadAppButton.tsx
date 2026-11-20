"use client";

import { Download } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";

type Variant = "nav" | "menu" | "hero";

interface DownloadAppButtonProps {
  variant: Variant;
  onNavigate?: () => void;
}

export function DownloadAppButton({ variant, onNavigate }: DownloadAppButtonProps) {
  const { t } = useLanguage();
  const url = process.env.NEXT_PUBLIC_APK_DOWNLOAD_URL;

  if (!url) return null;

  const label = t("navDownloadApp");

  if (variant === "nav") {
    return (
      <a
        href={url}
        download
        className="hidden items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-gray-200 transition hover:bg-white/10 hover:text-white md:inline-flex"
      >
        <Download size={15} />
        {label}
      </a>
    );
  }

  if (variant === "menu") {
    return (
      <a
        href={url}
        download
        onClick={onNavigate}
        className="flex items-center justify-center gap-2 rounded-lg border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-semibold text-gray-200 transition hover:bg-white/10 hover:text-white"
      >
        <Download size={16} />
        {label}
      </a>
    );
  }

  return (
    <a
      href={url}
      download
      className={cn("btn-ghost inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-bold")}
    >
      <Download size={18} />
      {label}
    </a>
  );
}