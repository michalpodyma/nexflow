import { clearTokens, getAccessToken, storeAccessToken } from "@/lib/auth";
import type { Candidate, CandidateCreate, Client, Paginated, TokenResponse, Worker } from "@/types/api";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function refreshAccessToken(): Promise<string | null> {
  // The httpOnly refresh cookie is sent automatically via credentials: "include"
  const res = await fetch(`${BASE_URL}/auth/refresh`, {
    method: "POST",
    credentials: "include",
  });

  if (!res.ok) {
    clearTokens();
    return null;
  }

  const tokens: TokenResponse = await res.json();
  storeAccessToken(tokens.access_token);
  return tokens.access_token;
}

async function request<T>(path: string, init: RequestInit = {}, retry = true): Promise<T> {
  const token = getAccessToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init.headers as Record<string, string>),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers,
    credentials: "include",
  });

  if (res.status === 401 && retry) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      return request<T>(path, init, false);
    }
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
    throw new ApiError(401, "Unauthorized");
  }

  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = body.detail ?? detail;
    } catch {
      // non-JSON error body — use statusText
    }
    throw new ApiError(res.status, detail);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

// Auth
export async function login(username: string, password: string): Promise<TokenResponse> {
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) throw new ApiError(res.status, "Invalid credentials");
  return res.json();
}

export async function logout(): Promise<void> {
  await fetch(`${BASE_URL}/auth/logout`, {
    method: "POST",
    credentials: "include",
  });
  clearTokens();
}

// Candidates
export function getCandidates(page = 1, pageSize = 20): Promise<Paginated<Candidate>> {
  const params = new URLSearchParams({ page: String(page), page_size: String(pageSize) });
  return request<Paginated<Candidate>>(`/api/v1/candidates?${params}`);
}

export function createCandidate(data: CandidateCreate): Promise<Candidate> {
  return request<Candidate>("/api/v1/candidates", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// Intake form submission — calls the Next.js API route which orchestrates
// backend persist + HubSpot sync + confirmation email.
export async function submitCandidateIntake(
  data: CandidateCreate,
  locale: string,
): Promise<Candidate> {
  const res = await fetch("/api/candidate-intake", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...data, locale }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { error?: string };
    throw new ApiError(res.status, body.error ?? "Submission failed");
  }
  return res.json() as Promise<Candidate>;
}

// Workers
export function getWorkers(page = 1, pageSize = 20): Promise<Paginated<Worker>> {
  const params = new URLSearchParams({ page: String(page), page_size: String(pageSize) });
  return request<Paginated<Worker>>(`/api/v1/workers?${params}`);
}

// Clients
export function getClients(page = 1, pageSize = 20): Promise<Paginated<Client>> {
  const params = new URLSearchParams({ page: String(page), page_size: String(pageSize) });
  return request<Paginated<Client>>(`/api/v1/clients?${params}`);
}
