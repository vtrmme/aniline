"use client"

import Link from "next/link"
import { useSession, signOut } from "next-auth/react"
import { useRouter, usePathname } from "next/navigation"
import { LogOut, LayoutDashboard, FileText, Play, Users, Settings } from "lucide-react"
import { cn } from "@/lib/utils"
import { useLanguage } from "@/contexts/LanguageContext"
import { t } from "@/lib/translations"
import React, { useEffect } from "react"

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const { lang, setLang } = useLanguage()

  useEffect(() => {
    if (!session) {
      router.push("/")
    }
  }, [session, router])

  if (!session) {
    return null
  }

  const handleLogout = () => {
    signOut({ callbackUrl: "/" })
  }

  const isActive = (route: string) => pathname === route || pathname.startsWith(route + "/")

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white">
      <nav className="fixed left-0 top-0 h-full w-64 bg-gray-900 border-r border-gray-700 z-50">
        <div className="p-6">
          <Link href="/admin" className="flex items-center gap-2 text-xl font-bold text-red-600 mb-8">
            <LayoutDashboard size={24} />
            <span>AniLine Admin</span>
          </Link>

          <div className="space-y-2">
            <Link
              href="/admin"
              className={cn(
                "flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition",
                isActive("/admin") ? "bg-red-600/20 text-red-400 border border-red-600/30" : "text-gray-400 hover:text-white hover:bg-gray-800"
              )}
            >
              <LayoutDashboard size={20} /> Panel
            </Link>
            <Link
              href="/admin/animes"
              className={cn(
                "flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition",
                pathname.startsWith("/admin/animes")
                  ? "bg-red-600/20 text-red-400 border border-red-600/30"
                  : "text-gray-400 hover:text-white hover:bg-gray-800"
              )}
            >
              <FileText size={20} /> Animes
            </Link>
            <Link
              href="/admin/episodes"
              className={cn(
                "flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition",
                pathname.startsWith("/admin/episodes")
                  ? "bg-red-600/20 text-red-400 border border-red-600/30"
                  : "text-gray-400 hover:text-white hover:bg-gray-800"
              )}
            >
              <Play size={20} /> Episodios
            </Link>
          </div>

          <div className="mt-auto pt-6 border-t border-gray-700">
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 w-full px-4 py-2.5 text-sm font-medium text-gray-400 hover:text-red-400 transition"
            >
              <LogOut size={20} /> {t(lang, "navLogout")}
            </button>
            <button
              onClick={() => setLang(lang === "es" ? "en" : "es")}
              className="mt-4 w-full px-4 py-2 text-xs text-gray-500 hover:text-gray-300 transition bg-gray-800 rounded"
            >
              {lang === "es" ? t(lang, "langEn") : t(lang, "langEs")}
            </button>
          </div>
        </div>
      </nav>

      <div className="ml-64 p-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold text-white">{t(lang, "navMyList")}</h1>
        </div>
        {children}
      </div>
    </div>
  )
}

export default AdminLayout
