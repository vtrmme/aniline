import Link from "next/link";
import Image from "next/image";
import { getLang } from "@/lib/i18n/get-lang";
import { t } from "@/lib/i18n/translations";

export default async function NotFound() {
  const lang = await getLang();
  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4 text-white">
      <div className="text-center">
        <div className="mb-6 flex justify-center">
          <Image src="/aniline-logo.png" alt="AniLine" width={160} height={54} className="h-16 w-auto opacity-80" />
        </div>
        <h1 className="text-7xl font-bold text-[var(--brand)]">404</h1>
        <p className="mt-4 text-xl text-gray-400">{t(lang, "notFoundTitle")}</p>
        <p className="mt-2 text-sm text-gray-500">{t(lang, "notFoundDesc")}</p>
        <Link href="/" className="btn-brand mt-6 inline-block rounded-full px-6 py-2.5 font-semibold">
          {t(lang, "backHome")}
        </Link>
      </div>
    </div>
  );
}