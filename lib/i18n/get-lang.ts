import { cookies } from "next/headers";
import type { Lang } from "@/lib/i18n/translations";

export async function getLang(): Promise<Lang> {
  try {
    const store = await cookies();
    const v = store.get("aniline-lang")?.value;
    return v === "en" ? "en" : "es";
  } catch {
    return "es";
  }
}