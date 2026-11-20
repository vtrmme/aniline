"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { Search, LogIn, LogOut, User, Shield, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";
import { DownloadAppButton } from "@/components/DownloadAppButton";

const navLinks = (isAuth: boolean) => [
  { href: "/", key: "navExplore" as const, auth: false },
  { href: "/buscar", key: "navSearch" as const, auth: false },
  { href: "/apoyanos", key: "navSupport" as const, auth: false },
  { href: "/lista", key: "navMyList" as const, auth: true },
].filter((l) => !l.auth || isAuth);

export function Navbar() {
  const { data: session, status } = useSession();
  const { t, lang, setLang } = useLanguage();
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  const user = session?.user;
  const isAuth = status === "authenticated" && !!user;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const links = navLinks(isAuth);
  const closeMenu = () => setOpen(false);

  return (
    <nav
      className={cn(
        "fixed top-0 z-50 w-full transition-colors duration-300",
        scrolled || open ? "glass" : "border-b border-transparent bg-transparent",
      )}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex shrink-0 items-center" aria-label={t("siteName")} onClick={closeMenu}>
            <Image src="/aniline-logo.png" alt={t("siteName")} width={132} height={44} priority className="h-10 w-auto" />
          </Link>
          <div className="hidden items-center gap-1 md:flex">
            {links.map((l) => {
              const active = l.href === "/" ? pathname === "/" : pathname.startsWith(l.href);
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={closeMenu}
                  className={cn(
                    "relative rounded-full px-3.5 py-2 text-sm font-medium transition-colors",
                    active ? "text-white" : "text-gray-300 hover:text-white",
                  )}
                >
                  {t(l.key)}
                  {active && <span className="absolute inset-x-3 -bottom-0.5 h-0.5 rounded-full bg-[var(--brand)]" />}
                </Link>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/buscar"
            onClick={closeMenu}
            className="flex h-9 w-9 items-center justify-center rounded-full text-gray-300 transition hover:bg-white/10 hover:text-white"
            aria-label={t("navSearch")}
          >
            <Search size={18} />
          </Link>

          <DownloadAppButton variant="nav" />
          <button
            type="button"
            onClick={() => setLang(lang === "es" ? "en" : "es")}
            className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-gray-300 transition hover:bg-white/10 hover:text-white"
            aria-label={t("language")}
          >
            {lang === "es" ? t("langEn") : t("langEs")}
          </button>

          {isAuth ? (
            <>
              <Link
                href="/perfil"
                onClick={closeMenu}
                className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-gray-200 transition hover:bg-white/10 sm:inline-flex"
              >
                <User size={15} />
                <span className="max-w-[120px] truncate">{user?.name || t("navProfile")}</span>
              </Link>
              {user?.isAdmin && (
                <Link
                  href="/admin"
                  onClick={closeMenu}
                  className="hidden h-9 w-9 items-center justify-center rounded-full text-gray-300 transition hover:bg-white/10 hover:text-white sm:flex"
                  aria-label={t("navAdmin")}
                  title={t("navAdmin")}
                >
                  <Shield size={16} />
                </Link>
              )}
              <button
                type="button"
                onClick={() => signOut({ callbackUrl: "/" })}
                className="hidden h-9 w-9 items-center justify-center rounded-full text-gray-300 transition hover:bg-white/10 hover:text-white sm:flex"
                aria-label={t("navLogout")}
                title={t("navLogout")}
              >
                <LogOut size={16} />
              </button>
            </>
          ) : (
            <Link href="/auth/signin" onClick={closeMenu} className="btn-brand hidden items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold sm:inline-flex">
              <LogIn size={16} /> {t("navLogin")}
            </Link>
          )}

          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="flex h-9 w-9 items-center justify-center rounded-full text-gray-300 transition hover:bg-white/10 hover:text-white md:hidden"
            aria-label={open ? t("closeMenu") : t("openMenu")}
            aria-expanded={open}
            aria-controls="mobile-menu"
          >
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {open && (
        <div id="mobile-menu" className="glass border-t border-white/10 md:hidden">
          <div className="space-y-1 px-4 py-4">
            <DownloadAppButton variant="menu" onNavigate={closeMenu} />
            {links.map((l) => {
              const active = l.href === "/" ? pathname === "/" : pathname.startsWith(l.href);
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={closeMenu}
                  className={cn(
                    "block rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    active ? "bg-[var(--brand-soft)] text-white" : "text-gray-300 hover:bg-white/5 hover:text-white",
                  )}
                >
                  {t(l.key)}
                </Link>
              );
            })}
            {isAuth ? (
              <>
                <Link href="/perfil" onClick={closeMenu} className="block rounded-lg px-3 py-2.5 text-sm font-medium text-gray-300 hover:bg-white/5 hover:text-white">{t("navProfile")}</Link>
                {user?.isAdmin && <Link href="/admin" onClick={closeMenu} className="block rounded-lg px-3 py-2.5 text-sm font-medium text-gray-300 hover:bg-white/5 hover:text-white">{t("navAdmin")}</Link>}
                <button
                  type="button"
                  onClick={() => signOut({ callbackUrl: "/" })}
                  className="mt-1 w-full rounded-lg bg-white/10 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/15"
                >
                  {t("navLogout")}
                </button>
              </>
            ) : (
              <Link href="/auth/signin" onClick={closeMenu} className="btn-brand mt-1 block w-full rounded-lg px-4 py-2.5 text-center text-sm font-semibold">
                {t("navLogin")}
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}