import Link from "next/link"
import Image from "next/image"

export default function NotFound() {
  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-[var(--bg)] px-4 text-white">
      <div className="text-center">
        <div className="mb-6 flex justify-center">
          <Image
            src="/aniline-logo.png"
            alt="AniLine"
            width={160}
            height={54}
            priority
            className="h-16 w-auto opacity-80"
          />
        </div>
        <h1 className="text-7xl font-bold text-[var(--brand)] drop-shadow-[0_0_30px_rgba(229,9,20,0.4)]">
          404
        </h1>
        <p className="mt-4 text-xl text-gray-400">Página no encontrada</p>
        <Link
          href="/"
          className="btn-brand mt-6 inline-block rounded-full px-6 py-2.5 font-semibold"
        >
          Volver al inicio
        </Link>
      </div>
    </div>
  )
}
