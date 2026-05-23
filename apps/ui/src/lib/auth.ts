import { type ClientProfile } from './api';

const TOKEN_KEY = 'cms_token';
const CLIENT_KEY = 'cms_client';

export function saveSession(token: string, client: ClientProfile): void {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(CLIENT_KEY, JSON.stringify(client));
}

export function clearSession(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(CLIENT_KEY);
}

export function getStoredClient(): ClientProfile | null {
  try {
    const raw = localStorage.getItem(CLIENT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function isLoggedIn(): boolean {
  return !!localStorage.getItem(TOKEN_KEY);
}
