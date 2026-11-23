const ADMIN_TOKEN_KEY = 'sb_admin_token';

export function getAdminToken(): string | null {
  return localStorage.getItem(ADMIN_TOKEN_KEY);
}

export function setAdminToken(token: string) {
  localStorage.setItem(ADMIN_TOKEN_KEY, token);
}

export function clearAdminToken() {
  localStorage.removeItem(ADMIN_TOKEN_KEY);
}

export async function apiRequest<T = any>(
  url: string,
  options: RequestInit = {},
  useAdminAuth = false
): Promise<T> {
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = headers['Content-Type'] || 'application/json';
  }

  if (useAdminAuth) {
    const token = getAdminToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  const res = await fetch(url, { ...options, headers });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    if (res.status === 401 && useAdminAuth) {
      clearAdminToken();
    }
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data as T;
}
