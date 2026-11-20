interface RateLimitEntry {
  count: number;
  resetTime: number;
}

export interface RateLimitResult {
  permitido: boolean;
  restante: number;
}

interface RateLimitParams {
  clave: string;
  maximo?: number;
  ventanaSegundos?: number;
}

const store = new Map<string, RateLimitEntry>();
const LIMPIEZA_INTERVALO_MS = 60_000;
const MAX_ENTRADAS = 50_000;

function limpiarExpiradas(): void {
  const ahora = Date.now();
  for (const [key, entry] of store.entries()) {
    if (ahora > entry.resetTime) store.delete(key);
  }
}

const intervalo: ReturnType<typeof setInterval> | null =
  typeof setInterval === "function"
    ? setInterval(() => {
        limpiarExpiradas();
        if (store.size > MAX_ENTRADAS) store.clear();
      }, LIMPIEZA_INTERVALO_MS)
    : null;

if (intervalo && typeof (intervalo as { unref?: () => void }).unref === "function") {
  (intervalo as { unref: () => void }).unref();
}

function rateLimitLocal({ clave, maximo = 10, ventanaSegundos = 60 }: RateLimitParams): RateLimitResult {
  const ahora = Date.now();
  const entrada = store.get(clave);

  if (!entrada || ahora > entrada.resetTime) {
    store.set(clave, { count: 1, resetTime: ahora + ventanaSegundos * 1000 });
    return { permitido: true, restante: maximo - 1 };
  }
  if (entrada.count >= maximo) return { permitido: false, restante: 0 };

  entrada.count += 1;
  store.set(clave, entrada);
  return { permitido: true, restante: maximo - entrada.count };
}

async function rateLimitUpstash({ clave, maximo = 10, ventanaSegundos = 60 }: RateLimitParams): Promise<RateLimitResult | null> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;

  try {
    const key = `rl:${clave}:${Math.floor(Date.now() / (ventanaSegundos * 1000))}`;
    const endpoint = `${url.replace(/\/$/, "")}/pipeline`;
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify([
        ["INCR", key],
        ["EXPIRE", key, ventanaSegundos + 5],
      ]),
      cache: "no-store",
    });
    if (!res.ok) return null;
    const json = (await res.json()) as Array<{ result?: unknown }>;
    const countRaw = json?.[0]?.result;
    const count = typeof countRaw === "number" ? countRaw : Number(countRaw);
    if (!Number.isFinite(count)) return null;
    return { permitido: count <= maximo, restante: Math.max(0, maximo - count) };
  } catch {
    return null;
  }
}

export async function rateLimit(params: RateLimitParams): Promise<RateLimitResult> {
  const remoto = await rateLimitUpstash(params);
  if (remoto) return remoto;
  return rateLimitLocal(params);
}
