// ── GoF: Facade ───────────────────────────────────────────────────────────────
// apiFetch wraps native fetch and hides: base URL, auth header injection,
// error normalisation. All data-fetching code uses this — never raw fetch.

/**
 * toNum — safe numeric coercion for PostgreSQL-originated values.
 *
 * The `pg` driver returns NUMERIC / DECIMAL columns as *strings* to preserve
 * precision. Any component that calls `.toFixed()` directly on such a value
 * will throw "toFixed is not a function" at runtime.
 *
 * Usage:  toNum(b.total_amount).toFixed(2)
 *         toNum(item.price_at_usage).toFixed(2)
 */
export function toNum(v: unknown): number {
  if (v === null || v === undefined) return 0;
  const n = Number(v);
  return isNaN(n) ? 0 : n;
}



export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

function getToken(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(/(?:^|;\s*)sn_token=([^;]*)/);
  if (match && match[1]) return decodeURIComponent(match[1]);
  try {
    return localStorage.getItem('skynest_token');
  } catch {
    return null;
  }
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const rawBase = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
  // Ensure base URL does not have trailing /api/v1 or trailing slashes
  const cleanBase = rawBase.replace(/\/api\/v1\/?$/, '').replace(/\/+$/, '');
  // Ensure path always targets /api/v1 if not already prefixed
  const normalizedPath = path.startsWith('/api/v1')
    ? path
    : `/api/v1${path.startsWith('/') ? path : `/${path}`}`;
  const token = getToken();

  const res = await fetch(`${cleanBase}${normalizedPath}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  const body = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new ApiError(
      res.status,
      body?.code   ?? 'UNKNOWN',
      body?.message ?? 'Request failed',
    );
  }

  return body as T;
}
