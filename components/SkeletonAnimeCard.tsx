"use client"

import { cn } from "@/lib/utils"

interface SkeletonAnimeCardProps {
  className?: string
}

export function SkeletonAnimeCard({ className }: SkeletonAnimeCardProps) {
  return (
    <div className={cn("group block", className)}>
      <div className="skeleton relative mb-2 aspect-[2/3] overflow-hidden rounded-xl" />
      <div className="skeleton h-4 w-full rounded" />
    </div>
  )
}
