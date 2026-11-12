"use client"

import React, { useCallback, useRef, useState } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

interface CarouselProps {
  title?: string
  subtitle?: string
  children: React.ReactNode
  className?: string
  action?: React.ReactNode
}

export function Carousel({ title, subtitle, children, className, action }: CarouselProps) {
  const scrollerRef = useRef<HTMLDivElement>(null)
  const [atStart, setAtStart] = useState(true)
  const [atEnd, setAtEnd] = useState(false)

  const actualizarEstados = useCallback(() => {
    const el = scrollerRef.current
    if (!el) return
    const inicio = el.scrollLeft <= 4
    const fin = el.scrollLeft + el.clientWidth >= el.scrollWidth - 4
    setAtStart(inicio)
    setAtEnd(fin)
  }, [])

  const desplazar = useCallback((direccion: 1 | -1) => {
    const el = scrollerRef.current
    if (!el) return
    el.scrollBy({
      left: direccion * Math.max(el.clientWidth * 0.8, 240),
      behavior: "smooth",
    })
  }, [])

  return (
    <section className={cn("relative mb-10", className)}>
      {(title || action) && (
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            {title && (
              <h2 className="text-xl md:text-2xl font-bold text-white">{title}</h2>
            )}
            {subtitle && (
              <p className="text-sm text-[var(--muted)]">{subtitle}</p>
            )}
          </div>
          {action}
        </div>
      )}

      <div className="group/carousel relative">
        <div
          ref={scrollerRef}
          onScroll={actualizarEstados}
          className="no-scrollbar flex gap-4 overflow-x-auto scroll-smooth snap-x snap-mandatory pb-1"
        >
          {children}
        </div>

        <button
          type="button"
          onClick={() => desplazar(-1)}
          aria-label="Desplazar a la izquierda"
          disabled={atStart}
          className={cn(
            "absolute left-0 top-1/2 z-10 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-black/70 text-white backdrop-blur transition opacity-0 group-hover/carousel:opacity-100 hover:bg-black/90 hover:border-white/25 md:flex",
            atStart && "pointer-events-none opacity-0"
          )}
        >
          <ChevronLeft size={22} />
        </button>

        <button
          type="button"
          onClick={() => desplazar(1)}
          aria-label="Desplazar a la derecha"
          disabled={atEnd}
          className={cn(
            "absolute right-0 top-1/2 z-10 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-black/70 text-white backdrop-blur transition opacity-0 group-hover/carousel:opacity-100 hover:bg-black/90 hover:border-white/25 md:flex",
            atEnd && "pointer-events-none opacity-0"
          )}
        >
          <ChevronRight size={22} />
        </button>

        <div className="pointer-events-none absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-[var(--bg)] to-transparent opacity-0 transition-opacity group-hover/carousel:opacity-100" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-[var(--bg)] to-transparent opacity-0 transition-opacity group-hover/carousel:opacity-100" />
      </div>
    </section>
  )
}
