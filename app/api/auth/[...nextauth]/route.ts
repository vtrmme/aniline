import NextAuth, { type NextAuthOptions, type Session } from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import type { JWT } from "next-auth/jwt"
import type { Account, Profile as OAuthProfile, User } from "next-auth"
import { createServerClient } from "@/lib/supabase"

interface GoogleOAuthProfile extends OAuthProfile {
  email?: string
  name?: string
  picture?: string
  sub?: string
}

interface PerfilExistente {
  email: string | null
  name: string | null
  image: string | null
}

function textoONulo(valor: unknown): string | null {
  if (typeof valor === "string") {
    const limpio = valor.trim()
    return limpio.length > 0 ? limpio : null
  }
  return null
}

async function guardarPerfilGoogle(params: {
  userId: string
  email: string | null
  name: string | null
  image: string | null
}): Promise<void> {
  const supabase = createServerClient()
  const ahora = new Date().toISOString()

  const { data: existente } = await supabase
    .from("profiles")
    .select("email,name,image")
    .eq("user_id", params.userId)
    .maybeSingle<PerfilExistente>()

  const emailFinal = params.email ?? existente?.email ?? null
  const nameFinal = params.name ?? existente?.name ?? null
  const imageFinal = params.image ?? existente?.image ?? null

  const { error } = await supabase.from("profiles").upsert(
    {
      user_id: params.userId,
      email: emailFinal,
      name: nameFinal,
      image: imageFinal,
      provider: "google",
      updated_at: ahora,
      ...(existente ? {} : { created_at: ahora }),
    },
    { onConflict: "user_id" }
  )

  if (error) {
    console.error("Error guardando perfil de usuario:", error.message)
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: "openid email profile",
          prompt: "select_account",
        },
      },
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/auth/signin",
  },
  callbacks: {
    async signIn({
      user,
      account,
      profile,
    }: {
      user: User
      account: Account | null
      profile?: OAuthProfile
    }): Promise<boolean> {
      try {
        const googleProfile = profile as GoogleOAuthProfile | undefined
        const userId = textoONulo(account?.providerAccountId) ?? textoONulo(googleProfile?.sub) ?? textoONulo(user.id)
        if (!userId) {
          console.error("No se pudo determinar el identificador del usuario en el inicio de sesión.")
          return true
        }

        const email = textoONulo(googleProfile?.email) ?? textoONulo(user.email)
        const name = textoONulo(googleProfile?.name) ?? textoONulo(user.name)
        const image = textoONulo(googleProfile?.picture) ?? textoONulo(user.image)

        await guardarPerfilGoogle({ userId, email, name, image })
      } catch (err) {
        console.error("Error en callback signIn de NextAuth:", err)
      }
      return true
    },
    async jwt({
      token,
      user,
      account,
      profile,
    }: {
      token: JWT
      user?: User
      account?: Account | null
      profile?: OAuthProfile
    }): Promise<JWT> {
      if (account && user) {
        const googleProfile = profile as GoogleOAuthProfile | undefined
        token.sub = textoONulo(account.providerAccountId) ?? textoONulo(googleProfile?.sub) ?? token.sub
        token.email = textoONulo(googleProfile?.email) ?? textoONulo(user.email) ?? token.email ?? null
        token.name = textoONulo(googleProfile?.name) ?? textoONulo(user.name) ?? token.name ?? null
        token.picture = textoONulo(googleProfile?.picture) ?? textoONulo(user.image) ?? token.picture ?? null
      }
      return token
    },
    async session({ session, token }: { session: Session; token: JWT }): Promise<Session> {
      if (session.user) {
        session.user.id = token.sub ?? ""
        session.user.email = token.email ?? session.user.email ?? null
        session.user.name = token.name ?? session.user.name ?? null
        session.user.image = token.picture ?? session.user.image ?? null
      }
      return session
    },
  },
}

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }
