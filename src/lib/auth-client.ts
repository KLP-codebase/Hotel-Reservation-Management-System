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

function setTokenCookie(token: string): void {
  document.cookie = `sn_token=${encodeURIComponent(token)}; path=/; SameSite=Lax; max-age=${8 * 3600}`;
}

function clearTokenCookie(): void {
  document.cookie = 'sn_token=; path=/; max-age=0';
}

export const authClient = {
  async login(dto: LoginDto): Promise<UserProfile> {
    const res = await apiFetch<{ data: { token: string; user: UserProfile } }>('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify(dto),
    });
    setTokenCookie(res.data.token);
    return res.data.user;
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
