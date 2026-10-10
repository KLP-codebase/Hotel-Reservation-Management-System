'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, PropsWithChildren } from 'react';
import { authClient, UserProfile, LoginDto, LoginResponse, setTokenCookie } from '../lib/auth-client';

// ── GoF: Observer ─────────────────────────────────────────────────────────────
// AuthProvider is the Subject — holds auth state and notifies all consumers.
// Any component calling useAuth() is an Observer — it re-renders automatically
// whenever user state changes (login, logout, session restore).

interface AuthContextValue {
  user:       UserProfile | null;
  loading:    boolean;
  login:      (dto: LoginDto) => Promise<LoginResponse>;
  setSession: (profile: UserProfile, token: string) => void;
  logout:     () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<UserProfile | null>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('skynest_user');
        return cached ? JSON.parse(cached) : null;
      } catch {
        return null;
      }
    }
    return null;
  });
  const [loading, setLoading] = useState(true);

  // Restore session on mount
  useEffect(() => {
    authClient.me()
      .then((profile) => {
        setUser(profile);
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem('skynest_user', JSON.stringify(profile));
          } catch {}
        }
      })
      .catch(() => {
        setUser(null);
        if (typeof window !== 'undefined') {
          try {
            localStorage.removeItem('skynest_user');
          } catch {}
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (dto: LoginDto): Promise<LoginResponse> => {
    const res = await authClient.login(dto);
    if (res.user) {
      setUser(res.user);
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('skynest_user', JSON.stringify(res.user));
        } catch {}
      }
    }
    return res;
  }, []);

  const setSession = useCallback((profile: UserProfile, token: string) => {
    setTokenCookie(token);
    setUser(profile);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('skynest_user', JSON.stringify(profile));
      } catch {}
    }
  }, []);

  const logout = useCallback(async () => {
    await authClient.logout();
    setUser(null);
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('skynest_user');
      } catch {}
    }
    window.location.replace('/login');
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, setSession, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
