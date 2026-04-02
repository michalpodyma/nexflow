import { clearTokens, getAccessToken, storeAccessToken } from "@/lib/auth";
import type { AnalyticsOverview, AttendanceStatus, Candidate, CandidateCreate, CandidateReminder, Client, DueRemindersCount, JobOrder, JobOrderCreate, JobOrderStatus, JobOrderUpdate, JobPosting, Paginated, TokenResponse, Worker, WorkerDetail, WorkerUpdate } from "@/types/api";

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

export function updateCandidate(
  id: string,
  data: { notes?: string | null; screening_status?: string; job_posting_id?: string | null; contacted_at?: string | null },
): Promise<Candidate> {
  return request<Candidate>(`/api/v1/candidates/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export function bulkUpdateCandidates(body: {
  candidate_ids: string[];
  action: "set_status" | "assign_posting" | "mark_contacted";
  status_value?: string;
  job_posting_id?: string;
}): Promise<Candidate[]> {
  return request<Candidate[]>("/api/v1/candidates/bulk-update", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function getDueRemindersCount(): Promise<DueRemindersCount> {
  return request<DueRemindersCount>("/api/v1/candidates/reminders/due");
}

export function getCandidateReminders(candidateId: string): Promise<CandidateReminder[]> {
  return request<CandidateReminder[]>(`/api/v1/candidates/${candidateId}/reminders`);
}

export function createCandidateReminder(
  candidateId: string,
  data: { reminder_date: string; reminder_text: string },
): Promise<CandidateReminder> {
  return request<CandidateReminder>(`/api/v1/candidates/${candidateId}/reminders`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function dismissCandidateReminder(
  candidateId: string,
  reminderId: string,
): Promise<CandidateReminder> {
  return request<CandidateReminder>(
    `/api/v1/candidates/${candidateId}/reminders/${reminderId}`,
    { method: "PATCH", body: JSON.stringify({ dismissed: true }) },
  );
}

// Intake form submission — calls the Next.js API route which orchestrates
// backend persist + HubSpot sync + CV upload + confirmation email.
export async function submitCandidateIntake(
  data: CandidateCreate,
  locale: string,
  cvFile?: File,
): Promise<Candidate> {
  const fd = new FormData();
  fd.append("first_name", data.first_name);
  fd.append("last_name", data.last_name);
  fd.append("phone", data.phone);
  if (data.email) fd.append("email", data.email);
  fd.append("nationality", data.nationality);
  fd.append("availability_from", data.availability_from);
  fd.append("preferred_position", data.preferred_position);
  data.languages.forEach((l) => fd.append("languages", l));
  if (data.location_preference) fd.append("location_preference", data.location_preference);
  if (data.document_type) fd.append("document_type", data.document_type);
  fd.append("gdpr_consent", String(data.gdpr_consent));
  fd.append("gdpr_consent_at", data.gdpr_consent_at);
  fd.append("locale", locale);
  if (cvFile) fd.append("cv_file", cvFile, cvFile.name);

  const res = await fetch("/api/candidate-intake", {
    method: "POST",
    body: fd,
    // No Content-Type header — browser sets multipart boundary automatically
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { error?: string };
    throw new ApiError(res.status, body.error ?? "Submission failed");
  }
  return res.json() as Promise<Candidate>;
}

// Job Postings
export function getJobPostings(): Promise<Paginated<JobPosting>> {
  return request<Paginated<JobPosting>>("/api/v1/job-postings");
}

// Workers
export function getWorkers(page = 1, pageSize = 20, expiringDocs = false): Promise<Paginated<Worker>> {
  const params = new URLSearchParams({ page: String(page), page_size: String(pageSize) });
  if (expiringDocs) params.set("expiring_docs", "true");
  return request<Paginated<Worker>>(`/api/v1/workers?${params}`);
}

export function getWorker(workerId: string): Promise<WorkerDetail> {
  return request<WorkerDetail>(`/api/v1/workers/${workerId}`);
}

export function updateWorker(workerId: string, data: WorkerUpdate): Promise<Worker> {
  return request<Worker>(`/api/v1/workers/${workerId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export function updateWorkerAttendanceStatus(
  workerId: string,
  attendance_status: AttendanceStatus,
): Promise<Worker> {
  return updateWorker(workerId, { attendance_status });
}

// Clients
export function getClients(page = 1, pageSize = 20): Promise<Paginated<Client>> {
  const params = new URLSearchParams({ page: String(page), page_size: String(pageSize) });
  return request<Paginated<Client>>(`/api/v1/clients?${params}`);
}

// Analytics
export function getAnalyticsOverview(): Promise<AnalyticsOverview> {
  return request<AnalyticsOverview>("/api/v1/analytics/overview");
}

// Job Orders
export function getJobOrders(filters?: { status?: JobOrderStatus; client_id?: string }): Promise<Paginated<JobOrder>> {
  const params = new URLSearchParams({ page: "1", page_size: "200" });
  if (filters?.status) params.set("status", filters.status);
  if (filters?.client_id) params.set("client_id", filters.client_id);
  return request<Paginated<JobOrder>>(`/api/v1/job-orders?${params}`);
}

export function createJobOrder(data: JobOrderCreate): Promise<JobOrder> {
  return request<JobOrder>("/api/v1/job-orders", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateJobOrder(id: string, data: JobOrderUpdate): Promise<JobOrder> {
  return request<JobOrder>(`/api/v1/job-orders/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}
