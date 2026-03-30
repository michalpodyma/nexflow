// Access tokens are stored in sessionStorage (cleared on tab close, not persisted).
// Refresh tokens are stored in an httpOnly cookie managed by the backend —
// they are never accessible to JavaScript.

const ACCESS_KEY = "nexflow_access_token";

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(ACCESS_KEY);
}

export function storeAccessToken(accessToken: string): void {
  sessionStorage.setItem(ACCESS_KEY, accessToken);
}

export function clearTokens(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(ACCESS_KEY);
}

export function isAuthenticated(): boolean {
  return !!getAccessToken();
}
