import { withAuth } from "next-auth/middleware"

export default withAuth({
  callbacks: {
    authorized: ({ token, req }) => {
      const { pathname } = req.nextUrl
      const isAuth = !!token
      const isAuthPage = pathname.startsWith("/auth")

      if (isAuthPage) {
        return !isAuth
      }

      const protectedRoutes = ["/lista", "/perfil", "/anime"]
      const isProtected = protectedRoutes.some((r) => pathname.startsWith(r))
      return isProtected ? isAuth : true
    },
  },
})

export const config = {
  matcher: ["/lista/:path*", "/perfil/:path*", "/anime/:path*", "/auth/:path*"],
}
