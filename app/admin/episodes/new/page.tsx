"use client"

import { EpisodeForm } from "@/components/admin/EpisodeForm"
import { useRouter } from "next/navigation"

export default function NewEpisode() {
  const router = useRouter()
  return (
    <EpisodeForm onSuccess={() => router.push("/admin/animes")} />
  )
}
