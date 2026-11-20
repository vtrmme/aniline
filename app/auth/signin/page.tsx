"use client";

import { Suspense } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import { LogIn } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

function SignInContent() {
  const searchParams = useSearchParams();
  const { t } = useLanguage();
  const callbackUrl = searchParams.get("callbackUrl") || "/";

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 text-white">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mb-4 flex justify-center">
            <Image src="/aniline-logo.png" alt="AniLine" width={200} height={68} priority className="h-20 w-auto" />
          </div>
          <p className="text-gray-400">{t("signInTitle")}</p>
        </div>

        <div className="glass-panel space-y-4 rounded-3xl p-6">
          <button
            onClick={() => signIn("google", { callbackUrl })}
            className="btn-brand flex w-full items-center justify-center gap-3 rounded-xl px-6 py-4 font-bold text-white"
          >
            <LogIn size={20} aria-hidden="true" />
            {t("signInGoogle")}
          </button>
          <p className="text-center text-xs text-gray-500">{t("signInHint")}</p>
        </div>
      </div>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={<div className="flex min-h-[calc(100vh-4rem)] items-center justify-center text-gray-400">...</div>}>
      <SignInContent />
    </Suspense>
  );
}