// Worker portal access tokens stored in sessionStorage.
// Refresh tokens are httpOnly cookies set by the backend.

const WORKER_ACCESS_KEY = "nexflow_worker_access_token";
const WORKER_LOCALE_KEY = "nexflow_worker_locale";

export function getWorkerAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(WORKER_ACCESS_KEY);
}

export function storeWorkerAccessToken(token: string): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(WORKER_ACCESS_KEY, token);
}

export function clearWorkerTokens(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(WORKER_ACCESS_KEY);
}

export function isWorkerAuthenticated(): boolean {
  return !!getWorkerAccessToken();
}

export type WorkerLocale = "pl" | "uk";

export function getWorkerLocale(): WorkerLocale {
  if (typeof window === "undefined") return "pl";
  return (localStorage.getItem(WORKER_LOCALE_KEY) as WorkerLocale) ?? "pl";
}

export function setWorkerLocale(locale: WorkerLocale): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(WORKER_LOCALE_KEY, locale);
}
