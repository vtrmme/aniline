import { withAuth } from "next-auth/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { rateLimit } from "@/lib/rate-limit";

const UA_MALICIOSOS: string[] = [
  "sqlmap",
  "nikto",
  "nmap",
  "masscan",
  "zgrab",
  "dirbuster",
  "gobuster",
  "wpscan",
  "acunetix",
  "nessus",
  "hydra",
  "metasploit",
  "havij",
  "arachni",
  "skipfish",
  "w3af",
  "netsparker",
  "burp suite",
];

function ipDe(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const primera = forwarded.split(",")[0]?.trim();
    if (primera) return primera;
  }
  return req.headers.get("x-real-ip") || "desconocido";
}

function construirCsp(): string {
  return [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    "connect-src 'self' https://graphql.anilist.co https://*.supabase.co https://api.themoviedb.org https://*.google.com https://*.googleapis.com",
    "media-src 'self' blob: https:",
    "worker-src 'self' blob:",
    "frame-src https://www.youtube.com https://www.youtube-nocookie.com https://megaplay.buzz https://vidhawk.buzz https://megavid.buzz https://anixo.buzz",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
    "upgrade-insecure-requests",
  ].join("; ");
}

async function capaSeguridad(req: NextRequest): Promise<NextResponse | null> {
  const response = NextResponse.next();
  response.headers.set("Content-Security-Policy", construirCsp());
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=()");
  response.headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  response.headers.set("X-Permitted-Cross-Domain-Policies", "none");

  const { pathname } = req.nextUrl;
  const esWellKnown = pathname.startsWith("/.well-known/");
  const esRecursoEstatico =
    /\.(png|jpe?g|gif|svg|webp|avif|ico|woff2?|ttf|eot|txt|xml|json|js|mjs|css|map|webmanifest)$/i.test(pathname) ||
    pathname === "/sw.js" ||
    pathname === "/manifest.webmanifest" ||
    esWellKnown;

  if (esRecursoEstatico) {
    return response;
  }

  const userAgent = req.headers.get("user-agent");
  if (!userAgent || !userAgent.trim()) {
    return new NextResponse(null, { status: 403 });
  }
  const ua = userAgent.toLowerCase();
  if (UA_MALICIOSOS.some((patron) => ua.includes(patron))) {
    return new NextResponse(null, { status: 403 });
  }

  const esApi = pathname.startsWith("/api");
  const limiteMaximo = esApi ? 120 : 300;
  const limite = await rateLimit({
    clave: `global:${ipDe(req)}`,
    maximo: limiteMaximo,
    ventanaSegundos: 60,
  });
  if (!limite.permitido) {
    return NextResponse.json(
      { ok: false, error: "Demasiadas solicitudes. Intenta de nuevo más tarde." },
      { status: 429, headers: { "Retry-After": "60" } },
    );
  }

  return response;
}

export default withAuth(
  async function proxy(req: NextRequest): Promise<NextResponse> {
    const respuesta = await capaSeguridad(req);
    return respuesta ?? NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl;
        const isAuth = !!token;
        const isAuthPage = pathname.startsWith("/auth");

        if (isAuthPage) {
          return !isAuth;
        }

        const protectedRoutes = ["/lista", "/perfil", "/admin"];
        const isProtected = protectedRoutes.some((r) => pathname.startsWith(r));
        return isProtected ? isAuth : true;
      },
    },
  },
);

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon\\.ico|api/auth/).*)"],
};