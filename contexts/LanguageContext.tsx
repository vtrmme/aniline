"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from "react"
import type { Lang } from "@/lib/translations"

interface LanguageContextType {
  lang: Lang
  setLang: (lang: Lang) => void
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    try {
      const saved = localStorage.getItem("aniline-lang")
      if (saved === "es" || saved === "en") {
        return saved
      }
    } catch {
      // ignore
    }
    return "es"
  })

  useEffect(() => {
    document.documentElement.lang = lang
  }, [lang])

  const setLang = (newLang: Lang) => {
    setLangState(newLang)
    try {
      localStorage.setItem("aniline-lang", newLang)
    } catch {
      // ignore
    }
  }

  return (
    <LanguageContext.Provider value={{ lang, setLang }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const ctx = useContext(LanguageContext)
  if (!ctx) {
    throw new Error("useLanguage must be used within a LanguageProvider")
  }
  return ctx
}
