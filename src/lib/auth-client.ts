import { apiFetch } from './api-client';

export interface LoginDto {
  username: string;
  password: string;
}

export interface UserProfile {
  id:         string;
  username:   string;
  role:       string;
  firstName:  string;
  lastName:   string;
  email:      string;
  branchId:   string | null;
  branchName: string | null;
}

export interface LoginResponse {
  challengeRequired?: boolean;
  challengeId?: string;
  emailMasked?: string;
  devOtp?: string;
  role?: string;
  token?: string;
  user?: UserProfile;
}

export function setTokenCookie(token: string): void {
  document.cookie = `sn_token=${encodeURIComponent(token)}; path=/; SameSite=Lax; max-age=${8 * 3600}`;
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem("skynest_token", token);
    } catch {}
  }
}

export function clearTokenCookie(): void {
  document.cookie = "sn_token=; path=/; max-age=0";
  if (typeof window !== "undefined") {
    try {
      localStorage.removeItem("skynest_token");
    } catch {}
  }
}

export const authClient = {
  async login(dto: LoginDto): Promise<LoginResponse> {
    const res = await apiFetch<{ data: LoginResponse }>('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify(dto),
    });
    if (res.data.token) {
      setTokenCookie(res.data.token);
    }
    return res.data;
  },

  async checkChallenge(challengeId: string): Promise<{ status: 'PENDING' | 'APPROVED' | 'EXPIRED'; token?: string; user?: UserProfile }> {
    const res = await apiFetch<{ data: { status: 'PENDING' | 'APPROVED' | 'EXPIRED'; token?: string; user?: UserProfile } }>(
      `/api/v1/auth/login-challenge/${challengeId}`
    );
    if (res.data.status === 'APPROVED' && res.data.token) {
      setTokenCookie(res.data.token);
    }
    return res.data;
  },

  async verifyChallenge(payload: { challengeId?: string; token?: string; otpCode?: string }): Promise<{ status: string; token: string; user: UserProfile }> {
    const res = await apiFetch<{ data: { status: string; token: string; user: UserProfile } }>(
      '/api/v1/auth/login-challenge/verify',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    );
    if (res.data.token) {
      setTokenCookie(res.data.token);
    }
    return res.data;
  },

  async resendChallenge(challengeId: string): Promise<{ message: string }> {
    const res = await apiFetch<{ message: string }>(
      '/api/v1/auth/login-challenge/resend',
      {
        method: 'POST',
        body: JSON.stringify({ challengeId }),
      }
    );
    return res;
  },

  async logout(): Promise<void> {
    await apiFetch('/api/v1/auth/logout', { method: 'POST' }).catch(() => {});
    clearTokenCookie();
  },

  async me(): Promise<UserProfile> {
    const res = await apiFetch<{ data: UserProfile }>('/api/v1/auth/me');
    return res.data;
  },
};
