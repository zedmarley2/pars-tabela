import { NextResponse, type NextRequest } from 'next/server';

const SESSION_COOKIE = 'authjs.session-token';
const SESSION_COOKIE_SECURE = '__Secure-authjs.session-token';

function hasSessionCookie(req: NextRequest): boolean {
  return !!(req.cookies.get(SESSION_COOKIE)?.value || req.cookies.get(SESSION_COOKIE_SECURE)?.value);
}

export async function middleware(req: NextRequest) {
  const { nextUrl } = req;

  if (nextUrl.pathname.startsWith('/admin') && !nextUrl.pathname.startsWith('/admin/login')) {
    if (!hasSessionCookie(req)) {
      const loginUrl = new URL('/admin/login', nextUrl.origin);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
