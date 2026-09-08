import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

// Edge runtime: burada asla lib/db.ts import edilmez.
// Askıya alma / impersonation kontrolleri lib/auth-context.ts:getSessionContext() içinde yapılır.
export default withAuth(
  function middleware(req) {
    if (
      req.nextUrl.pathname.startsWith('/admin') &&
      req.nextauth.token?.role !== 'super_admin'
    ) {
      return NextResponse.redirect(new URL('/app', req.url))
    }
    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
    pages: { signIn: '/login' },
  }
)

export const config = {
  matcher: ['/app/:path*', '/admin/:path*'],
}
