import { NextRequest, NextResponse } from 'next/server';

// ── GoF: Proxy ────────────────────────────────────────────────────────────────
// This middleware is the protection Proxy for all /dashboard/* routes.
// Intercepts requests BEFORE the real page (Subject) renders.
// Cryptographically verifies JWT signatures using Edge-compatible Web Crypto.
// Unauthenticated or forged sessions are redirected to /login.
// Guests are granted access to /dashboard/activity and redirected there from staff routes.

async function verifyJwt(token: string, secret: string): Promise<{ role?: string; sub?: string } | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [headerB64, payloadB64, sigB64] = parts;

    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      enc.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    // Base64Url decode signature to binary Uint8Array
    const sigStr = atob(sigB64.replace(/-/g, '+').replace(/_/g, '/'));
    const sigBytes = Uint8Array.from(sigStr, (c) => c.charCodeAt(0));
    const dataBytes = enc.encode(`${headerB64}.${payloadB64}`);

    const isValid = await crypto.subtle.verify('HMAC', key, sigBytes, dataBytes);
    if (!isValid) return null;

    const payloadStr = atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/'));
    const payload = JSON.parse(payloadStr);

    if (payload.exp && Date.now() >= payload.exp * 1000) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export async function middleware(req: NextRequest) {
  const token = req.cookies.get('sn_token')?.value;
  const path = req.nextUrl.pathname;
  const isProtected = path === '/dashboard' || path.startsWith('/dashboard/') || path === '/staff' || path === '/branches';
  const isAuthPage = path === '/login' || path === '/register';
  const isGuestActivity = path === '/dashboard/activity' || path.startsWith('/dashboard/activity');

  const secret = process.env.JWT_SECRET || 'skynest-dev-secret-change-before-any-shared-env';
  const payload = token ? await verifyJwt(token, secret) : null;
  const isAuthenticated = Boolean(payload);
  const role = payload?.role || '';
  const isGuest = role.toUpperCase() === 'GUEST';

  // 1. Unauthenticated users (or forged/expired tokens) accessing protected routes -> /login
  if (!isAuthenticated && isProtected) {
    const loginUrl = new URL('/login', req.url);
    const res = NextResponse.redirect(loginUrl);
    res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.headers.set('Pragma', 'no-cache');
    res.headers.set('Expires', '0');
    if (token) {
      res.cookies.delete('sn_token');
    }
    return res;
  }

  // 2. Authenticated Guests accessing staff-only dashboard routes -> redirect to their Activity page
  if (isAuthenticated && isGuest && isProtected && !isGuestActivity) {
    const activityUrl = new URL('/dashboard/activity', req.url);
    const res = NextResponse.redirect(activityUrl);
    res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    return res;
  }

  // 2b. Authenticated Staff (Admin, Manager, Receptionist, DBA) accessing guest activity -> redirect to /dashboard
  if (isAuthenticated && !isGuest && isGuestActivity) {
    const dashUrl = new URL('/dashboard', req.url);
    const res = NextResponse.redirect(dashUrl);
    res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    return res;
  }

  // 3. Authenticated users hitting /login or /register -> redirect to appropriate portal
  if (isAuthenticated && isAuthPage) {
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
