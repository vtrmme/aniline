"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { AlertCircle, ArrowLeft } from "lucide-react"
import { cn } from "@/lib/utils"
import { useLanguage } from "@/contexts/LanguageContext"

type LangMessages = {
  Callback: string
  OAuthCallback: string
  OAuthSignIn: string
  OAuthCreateAccount: string
  EmailCreateAccount: string
  EmailSignIn: string
}

const errorMessages: Record<string, LangMessages> = {
  es: {
    Callback: "Error de autenticación con Google. Intenta de nuevo.",
    OAuthCallback: "No se pudo completar el inicio de sesión con Google.",
    OAuthSignIn: "No se pudo iniciar sesión con la cuenta de Google.",
    OAuthCreateAccount: "No se pudo crear la cuenta con Google.",
    EmailCreateAccount: "No se pudo crear la cuenta con el correo electrónico.",
    EmailSignIn: "No se pudo iniciar sesión con el correo electrónico.",
  },
  en: {
    Callback: "Google authentication error. Try again.",
    OAuthCallback: "Could not complete sign in with Google.",
    OAuthSignIn: "Could not sign in with your Google account.",
    OAuthCreateAccount: "Could not create account with Google.",
    EmailCreateAccount: "Could not create account with email.",
    EmailSignIn: "Could not sign in with email.",
  },
}

export default function AuthErrorPage() {
  const router = useRouter()
  const { lang } = useLanguage()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const err = params.get("error")
    if (err) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setError(err)
    }
  }, [])

  const messages = errorMessages[lang] ?? errorMessages["en"]
  const message =
    error && messages[error as keyof LangMessages]
      ? messages[error as keyof LangMessages]
      : lang === "es"
        ? "Error de autenticación desconocido"
        : "Unknown authentication error"

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0f0f0f] dark:bg-[#050505] text-white px-4">
      <div className="max-w-md w-full text-center">
        <div className="w-16 h-16 rounded-full bg-red-600/20 flex items-center justify-center mx-auto mb-6">
          <AlertCircle size={32} className="text-red-600" />
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">
          {lang === "es" ? "Error al iniciar sesión" : "Sign in error"}
        </h1>
        <p className="text-gray-400 mb-8">{message}</p>

        <div className="space-y-3">
          <button
            onClick={() => router.push("/")}
            className={cn(
              "w-full py-4 rounded-xl font-bold text-white transition bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-600 focus:ring-offset-2 focus:ring-offset-gray-900 dark:focus:ring-offset-gray-900"
            )}
          >
            <ArrowLeft size={18} className="mr-2" />
            {lang === "es" ? "Volver al inicio" : "Back to home"}
          </button>
          <button
            onClick={() => router.push("/auth/signin")}
            className={cn(
              "w-full py-4 rounded-xl font-bold text-gray-300 transition bg-gray-800 hover:bg-gray-700 border border-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
            )}
          >
            {lang === "es" ? "Intentar de nuevo" : "Try again"}
          </button>
        </div>
      </div>
    </div>
  )
}
