"use client";

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ reset }: GlobalErrorProps) {
  return (
    <html lang="es">
      <body className="min-h-screen bg-[#0B0C0E] text-white antialiased">
        <div className="flex min-h-screen items-center justify-center px-4">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#1e1f22] p-8 text-center">
            <h2 className="text-xl font-bold">Ha ocurrido un error crítico</h2>
            <p className="mt-2 text-sm text-gray-400">La aplicación no pudo recuperarse.</p>
            <button type="button" onClick={() => reset()} className="mt-6 rounded-full bg-[#e50914] px-6 py-2.5 font-semibold text-white hover:bg-[#ff2e4c]">
              Reintentar
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}