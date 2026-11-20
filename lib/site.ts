export function getSiteUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL;
  if (fromEnv && fromEnv.trim().length > 0) {
    return fromEnv.trim().replace(/\/$/, "");
  }
  if (process.env.VERCEL_URL && process.env.VERCEL_URL.trim().length > 0) {
    return `https://${process.env.VERCEL_URL.trim()}`;
  }
  return "http://localhost:3000";
}

export const siteConfig = {
  name: "AniLine",
  description: "Ver anime online gratis en español e inglés",
} as const;
