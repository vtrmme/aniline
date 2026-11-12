import NextAuth, { Session } from "next-auth"
import GoogleProvider from "next-auth/providers/google"

interface NextAuthToken {
  sub?: string
  name?: string | null
  email?: string | null
  picture?: string | null
}

const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
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
    async session({ session, token }: { session: Session; token: NextAuthToken }) {
      if (session.user) {
        ;(session.user as { id?: string }).id = token.sub ?? ""
      }
      return session
    },
  },
})

export { handler as GET, handler as POST }
