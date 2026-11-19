export default function Loading() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="flex flex-col items-center gap-4 text-gray-400">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/20 border-t-[var(--brand)]" />
        <p className="text-sm">Cargando...€¦</p>
      </div>
    </div>
  )
}
