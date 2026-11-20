"use client";

import { useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorPage({ error, reset }: ErrorProps) {
  const { t } = useLanguage();
  useEffect(() => {
    console.error("Error de aplicación:", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[var(--surface)] p-8 text-center">
        <h2 className="text-xl font-bold text-white">{t("errorTitle")}</h2>
        <p className="mt-2 text-sm text-gray-400">{t("errorDesc")}</p>
        <button type="button" onClick={() => reset()} className="btn-brand mt-6 rounded-full px-6 py-2.5 font-semibold">
          {t("retry")}
        </button>
      </div>
    </div>
  );
}