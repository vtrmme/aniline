interface RateLimitEntry {
  count: number
  resetTime: number
}

const store = new Map<string, RateLimitEntry>()

const LIMPIEZA_INTERVALO_MS = 60_000
const MAX_ENTRADAS = 50_000

function limpiarExpiradas(): void {
  const ahora = Date.now()
  for (const [key, entry] of store.entries()) {
    if (ahora > entry.resetTime) {
      store.delete(key)
    }
  }
}

setInterval(() => {
  limpiarExpiradas()
  if (store.size > MAX_ENTRADAS) {
    store.clear()
  }
}, LIMPIEZA_INTERVALO_MS)

export function rateLimit({
  clave,
  maximo = 10,
  ventanaSegundos = 60,
}: {
  clave: string
  maximo?: number
  ventanaSegundos?: number
}): { permitido: boolean; restante: number } {
  const ahora = Date.now()
  const entrada = store.get(clave)

  if (!entrada || ahora > entrada.resetTime) {
    store.set(clave, {
      count: 1,
      resetTime: ahora + ventanaSegundos * 1000,
    })
    return { permitido: true, restante: maximo - 1 }
  }

  if (entrada.count >= maximo) {
    return { permitido: false, restante: 0 }
  }

  entrada.count++
  store.set(clave, entrada)
  return { permitido: true, restante: maximo - entrada.count }
}
