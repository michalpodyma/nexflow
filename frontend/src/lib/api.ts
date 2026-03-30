import { clearTokens, getAccessToken, getRefreshToken, storeTokens } from "@/lib/auth";
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
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;

  const res = await fetch(`${BASE_URL}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });

  if (!res.ok) {
    clearTokens();
    return null;
  }

  const tokens: TokenResponse = await res.json();
  storeTokens(tokens);
  return tokens.access_token;
}

async function request<T>(path: string, init: RequestInit = {}, retry = true): Promise<T> {
  const token = getAccessToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init.headers as Record<string, string>),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, { ...init, headers });

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
    const detail = await res.text();
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
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) throw new ApiError(res.status, "Invalid credentials");
  return res.json();
}

export async function logout(refreshToken: string): Promise<void> {
  await fetch(`${BASE_URL}/auth/logout`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
}

// Candidates
export function getCandidates(page = 1, pageSize = 20): Promise<Paginated<Candidate>> {
  return request<Paginated<Candidate>>(`/api/v1/candidates?page=${page}&page_size=${pageSize}`);
}

export function createCandidate(data: CandidateCreate): Promise<Candidate> {
  return request<Candidate>("/api/v1/candidates", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// Workers
export function getWorkers(page = 1, pageSize = 20): Promise<Paginated<Worker>> {
  return request<Paginated<Worker>>(`/api/v1/workers?page=${page}&page_size=${pageSize}`);
}

// Clients
export function getClients(page = 1, pageSize = 20): Promise<Paginated<Client>> {
  return request<Paginated<Client>>(`/api/v1/clients?page=${page}&page_size=${pageSize}`);
}
