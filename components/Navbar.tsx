"use client"

import Link from "next/link"
import { useRouter, usePathname } from "next/navigation"
import { useSession, signIn, signOut } from "next-auth/react"
import { Menu, X, LogIn, LogOut, Search } from "lucide-react"
import { cn } from "@/lib/utils"
import { useLanguage } from "@/contexts/LanguageContext"
import { t } from "@/lib/translations"
import type { Lang } from "@/lib/translations"
import React from "react"

export function Navbar() {
  const { data: session } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const [open, setOpen] = React.useState(false)
  const { lang, setLang } = useLanguage()

  const handleAuth = () => {
    if (session) {
      signOut({ callbackUrl: "/" })
    } else {
      signIn("google", { callbackUrl: "/" })
    }
  }

  const isActive = (route: string) => pathname === route

  return (
    <nav className="fixed top-0 w-full z-50 bg-black/90 backdrop-blur border-b border-white/10">
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
              <Link
                href="/lista"
                className={cn(
                  "text-sm font-medium transition-colors",
                  isActive("/lista") ? "text-red-600" : "text-gray-300 hover:text-white"
                )}
              >
                {t(lang, "navMyList")}
              </Link>
            ) : null}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setLang(lang === "es" ? "en" : "es")}
              className="px-3 py-1.5 text-xs font-medium text-gray-300 bg-gray-800 hover:bg-gray-700 rounded-full transition border border-gray-700"
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
        <div className="md:hidden bg-black/90 border-b border-white/10">
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
            ) : null}
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
