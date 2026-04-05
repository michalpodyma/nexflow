/**
 * Worker self-service portal API client.
 *
 * All requests use worker-scoped JWTs. Refresh is handled via httpOnly cookie.
 * On 401, attempts one refresh then redirects to /worker/login on failure.
 */

import { clearWorkerTokens, getWorkerAccessToken, storeWorkerAccessToken } from "@/lib/worker-auth";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const WORKER_BASE = `${BASE_URL}/api/v1/worker`;

class WorkerApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "WorkerApiError";
  }
}

async function refreshWorkerToken(): Promise<string | null> {
  const res = await fetch(`${WORKER_BASE}/auth/refresh`, {
    method: "POST",
    credentials: "include",
  });
  if (!res.ok) {
    clearWorkerTokens();
    return null;
  }
  const data: { access_token: string } = await res.json();
  storeWorkerAccessToken(data.access_token);
  return data.access_token;
}

async function workerRequest<T>(path: string, init: RequestInit = {}, retry = true): Promise<T> {
  const token = getWorkerAccessToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init.headers as Record<string, string>),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${WORKER_BASE}${path}`, {
    ...init,
    headers,
    credentials: "include",
  });

  if (res.status === 401 && retry) {
    const newToken = await refreshWorkerToken();
    if (newToken) return workerRequest<T>(path, init, false);
    if (typeof window !== "undefined") window.location.href = "/worker/login";
    throw new WorkerApiError(401, "Unauthorized");
  }

  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = body.detail ?? detail;
    } catch {
      // non-JSON body
    }
    throw new WorkerApiError(res.status, detail);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface WorkerProfile {
  id: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  email: string | null;
  nationality: string | null;
  bank_account: string | null;
  attendance_status: string;
  gdpr_consent: boolean;
  gdpr_consent_at: string | null;
}

export interface ComplianceWarning {
  alert_type: string;
  due_date: string;
  days_remaining: number;
}

export interface CurrentAssignment {
  id: string;
  client_name: string;
  position: string;
  start_date: string;
  end_date: string | null;
  worker_rate: string;
}

export interface NextShift {
  id: string;
  shift_date: string;
  start_dt: string;
  end_dt: string;
  client_name: string;
  notes: string | null;
}

export interface DashboardData {
  worker_name: string;
  current_assignment: CurrentAssignment | null;
  next_shift: NextShift | null;
  compliance_warnings: ComplianceWarning[];
}

export interface PayslipPeriod {
  year: number;
  month: number;
  total_hours: string;
  total_pay: string;
  currency: string;
}

export interface PayslipDay {
  work_date: string;
  hours_worked: string;
  overtime_hours: string;
  daily_pay: string;
}

export interface PayslipDetail {
  year: number;
  month: number;
  worker_rate: string;
  total_hours: string;
  overtime_hours: string;
  total_pay: string;
  currency: string;
  days: PayslipDay[];
}

export interface UpcomingShift {
  id: string;
  shift_date: string;
  start_dt: string;
  end_dt: string;
  client_name: string;
  notes: string | null;
}

export interface DocumentSummary {
  id: string;
  template_name: string;
  status: string;
  created_at: string;
  has_pdf: boolean;
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export async function workerRequestOtp(phone: string): Promise<void> {
  const res = await fetch(`${WORKER_BASE}/auth/request-otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone }),
    credentials: "include",
  });
  if (res.status === 429) throw new WorkerApiError(429, "too_many_attempts");
  // 204 always returned (even if phone not found — anti-enumeration)
}

export async function workerVerifyOtp(phone: string, code: string): Promise<string> {
  const res = await fetch(`${WORKER_BASE}/auth/verify-otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone, code }),
    credentials: "include",
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new WorkerApiError(res.status, body.detail ?? "invalid_code");
  }
  const data: { access_token: string } = await res.json();
  storeWorkerAccessToken(data.access_token);
  return data.access_token;
}

export async function workerLogout(): Promise<void> {
  await fetch(`${WORKER_BASE}/auth/logout`, {
    method: "POST",
    credentials: "include",
  }).catch(() => {});
  clearWorkerTokens();
}

// ---------------------------------------------------------------------------
// Profile
// ---------------------------------------------------------------------------

export async function getWorkerProfile(): Promise<WorkerProfile> {
  return workerRequest<WorkerProfile>("/me");
}

export async function updateWorkerProfile(data: {
  phone?: string;
  email?: string;
  bank_account?: string;
}): Promise<WorkerProfile> {
  return workerRequest<WorkerProfile>("/me", {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function requestGdprDeletion(): Promise<void> {
  return workerRequest<void>("/me/gdpr", { method: "DELETE" });
}

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

export async function getWorkerDashboard(): Promise<DashboardData> {
  return workerRequest<DashboardData>("/dashboard");
}

// ---------------------------------------------------------------------------
// Payslips
// ---------------------------------------------------------------------------

export async function listPayslips(): Promise<PayslipPeriod[]> {
  return workerRequest<PayslipPeriod[]>("/payslips");
}

export async function getPayslip(year: number, month: number): Promise<PayslipDetail> {
  return workerRequest<PayslipDetail>(`/payslips/${year}/${month}`);
}

// ---------------------------------------------------------------------------
// Schedule
// ---------------------------------------------------------------------------

export async function getWorkerSchedule(): Promise<UpcomingShift[]> {
  return workerRequest<UpcomingShift[]>("/schedule");
}

// ---------------------------------------------------------------------------
// Documents
// ---------------------------------------------------------------------------

export async function listWorkerDocuments(): Promise<DocumentSummary[]> {
  return workerRequest<DocumentSummary[]>("/documents");
}

export function getWorkerDocumentDownloadUrl(docId: string): string {
  return `${WORKER_BASE}/documents/${docId}/download`;
}
