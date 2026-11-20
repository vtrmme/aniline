"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, ArrowLeft } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import type { TranslationKey } from "@/lib/i18n/translations";

const errorKeyMap: Record<string, TranslationKey> = {
  Callback: "authCallback",
  OAuthCallback: "authOAuthCallback",
  OAuthSignin: "authOAuthSignin",
  OAuthSignIn: "authOAuthSignin",
  OAuthCreateAccount: "authOAuthCreate",
  OAuthAccountNotLinked: "authOAuthLinked",
  AccessDenied: "authDenied",
  Configuration: "authConfig",
  Verification: "authVerification",
};

function ErrorContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useLanguage();
  const error = searchParams.get("error");
  const key = (error && errorKeyMap[error]) || "authErrorDefault";
  const message = t(key);

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 text-white">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-red-600/20">
          <AlertCircle size={32} className="text-red-500" aria-hidden="true" />
        </div>
        <h1 className="mb-2 text-2xl font-bold text-white">{t("authErrorTitle")}</h1>
        <p className="mb-8 text-gray-400">{message}</p>

        <div className="space-y-3">
          <button onClick={() => router.push("/auth/signin")} className="btn-brand w-full rounded-xl px-6 py-3 font-semibold">
            {t("authErrorTryAgain")}
          </button>
          <button
            onClick={() => router.push("/")}
            className="btn-ghost inline-flex w-full items-center justify-center gap-2 rounded-xl px-6 py-3 font-semibold"
          >
            <ArrowLeft size={18} aria-hidden="true" />
            {t("backHome")}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AuthErrorPage() {
  return (
    <Suspense fallback={<div className="flex min-h-[calc(100vh-4rem)] items-center justify-center text-gray-400">...</div>}>
      <ErrorContent />
    </Suspense>
  );
}