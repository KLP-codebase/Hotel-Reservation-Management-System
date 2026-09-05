'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, PropsWithChildren } from 'react';
import { authClient, UserProfile, LoginDto } from '../lib/auth-client';

// ── GoF: Observer ─────────────────────────────────────────────────────────────
// AuthProvider is the Subject — holds auth state and notifies all consumers.
// Any component calling useAuth() is an Observer — it re-renders automatically
// whenever user state changes (login, logout, session restore).

interface AuthContextValue {
  user:    UserProfile | null;
  loading: boolean;
  login:   (dto: LoginDto) => Promise<UserProfile>;
  logout:  () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [user,    setUser]    = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Restore session on mount
  useEffect(() => {
    authClient.me()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (dto: LoginDto): Promise<UserProfile> => {
    const profile = await authClient.login(dto);
    setUser(profile); // Notifies all useAuth() Observers
    return profile;
  }, []);

  const logout = useCallback(async () => {
    await authClient.logout();
    setUser(null); // Notifies all useAuth() Observers
    window.location.replace('/login');
  }, []);


  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
