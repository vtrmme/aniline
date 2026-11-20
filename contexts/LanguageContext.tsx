"use client";

import { createContext, useContext, useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import type { Lang, TranslationKey } from "@/lib/i18n/translations";
import { t as translate } from "@/lib/i18n/translations";

interface LanguageContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

function readStoredLang(): Lang | null {
  try {
    const saved = localStorage.getItem("aniline-lang");
    return saved === "es" || saved === "en" ? saved : null;
  } catch {
    return null;
  }
}

function writeCookie(name: string, value: string) {
  try {
    document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=31536000; samesite=lax`;
  } catch {
    // ignore
  }
}

export function LanguageProvider({ initialLang, children }: { initialLang: Lang; children: React.ReactNode }) {
  const router = useRouter();
  const [lang, setLangState] = useState<Lang>(() => {
    if (typeof window === "undefined") return initialLang;
    return readStoredLang() ?? initialLang;
  });

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  useEffect(() => {
    const stored = readStoredLang();
    if (stored) writeCookie("aniline-lang", stored);
  }, []);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    try {
      localStorage.setItem("aniline-lang", next);
    } catch {
      // ignore
    }
    writeCookie("aniline-lang", next);
    router.refresh();
  }, [router]);

  const value = useMemo<LanguageContextValue>(() => ({
    lang,
    setLang,
    t: (key, vars) => translate(lang, key, vars),
  }), [lang, setLang]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
}