"use client"

import Link from "next/link"
import Image from "next/image"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useSession, signIn, signOut } from "next-auth/react"
import {
  Menu,
  X,
  LogIn,
  LogOut,
  Moon,
  Sun,
  Search,
} from "lucide-react"
import { Suspense } from "react"
import { cn } from "@/lib/utils"
import { useLanguage } from "@/contexts/LanguageContext"
import { t } from "@/lib/translations"
import React from "react"

interface EnlaceNav {
  href: string
  label: string
  activo: boolean
}

function construirEnlaces(
  pathname: string,
  params: URLSearchParams,
  lang: "es" | "en",
  haySesion: boolean
): EnlaceNav[] {
  const estado = params.get("estado")
  const orden = params.get("orden")
  const enHome = pathname === "/"

  const enlaces: EnlaceNav[] = [
    {
      href: "/",
      label: t(lang, "navExplorar"),
      activo: enHome && !estado && orden !== "puntuacion",
    },
    {
      href: "/?estado=" + encodeURIComponent("en emisión") + "#explorar",
      label: t(lang, "navSimulcasts"),
      activo: enHome && estado === "en emisión",
    },
    {
      href: "/?orden=puntuacion#explorar",
      label: t(lang, "navPopular"),
      activo: enHome && orden === "puntuacion" && estado !== "en emisión",
    },
  ]

  if (haySesion) {
    enlaces.push({ href: "/lista", label: t(lang, "navMyList"), activo: pathname === "/lista" })
    enlaces.push({ href: "/perfil", label: t(lang, "navPerfil"), activo: pathname === "/perfil" })
  }

  return enlaces
}

function EnlacesNav({
  cerrarMenu,
  variante,
}: {
  cerrarMenu: () => void
  variante: "desktop" | "movil"
}) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { lang } = useLanguage()
  const { data: session } = useSession()

  const enlaces = construirEnlaces(
    pathname,
    new URLSearchParams(searchParams.toString()),
    lang,
    !!session
  )

  if (variante === "desktop") {
    return (
      <div className="hidden items-center gap-1 md:flex">
        {enlaces.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "relative rounded-full px-3.5 py-2 text-sm font-medium transition-colors",
              link.activo
                ? "text-[var(--brand-bright)]"
                : "text-gray-300 hover:text-white"
            )}
          >
            {link.label}
            {link.activo && (
              <span className="absolute inset-x-3 -bottom-0.5 h-0.5 rounded-full bg-[var(--brand)]" />
            )}
          </Link>
        ))}
      </div>
    )
  }

  return (
    <>
      {enlaces.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          onClick={cerrarMenu}
          className={cn(
            "block rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
            link.activo
              ? "bg-[var(--brand-soft)] text-[var(--brand-bright)]"
              : "text-gray-300 hover:bg-white/5 hover:text-white"
          )}
        >
          {link.label}
        </Link>
      ))}
    </>
  )
}

export function Navbar() {
  const { data: session } = useSession()
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [busqueda, setBusqueda] = React.useState(false)
  const [q, setQ] = React.useState("")
  const [scrolled, setScrolled] = React.useState(false)
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

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

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

  const enviarBusqueda = (e: React.FormEvent) => {
    e.preventDefault()
    const texto = q.trim()
    router.push(texto ? `/buscar?q=${encodeURIComponent(texto)}` : "/buscar")
    setBusqueda(false)
    setOpen(false)
  }

  return (
    <nav
      className={cn(
        "fixed top-0 z-50 w-full transition-colors duration-300",
        scrolled ? "glass" : "border-b border-transparent bg-transparent"
      )}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex shrink-0 items-center" aria-label="AniLine">
              <Image
                src="/aniline-logo.png"
                alt="AniLine"
                width={132}
                height={44}
                priority
                className="h-11 w-auto"
              />
            </Link>
          </div>

          <Suspense fallback={<div className="hidden md:flex" />}>
            <EnlacesNav cerrarMenu={() => setOpen(false)} variante="desktop" />
          </Suspense>

          <div className="flex items-center gap-2">
            <form
              onSubmit={enviarBusqueda}
              className={cn(
                "hidden items-center overflow-hidden rounded-full border transition-all duration-300 md:flex",
                busqueda
                  ? "w-64 border-white/15 bg-[var(--surface)] px-3"
                  : "w-10 border-transparent bg-transparent justify-center"
              )}
            >
              <button
                type={busqueda ? "submit" : "button"}
                onClick={() => {
                  if (!busqueda) setBusqueda(true)
                }}
                className="flex h-9 shrink-0 items-center justify-center text-gray-300 transition hover:text-white"
                aria-label={t(lang, "navSearch")}
              >
                <Search size={18} />
              </button>
              {busqueda && (
                <input
                  autoFocus
                  type="text"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  onBlur={() => {
                    if (!q.trim()) setBusqueda(false)
                  }}
                  placeholder={t(lang, "searchPlaceholder")}
                  className="w-full bg-transparent py-2 pl-2 text-sm text-white placeholder:text-gray-500 focus:outline-none"
                />
              )}
            </form>

            <button
              onClick={toggleTheme}
              className="flex h-9 w-9 items-center justify-center rounded-full text-gray-300 transition hover:bg-white/10 hover:text-white"
              aria-label={dark ? t(lang, "themeLight") : t(lang, "themeDark")}
            >
              {dark ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button
              onClick={() => setLang(lang === "es" ? "en" : "es")}
              className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-gray-300 transition hover:bg-white/10 hover:text-white"
            >
              {lang === "es" ? t(lang, "langEn") : t(lang, "langEs")}
            </button>
            <button
              onClick={handleAuth}
              className={cn(
                "hidden items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition md:inline-flex",
                session
                  ? "btn-ghost"
                  : "bg-[var(--brand)] text-white hover:bg-[var(--brand-bright)]"
              )}
            >
              {session ? <LogOut size={16} /> : <LogIn size={16} />}
              {session ? t(lang, "navLogout") : t(lang, "navLogin")}
            </button>
            <button
              onClick={() => setOpen(!open)}
              className="flex h-9 w-9 items-center justify-center rounded-full text-gray-300 transition hover:bg-white/10 hover:text-white md:hidden"
              aria-label="Menú"
            >
              {open ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {open && (
        <div className="glass border-t border-white/10 md:hidden">
          <div className="space-y-1 px-4 py-4">
            <form onSubmit={enviarBusqueda} className="mb-3 flex items-center gap-2 rounded-full border border-white/10 bg-[var(--surface)] px-4 py-2">
              <Search size={16} className="shrink-0 text-gray-400" />
              <input
                type="text"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={t(lang, "searchPlaceholder")}
                className="w-full bg-transparent text-sm text-white placeholder:text-gray-500 focus:outline-none"
              />
            </form>

            <Suspense fallback={null}>
              <EnlacesNav cerrarMenu={() => setOpen(false)} variante="movil" />
            </Suspense>

            <div className="flex items-center justify-between rounded-lg px-3 py-2.5">
              <span className="text-sm text-gray-400">
                {dark ? t(lang, "themeDark") : t(lang, "themeLight")}
              </span>
              <button onClick={toggleTheme} className="text-gray-300 hover:text-white">
                {dark ? <Sun size={16} /> : <Moon size={16} />}
              </button>
            </div>

            <button
              onClick={() => {
                handleAuth()
                setOpen(false)
              }}
              className="mt-1 w-full rounded-lg bg-[var(--brand)] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--brand-bright)]"
            >
              {session ? t(lang, "navLogout") : t(lang, "navLogin")}
            </button>
          </div>
        </div>
      )}
    </nav>
  )
}
