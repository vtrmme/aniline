"use client"

import { AnimeForm } from "@/components/admin/AnimeForm"
import { useRouter } from "next/navigation"

export default function NewAnime() {
  const router = useRouter()
  return (
    <AnimeForm onSuccess={() => router.push("/admin/animes")} />
  )
}
