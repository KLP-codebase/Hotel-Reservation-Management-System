import { NextRequest, NextResponse } from 'next/server';

// ── GoF: Proxy ────────────────────────────────────────────────────────────────
// This middleware is the protection Proxy for all /dashboard/* routes.
// It intercepts requests BEFORE the real page (Subject) renders.
// Unauthenticated users are redirected to /login.
// Authenticated users hitting /login are redirected to /dashboard.

export function middleware(req: NextRequest) {
  const token       = req.cookies.get('sn_token')?.value;
  const path        = req.nextUrl.pathname;
  const isProtected = path === '/dashboard' || path.startsWith('/dashboard/') || path === '/staff' || path === '/branches';
  const isAuthPage  = path === '/login' || path === '/register';

  let role = '';
  if (token) {
    try {
      const parts = token.split('.');
      if (parts.length === 3) {
        const payloadStr = atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'));
        const payload = JSON.parse(payloadStr);
        role = payload.role || '';
      }
    } catch {
      // fallback if token decoding fails
    }
  }

  const isGuest = role.toUpperCase() === 'GUEST';

  if (!token && isProtected) {
    const loginUrl = new URL('/login', req.url);
    const res = NextResponse.redirect(loginUrl);
    res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.headers.set('Pragma', 'no-cache');
    res.headers.set('Expires', '0');
    return res;
  }

  if (token && isGuest && isProtected) {
    const mainPageUrl = new URL('/', req.url);
    const res = NextResponse.redirect(mainPageUrl);
    res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    return res;
  }

  if (token && isAuthPage) {
    const targetUrl = isGuest ? new URL('/', req.url) : new URL('/dashboard', req.url);
    const res = NextResponse.redirect(targetUrl);
    res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    return res;
  }

  const res = NextResponse.next();
  if (isProtected) {
    res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.headers.set('Pragma', 'no-cache');
    res.headers.set('Expires', '0');
  }
  return res;
}

export const config = {
  matcher: ['/dashboard', '/dashboard/:path*', '/staff', '/branches', '/login', '/register'],
};

