import axios from "axios";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

export const apiClient = axios.create({
  baseURL: API_BASE,
  headers: { "Content-Type": "application/json" },
  withCredentials: true,
});

// ── Request interceptor — attach auth token ────────────────────────────────────
apiClient.interceptors.request.use((config) => {
  // Token is managed by NextAuth session cookies (httpOnly)
  return config;
});

// ── Response interceptor — handle errors globally ─────────────────────────────
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (typeof window !== "undefined") {
        window.location.href = "/auth/login";
      }
    }
    return Promise.reject(error);
  }
);
