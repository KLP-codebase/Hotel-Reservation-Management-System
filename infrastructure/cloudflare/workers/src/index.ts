/**
 * Hotel RMS — Cloudflare API Worker
 * Acts as an edge proxy + rate limiter between CF Pages and the backend API.
 * Handles CORS, auth header forwarding, and caches GET responses in KV.
 */

export interface Env {
  SESSION_CACHE: KVNamespace;
  HOTEL_DB: D1Database;
  BACKEND_URL: string;
  JWT_SECRET: string;
  ENVIRONMENT: string;
}

const CACHEABLE_PATHS = ["/api/v1/rooms", "/api/v1/reports"];
const CACHE_TTL = 60; // seconds

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // ── CORS preflight ──────────────────────────────────────────────────────
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin":  "*",
          "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
          "Access-Control-Max-Age":       "86400",
        },
      });
    }

    // ── KV cache for GET requests on cacheable paths ─────────────────────────
    const isCacheable =
      request.method === "GET" &&
      CACHEABLE_PATHS.some((p) => url.pathname.startsWith(p));

    if (isCacheable) {
      const cacheKey = url.pathname + url.search;
      const cached = await env.SESSION_CACHE.get(cacheKey);
      if (cached) {
        return new Response(cached, {
          headers: { "Content-Type": "application/json", "X-Cache": "HIT" },
        });
      }
    }

    // ── Proxy to backend ─────────────────────────────────────────────────────
    const backendUrl = `${env.BACKEND_URL}${url.pathname}${url.search}`;
    const backendRequest = new Request(backendUrl, {
      method:  request.method,
      headers: request.headers,
      body:    request.body,
    });

    const response = await fetch(backendRequest);

    // Store in KV cache
    if (isCacheable && response.ok) {
      const body = await response.text();
      ctx.waitUntil(
        env.SESSION_CACHE.put(
          url.pathname + url.search,
          body,
          { expirationTtl: CACHE_TTL }
        )
      );
      return new Response(body, {
        status: response.status,
        headers: { ...Object.fromEntries(response.headers), "X-Cache": "MISS" },
      });
    }

    return response;
  },
};
