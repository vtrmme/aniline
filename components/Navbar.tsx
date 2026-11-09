"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useSession, signIn, signOut } from "next-auth/react"
import {
  Menu,
  X,
  LogIn,
  LogOut,
  Moon,
  Sun,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useLanguage } from "@/contexts/LanguageContext"
import { t } from "@/lib/translations"
import React from "react"

export function Navbar() {
  const { data: session } = useSession()
  const pathname = usePathname()
  const [open, setOpen] = React.useState(false)
  const [dark, setDark] = React.useState(() => {
    try {
      return localStorage.getItem("aniline-theme") === "dark"
    } catch {
      return false
    }
  })

  const { lang, setLang } = useLanguage()

  React.useEffect(() => {
    if (dark) {
      document.documentElement.classList.add("dark")
    } else {
      document.documentElement.classList.remove("dark")
    }
  }, [dark])

  const toggleTheme = () => {
    const next = !dark
    setDark(next)
    try {
      localStorage.setItem("aniline-theme", next ? "dark" : "light")
    } catch {
      // ignore
    }
  }

  const handleAuth = () => {
    if (session) {
      signOut({ callbackUrl: "/" })
    } else {
      signIn("google", { callbackUrl: "/" })
    }
  }

  const isActive = (route: string) => pathname === route

  return (
    <nav className="fixed top-0 w-full z-50 bg-black/90 backdrop-blur border-b border-white/10 dark:bg-gray-900/90 dark:border-gray-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-red-600">A</span>
            <Link href="/" className="font-bold text-xl tracking-tighter text-white">
              {t(lang, "siteName")}
            </Link>
          </div>

          <div className="hidden md:flex items-center gap-6">
            <Link
              href="/"
              className={cn(
                "text-sm font-medium transition-colors",
                isActive("/") ? "text-red-600" : "text-gray-300 hover:text-white"
              )}
            >
              {t(lang, "navHome")}
            </Link>
            <Link
              href="/buscar"
              className={cn(
                "text-sm font-medium transition-colors",
                isActive("/buscar") ? "text-red-600" : "text-gray-300 hover:text-white"
              )}
            >
              {t(lang, "navSearch")}
            </Link>
            {session ? (
              <>
                <Link
                  href="/lista"
                  className={cn(
                    "text-sm font-medium transition-colors",
                    isActive("/lista") ? "text-red-600" : "text-gray-300 hover:text-white"
                  )}
                >
                  {t(lang, "navMyList")}
                </Link>
                <Link
                  href="/perfil"
                  className={cn(
                    "text-sm font-medium transition-colors",
                    isActive("/perfil") ? "text-red-600" : "text-gray-300 hover:text-white"
                  )}
                >
                  {t(lang, "navPerfil")}
                </Link>
              </>
            ) : null}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={toggleTheme}
              className="p-2 text-gray-300 hover:text-white transition"
              aria-label={dark ? t(lang, "themeLight") : t(lang, "themeDark")}
            >
              {dark ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button
              onClick={() => setLang(lang === "es" ? "en" : "es")}
              className="px-3 py-1.5 text-xs font-medium text-gray-300 bg-gray-800 hover:bg-gray-700 rounded-full transition border border-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600"
            >
              {lang === "es" ? t(lang, "langEn") : t(lang, "langEs")}
            </button>
            <button
              onClick={handleAuth}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-full transition"
            >
              {session ? <LogOut size={16} /> : <LogIn size={16} />}
              {session ? t(lang, "navLogout") : t(lang, "navLogin")}
            </button>
            <button
              onClick={() => setOpen(!open)}
              className="md:hidden p-2 text-gray-300 hover:text-white"
              aria-label="Menú"
            >
              {open ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {open && (
        <div className="md:hidden bg-black/90 border-b border-white/10 dark:bg-gray-900/90 dark:border-gray-700">
          <div className="px-4 py-4 space-y-4">
            <Link
              href="/"
              onClick={() => setOpen(false)}
              className={cn(
                "block text-sm font-medium transition-colors",
                isActive("/") ? "text-red-600" : "text-gray-300 hover:text-white"
              )}
            >
              {t(lang, "navHome")}
            </Link>
            <Link
              href="/buscar"
              onClick={() => setOpen(false)}
              className={cn(
                "block text-sm font-medium transition-colors",
                isActive("/buscar") ? "text-red-600" : "text-gray-300 hover:text-white"
              )}
            >
              {t(lang, "navSearch")}
            </Link>
            {session ? (
              <>
                <Link
                  href="/lista"
                  onClick={() => setOpen(false)}
                  className={cn(
                    "block text-sm font-medium transition-colors",
                    isActive("/lista") ? "text-red-600" : "text-gray-300 hover:text-white"
                  )}
                >
                  {t(lang, "navMyList")}
                </Link>
                <Link
                  href="/perfil"
                  onClick={() => setOpen(false)}
                  className={cn(
                    "block text-sm font-medium transition-colors",
                    isActive("/perfil") ? "text-red-600" : "text-gray-300 hover:text-white"
                  )}
                >
                  {t(lang, "navPerfil")}
                </Link>
              </>
            ) : null}
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-gray-400">
                {dark ? t(lang, "themeDark") : t(lang, "themeLight")}
              </span>
              <button
                onClick={toggleTheme}
                className="p-1 text-gray-300 hover:text-white"
              >
                {dark ? <Sun size={16} /> : <Moon size={16} />}
              </button>
            </div>
            <button
              onClick={handleAuth}
              className="w-full text-left py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition"
            >
              {session ? t(lang, "navLogout") : t(lang, "navLogin")}
            </button>
          </div>
        </div>
      )}
    </nav>
  )
}
