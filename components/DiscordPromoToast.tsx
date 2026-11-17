"use client"

import { useEffect, useState } from "react"
import { X } from "lucide-react"

const DISCORD_URL = "https://discord.gg/3jYzeheaMb"

export function DiscordPromoToast() {
  const [visible, setVisible] = useState(false)
  const [closing, setClosing] = useState(false)

  useEffect(() => {
    const showTimer = setTimeout(() => setVisible(true), 300)
    const hideTimer = setTimeout(() => {
      setClosing(true)
      setTimeout(() => setVisible(false), 400)
    }, 7000)
    return () => {
      clearTimeout(showTimer)
      clearTimeout(hideTimer)
    }
  }, [])

  const cerrar = () => {
    setClosing(true)
    setTimeout(() => setVisible(false), 400)
  }

  if (!visible) return null

  return (
    <div
      className={`fixed left-4 right-4 top-20 z-[60] mx-auto max-w-xl transition-all duration-400 sm:left-6 sm:right-auto ${
        closing ? "translate-y-[-10px] opacity-0" : "translate-y-0 opacity-100"
      }`}
      role="status"
      aria-live="polite"
    >
      <div className="glass-panel relative overflow-hidden rounded-2xl border border-[var(--brand)]/30 p-4 shadow-2xl shadow-black/40">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[var(--brand-soft)] via-transparent to-transparent" />
        <button
          type="button"
          onClick={cerrar}
          aria-label="Cerrar aviso"
          className="absolute right-2 top-2 rounded-md p-1 text-gray-400 transition hover:bg-white/10 hover:text-white"
        >
          <X size={16} />
        </button>
        <div className="relative pr-6">
          <p className="text-sm font-semibold text-white sm:text-base">
            ¡Únete a nuestro Discord!
          </p>
          <p className="mt-1 text-sm text-gray-300">
            Entra al servidor para poder votar en decisiones importantes de la web y ser parte de la comunidad.
          </p>
          <a
            href={DISCORD_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-brand mt-3 inline-flex items-center rounded-full px-4 py-1.5 text-sm font-bold"
          >
            Unirme a Discord
          </a>
        </div>
      </div>
    </div>
  )
}
