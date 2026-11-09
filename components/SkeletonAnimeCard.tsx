"use client"

import { cn } from "@/lib/utils"

interface SkeletonAnimeCardProps {
  className?: string
}

export function SkeletonAnimeCard({ className }: SkeletonAnimeCardProps) {
  return (
    <div className={cn("group block", className)}>
      <div className="relative aspect-[2/3] rounded-xl overflow-hidden bg-gray-800 mb-2 animate-pulse">
        <div className="absolute inset-0 bg-gray-700"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-gray-800 via-transparent to-transparent opacity-50"></div>
      </div>
      <div className="mt-2 h-4 bg-gray-700 rounded w-full animate-pulse"></div>
    </div>
  )
}
