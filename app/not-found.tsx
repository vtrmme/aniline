import Link from "next/link"

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0f0f0f] text-white">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-red-600">404</h1>
        <p className="text-xl text-gray-400 mt-4">Página no encontrada</p>
        <Link
          href="/"
          className="mt-6 inline-block px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition"
        >
          Volver al inicio
        </Link>
      </div>
    </div>
  )
}
