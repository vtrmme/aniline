"use client"

import { signIn } from "next-auth/react"
import { useEffect, useState } from "react"
import Image from "next/image"
import { LogIn } from "lucide-react"
import { cn } from "@/lib/utils"
import { useLanguage } from "@/contexts/LanguageContext"
import { t } from "@/lib/translations"

export default function SignInPage() {
  const { lang } = useLanguage()
  const [error, setError] = useState<string | null>(null)

  const handleSignIn = async () => {
    setError(null)
    try {
      await signIn("google", { callbackUrl: "/" })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al iniciar sesión")
    }
  }

  useEffect(() => {
    if (error) {
      setTimeout(() => setError(null), 5000)
    }
  }, [error])

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-[var(--bg)] px-4 text-white">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mb-4 flex justify-center">
            <Image
              src="/aniline-logo.png"
              alt="AniLine"
              width={200}
              height={68}
              priority
              className="h-20 w-auto"
            />
          </div>
          <p className="text-gray-400">{t(lang, "tagline")}</p>
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-[var(--brand)]/30 bg-[var(--brand-soft)] p-4 text-sm text-red-100">
            {error}
          </div>
        )}

        <div className="glass-panel space-y-4 rounded-3xl p-6">
          <button
            onClick={handleSignIn}
            className={cn(
              "flex w-full items-center justify-center gap-3 rounded-xl px-6 py-4 font-bold text-white transition focus:outline-none focus:ring-2 focus:ring-[var(--brand)] focus:ring-offset-2 focus:ring-offset-[var(--bg)]",
              "btn-brand"
            )}
          >
            <LogIn size={20} />
            {t(lang, "navLogin")}
          </button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-white/10" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-[var(--surface)] px-2 text-gray-500">
                o continuar con
              </span>
            </div>
          </div>

          <button
            onClick={() => signIn("google", { callbackUrl: "/" })}
            className={cn(
              "flex w-full items-center justify-center gap-3 rounded-xl border border-white/10 bg-white/5 px-6 py-4 font-bold text-gray-300 transition hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-white/30"
            )}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 9.41 1 11.91 1 14.65c0 2.74.43 5.24 1.18 7.07l3.66-2.66c-.42-.61-.66-1.35-.66-2.14z" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.57 2.77c.87-2.6 3.3-4.46 6.25-4.46z" />
            </svg>
            Google
          </button>
        </div>

        <p className="mt-8 text-center text-xs text-gray-500">
          {t(lang, "navLogin")} @ AniLine
        </p>
      </div>
    </div>
  )
}
