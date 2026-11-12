"use client"

import { useState } from "react"
import { Heart, Check, ChevronDown, Sparkles } from "lucide-react"
import { useLanguage } from "@/contexts/LanguageContext"
import { t } from "@/lib/translations"

const PATREON_URL = "https://www.patreon.com/AniLine"

interface Tier {
  id: string
  nombreKey:
    | "tierBronceName"
    | "tierPlataName"
    | "tierOroName"
  descKey: "tierBronceDesc" | "tierPlataDesc" | "tierOroDesc"
  precio: string
  perks: string[]
  destacado: boolean
}

interface FaqItem {
  preguntaKey: "supportFaqQ1" | "supportFaqQ2" | "supportFaqQ3" | "supportFaqQ4" | "supportFaqQ5"
  respuestaKey: "supportFaqA1" | "supportFaqA2" | "supportFaqA3" | "supportFaqA4" | "supportFaqA5"
}

function construirTiers(lang: "es" | "en"): Tier[] {
  return [
    {
      id: "bronce",
      nombreKey: "tierBronceName",
      descKey: "tierBronceDesc",
      precio: "3",
      perks: [t(lang, "tierBroncePerk1"), t(lang, "tierBroncePerk2"), t(lang, "tierBroncePerk3")],
      destacado: false,
    },
    {
      id: "plata",
      nombreKey: "tierPlataName",
      descKey: "tierPlataDesc",
      precio: "6",
      perks: [t(lang, "tierPlataPerk1"), t(lang, "tierPlataPerk2"), t(lang, "tierPlataPerk3")],
      destacado: true,
    },
    {
      id: "oro",
      nombreKey: "tierOroName",
      descKey: "tierOroDesc",
      precio: "12",
      perks: [t(lang, "tierOroPerk1"), t(lang, "tierOroPerk2"), t(lang, "tierOroPerk3")],
      destacado: false,
    },
  ]
}

const FAQ_ITEMS: FaqItem[] = [
  { preguntaKey: "supportFaqQ1", respuestaKey: "supportFaqA1" },
  { preguntaKey: "supportFaqQ2", respuestaKey: "supportFaqA2" },
  { preguntaKey: "supportFaqQ3", respuestaKey: "supportFaqA3" },
  { preguntaKey: "supportFaqQ4", respuestaKey: "supportFaqA4" },
  { preguntaKey: "supportFaqQ5", respuestaKey: "supportFaqA5" },
]

export default function ApoyanosPage() {
  const { lang } = useLanguage()
  const [abierta, setAbierta] = useState<number | null>(null)
  const tiers = construirTiers(lang)

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
      <section className="mb-14 text-center">
        <span className="badge-brand mx-auto mb-4 inline-flex items-center gap-1.5">
          <Heart size={12} fill="currentColor" />
          {t(lang, "navSupport")}
        </span>
        <h1 className="mb-3 text-4xl font-bold tracking-tight text-white sm:text-5xl">
          {t(lang, "supportTitle")}
        </h1>
        <p className="mx-auto mb-4 max-w-2xl text-lg text-gray-400">
          {t(lang, "supportSubtitle")}
        </p>
        <p className="mx-auto mb-8 max-w-xl text-sm text-gray-500">
          {t(lang, "supportHeroText")}
        </p>
        <a
          href={PATREON_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-brand inline-flex items-center gap-2 px-8 py-3.5 text-base"
        >
          <Heart size={18} fill="currentColor" />
          {t(lang, "supportCta")}
        </a>
      </section>

      <section className="mb-16">
        <h2 className="mb-1 text-center text-2xl font-bold text-white">
          {t(lang, "supportTiersTitle")}
        </h2>
        <p className="mb-8 text-center text-sm text-gray-500">
          {t(lang, "supportTiersSubtitle")}
        </p>
        <div className="grid gap-6 md:grid-cols-3">
          {tiers.map((tier) => (
            <div
              key={tier.id}
              className={
                tier.destacado
                  ? "glass relative flex flex-col rounded-2xl border border-[var(--brand)]/50 p-6 shadow-[0_0_40px_rgba(229,9,20,0.15)]"
                  : "glass flex flex-col rounded-2xl border border-white/10 p-6"
              }
            >
              {tier.destacado && (
                <span className="badge-brand absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap">
                  <Sparkles size={12} />
                  {t(lang, "supportPopular")}
                </span>
              )}
              <h3 className="text-xl font-bold text-white">{t(lang, tier.nombreKey)}</h3>
              <p className="mb-4 mt-1 text-sm text-gray-400">{t(lang, tier.descKey)}</p>
              <div className="mb-6 flex items-baseline gap-1">
                <span className="text-4xl font-extrabold text-white">{tier.precio}€</span>
                <span className="text-sm text-gray-500">{t(lang, "supportPerMonth")}</span>
              </div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
                {t(lang, "supportIncluded")}
              </p>
              <ul className="mb-6 flex-1 space-y-3">
                {tier.perks.map((perk) => (
                  <li key={perk} className="flex items-start gap-2 text-sm text-gray-300">
                    <Check
                      size={16}
                      className="mt-0.5 shrink-0 text-[var(--brand-bright)]"
                    />
                    {perk}
                  </li>
                ))}
              </ul>
              <a
                href={PATREON_URL}
                target="_blank"
                rel="noopener noreferrer"
                className={
                  tier.destacado
                    ? "btn-brand inline-flex items-center justify-center gap-2 py-2.5"
                    : "btn-ghost inline-flex items-center justify-center gap-2 py-2.5"
                }
              >
                <Heart size={15} fill="currentColor" />
                {t(lang, "supportCta")}
              </a>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-3xl">
        <h2 className="mb-6 text-center text-2xl font-bold text-white">
          {t(lang, "supportFaqTitle")}
        </h2>
        <div className="space-y-3">
          {FAQ_ITEMS.map((item, i) => (
            <div key={item.preguntaKey} className="glass overflow-hidden rounded-xl">
              <button
                type="button"
                onClick={() => setAbierta(abierta === i ? null : i)}
                className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left text-sm font-semibold text-white transition hover:text-[var(--brand-bright)]"
                aria-expanded={abierta === i}
              >
                {t(lang, item.preguntaKey)}
                <ChevronDown
                  size={18}
                  className={`shrink-0 text-gray-400 transition-transform ${abierta === i ? "rotate-180" : ""}`}
                />
              </button>
              {abierta === i && (
                <p className="border-t border-white/10 px-5 py-4 text-sm leading-relaxed text-gray-400">
                  {t(lang, item.respuestaKey)}
                </p>
              )}
            </div>
          ))}
        </div>
        <p className="glass mt-8 rounded-xl px-5 py-4 text-center text-sm text-gray-400">
          {t(lang, "supportDiscordNote")}
        </p>
      </section>
    </div>
  )
}
