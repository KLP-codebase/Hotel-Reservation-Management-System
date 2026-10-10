import { NextRequest, NextResponse } from 'next/server';

// ── GoF: Proxy ────────────────────────────────────────────────────────────────
// This middleware is the protection Proxy for all /dashboard/* routes.
// Intercepts requests BEFORE the real page (Subject) renders.
// Unauthenticated users are redirected to /login.
// Guests are granted access to /dashboard/activity and redirected there from staff dashboard routes.

export function middleware(req: NextRequest) {
  const token       = req.cookies.get('sn_token')?.value;
  const path        = req.nextUrl.pathname;
  const isProtected = path === '/dashboard' || path.startsWith('/dashboard/') || path === '/staff' || path === '/branches';
  const isAuthPage  = path === '/login' || path === '/register';
  const isGuestActivity = path === '/dashboard/activity' || path.startsWith('/dashboard/activity');

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

  // 1. Unauthenticated users trying to access protected routes -> /login
  if (!token && isProtected) {
    const loginUrl = new URL('/login', req.url);
    const res = NextResponse.redirect(loginUrl);
    res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.headers.set('Pragma', 'no-cache');
    res.headers.set('Expires', '0');
    return res;
  }

  // 2. Guests accessing staff-only dashboard routes -> redirect to their Activity page
  if (token && isGuest && isProtected && !isGuestActivity) {
    const activityUrl = new URL('/dashboard/activity', req.url);
    const res = NextResponse.redirect(activityUrl);
    res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    return res;
  }

  // 3. Authenticated users hitting /login or /register -> redirect to appropriate portal
  if (token && isAuthPage) {
    const targetUrl = isGuest ? new URL('/dashboard/activity', req.url) : new URL('/dashboard', req.url);
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
