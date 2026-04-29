import { clearTokens, getAccessToken, storeAccessToken } from "@/lib/auth";
import type { AccommodationAssignment, AccommodationCreate, AccommodationDetail, AccommodationUpdate, AlertSeverity, AnalyticsOverview, B2BAnalytics, RecruiterAnalytics, AssignmentCreate, AssignmentUpdate, AttendanceStatus, CalendarEntry, Candidate, CandidateCreate, CandidateJobOrder, CandidateJobOrderCreate, CandidateJobOrderUpdate, CandidateReminder, Client, ClientCreate, ClientUpdate, ClientActivity, ClientActivityCreate, ClientContact, ClientContactCreate, ClientContactUpdate, ComplianceAlertsResponse, ComplianceDocumentType, ConvertProspectResponse, DueRemindersCount, JobOrder, JobOrderCreate, JobOrderStatus, JobOrderUpdate, JobPosting, Paginated, Prospect, ProspectCreate, ProspectStatus, ProspectSource, ProspectUpdate, TokenResponse, Accommodation, Worker, WorkerCreate, WorkerDetail, WorkerUpdate, Vehicle, VehicleCreate, VehicleUpdate, TransportRoute, RouteCreate, RouteUpdate, TransportAssignment, RoutePassenger, DocumentTemplate, DocumentTemplateDetail, DocumentTemplateCreate, DocumentTemplateUpdate, GeneratedDocument, GeneratedDocumentDetail, GenerateDocumentRequest, LegalizationStatusUpdate, WorkerFile, WorkerFileDocumentType, WorkerFileDownloadResponse, WorkerAccommodationEntry, HoursImportBatch, ColumnMappingItem, ColumnMappingRead, UploadResponse, PreviewResponse, CommitResponse, Invoice, InvoiceWithLineItems, InvoiceUpdate, ShiftTemplate, ShiftTemplateCreate, ShiftTemplateUpdate, ShiftEntry, ShiftEntryCreate, ConflictCheckResult, CapacitySlot } from "@/types/api";

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
  if (data.referred_by) fd.append("referred_by", data.referred_by);
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
export function getWorkers(
  page = 1,
  pageSize = 20,
  expiringDocs = false,
  showArchived = false,
  q?: string,
): Promise<Paginated<Worker>> {
  const params = new URLSearchParams({ page: String(page), page_size: String(pageSize) });
  if (expiringDocs) params.set("expiring_docs", "true");
  if (showArchived) params.set("show_archived", "true");
  if (q) params.set("q", q);
  return request<Paginated<Worker>>(`/api/v1/workers?${params}`);
}

export function createWorker(data: WorkerCreate): Promise<Worker> {
  return request<Worker>("/api/v1/workers", {
    method: "POST",
    body: JSON.stringify(data),
  });
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

export function archiveWorker(workerId: string): Promise<Worker> {
  return request<Worker>(`/api/v1/workers/${workerId}/archive`, { method: "PATCH" });
}

export function restoreWorker(workerId: string): Promise<Worker> {
  return request<Worker>(`/api/v1/workers/${workerId}/restore`, { method: "PATCH" });
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

export function getClient(id: string): Promise<Client> {
  return request<Client>(`/api/v1/clients/${id}`);
}

export function createClient(data: ClientCreate): Promise<Client> {
  return request<Client>("/api/v1/clients", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateClient(id: string, data: ClientUpdate): Promise<Client> {
  return request<Client>(`/api/v1/clients/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export function getClientActivities(
  clientId: string,
  page = 1,
  pageSize = 20,
): Promise<Paginated<ClientActivity>> {
  const params = new URLSearchParams({ page: String(page), page_size: String(pageSize) });
  return request<Paginated<ClientActivity>>(`/api/v1/clients/${clientId}/activities?${params}`);
}

export function createClientActivity(
  clientId: string,
  data: ClientActivityCreate,
): Promise<ClientActivity> {
  return request<ClientActivity>(`/api/v1/clients/${clientId}/activities`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function getClientContacts(clientId: string): Promise<ClientContact[]> {
  return request<ClientContact[]>(`/api/v1/clients/${clientId}/contacts`);
}

export function createClientContact(
  clientId: string,
  data: ClientContactCreate,
): Promise<ClientContact> {
  return request<ClientContact>(`/api/v1/clients/${clientId}/contacts`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateClientContact(
  clientId: string,
  contactId: string,
  data: ClientContactUpdate,
): Promise<ClientContact> {
  return request<ClientContact>(`/api/v1/clients/${clientId}/contacts/${contactId}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export function deleteClientContact(clientId: string, contactId: string): Promise<void> {
  return request<void>(`/api/v1/clients/${clientId}/contacts/${contactId}`, {
    method: "DELETE",
  });
}

// Analytics
export function getAnalyticsOverview(): Promise<AnalyticsOverview> {
  return request<AnalyticsOverview>("/api/v1/analytics/overview");
}

export function getRecruiterAnalytics(): Promise<RecruiterAnalytics> {
  return request<RecruiterAnalytics>("/api/v1/analytics/recruiter");
}

export function getB2BAnalytics(): Promise<B2BAnalytics> {
  return request<B2BAnalytics>("/api/v1/analytics/b2b");
}

// Compliance
export function getComplianceAlerts(filters?: {
  severity?: AlertSeverity;
  document_type?: ComplianceDocumentType;
}): Promise<ComplianceAlertsResponse> {
  const params = new URLSearchParams();
  if (filters?.severity) params.set("severity", filters.severity);
  if (filters?.document_type) params.set("document_type", filters.document_type);
  const qs = params.toString();
  return request<ComplianceAlertsResponse>(`/api/v1/compliance/alerts${qs ? `?${qs}` : ""}`);
}

export function renewComplianceDocument(data: {
  worker_id: string;
  document_type: ComplianceDocumentType;
  new_expiry_date: string;
}): Promise<{ worker_id: string; document_type: ComplianceDocumentType; new_expiry_date: string }> {
  return request("/api/v1/compliance/renew", {
    method: "POST",
    body: JSON.stringify(data),
  });
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

// Candidate ↔ Job Order links
export function getCandidateJobOrders(candidateId: string): Promise<Paginated<CandidateJobOrder>> {
  return request<Paginated<CandidateJobOrder>>(`/api/v1/candidates/${candidateId}/job-orders`);
}

export function assignCandidateToJobOrder(
  candidateId: string,
  data: CandidateJobOrderCreate,
): Promise<CandidateJobOrder> {
  return request<CandidateJobOrder>(`/api/v1/candidates/${candidateId}/job-orders`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateCandidateJobOrderStatus(
  candidateId: string,
  jobOrderId: string,
  data: CandidateJobOrderUpdate,
): Promise<CandidateJobOrder> {
  return request<CandidateJobOrder>(`/api/v1/candidates/${candidateId}/job-orders/${jobOrderId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export function getJobOrderCandidates(jobOrderId: string): Promise<Paginated<CandidateJobOrder>> {
  return request<Paginated<CandidateJobOrder>>(`/api/v1/job-orders/${jobOrderId}/candidates`);
}

// Accommodations
export function getAccommodations(
  page = 1,
  pageSize = 20,
  activeOnly = false,
): Promise<Paginated<Accommodation>> {
  const params = new URLSearchParams({ page: String(page), page_size: String(pageSize) });
  if (activeOnly) params.set("active_only", "true");
  return request<Paginated<Accommodation>>(`/api/v1/accommodations?${params}`);
}

export function createAccommodation(data: AccommodationCreate): Promise<Accommodation> {
  return request<Accommodation>("/api/v1/accommodations", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function getAccommodation(id: string): Promise<AccommodationDetail> {
  return request<AccommodationDetail>(`/api/v1/accommodations/${id}`);
}

export function updateAccommodation(id: string, data: AccommodationUpdate): Promise<Accommodation> {
  return request<Accommodation>(`/api/v1/accommodations/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export function assignWorkerToAccommodation(
  accommodationId: string,
  data: AssignmentCreate,
): Promise<AccommodationAssignment> {
  return request<AccommodationAssignment>(`/api/v1/accommodations/${accommodationId}/assign`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateAccommodationAssignment(
  assignmentId: string,
  data: AssignmentUpdate,
): Promise<AccommodationAssignment> {
  return request<AccommodationAssignment>(`/api/v1/accommodation-assignments/${assignmentId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export function getWorkerAccommodations(workerId: string): Promise<WorkerAccommodationEntry[]> {
  return request<WorkerAccommodationEntry[]>(`/api/v1/workers/${workerId}/accommodations`);
}

// ── Transport ─────────────────────────────────────────────────────────────────

export function getVehicles(
  page = 1,
  pageSize = 50,
  activeOnly = false,
): Promise<Paginated<Vehicle>> {
  const params = new URLSearchParams({
    page: String(page),
    page_size: String(pageSize),
    active_only: String(activeOnly),
  });
  return request<Paginated<Vehicle>>(`/api/v1/vehicles?${params}`);
}

export function createVehicle(data: VehicleCreate): Promise<Vehicle> {
  return request<Vehicle>("/api/v1/vehicles", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateVehicle(id: string, data: VehicleUpdate): Promise<Vehicle> {
  return request<Vehicle>(`/api/v1/vehicles/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export function getTransportRoutes(
  page = 1,
  pageSize = 50,
  activeOnly = false,
): Promise<Paginated<TransportRoute>> {
  const params = new URLSearchParams({
    page: String(page),
    page_size: String(pageSize),
    active_only: String(activeOnly),
  });
  return request<Paginated<TransportRoute>>(`/api/v1/transport-routes?${params}`);
}

export function createTransportRoute(data: RouteCreate): Promise<TransportRoute> {
  return request<TransportRoute>("/api/v1/transport-routes", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateTransportRoute(id: string, data: RouteUpdate): Promise<TransportRoute> {
  return request<TransportRoute>(`/api/v1/transport-routes/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export function assignWorkerToRoute(
  routeId: string,
  data: { worker_id: string; start_date: string; end_date?: string },
): Promise<TransportAssignment> {
  return request<TransportAssignment>(`/api/v1/transport-routes/${routeId}/assign`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function getRoutePassengers(routeId: string): Promise<RoutePassenger[]> {
  return request<RoutePassenger[]>(`/api/v1/transport-routes/${routeId}/passengers`);
}

export function updateTransportAssignment(
  assignmentId: string,
  data: { end_date?: string | null },
): Promise<TransportAssignment> {
  return request<TransportAssignment>(`/api/v1/transport-assignments/${assignmentId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

// ── Documents ─────────────────────────────────────────────────────────────────

export function getDocumentTemplates(
  page = 1,
  pageSize = 50,
  activeOnly = false,
): Promise<Paginated<DocumentTemplate>> {
  const params = new URLSearchParams({
    page: String(page),
    page_size: String(pageSize),
    active_only: String(activeOnly),
  });
  return request<Paginated<DocumentTemplate>>(`/api/v1/document-templates?${params}`);
}

export function getDocumentTemplate(id: string): Promise<DocumentTemplateDetail> {
  return request<DocumentTemplateDetail>(`/api/v1/document-templates/${id}`);
}

export function createDocumentTemplate(
  data: DocumentTemplateCreate,
): Promise<DocumentTemplateDetail> {
  return request<DocumentTemplateDetail>("/api/v1/document-templates", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateDocumentTemplate(
  id: string,
  data: DocumentTemplateUpdate,
): Promise<DocumentTemplateDetail> {
  return request<DocumentTemplateDetail>(`/api/v1/document-templates/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export function generateDocument(data: GenerateDocumentRequest): Promise<GeneratedDocumentDetail> {
  return request<GeneratedDocumentDetail>("/api/v1/documents/generate", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function getGeneratedDocument(id: string): Promise<GeneratedDocumentDetail> {
  return request<GeneratedDocumentDetail>(`/api/v1/documents/${id}`);
}

export function finalizeDocument(id: string): Promise<GeneratedDocument> {
  return request<GeneratedDocument>(`/api/v1/documents/${id}/finalize`, {
    method: "POST",
  });
}

export function getWorkerDocuments(
  workerId: string,
  page = 1,
  pageSize = 20,
): Promise<Paginated<GeneratedDocument>> {
  const params = new URLSearchParams({ page: String(page), page_size: String(pageSize) });
  return request<Paginated<GeneratedDocument>>(
    `/api/v1/workers/${workerId}/documents?${params}`,
  );
}

export function getWorkerLegalizations(
  workerId: string,
  page = 1,
  pageSize = 20,
): Promise<Paginated<GeneratedDocument>> {
  const params = new URLSearchParams({ page: String(page), page_size: String(pageSize) });
  return request<Paginated<GeneratedDocument>>(
    `/api/v1/workers/${workerId}/legalizations?${params}`,
  );
}

export function updateLegalizationStatus(
  documentId: string,
  data: LegalizationStatusUpdate,
): Promise<GeneratedDocument> {
  return request<GeneratedDocument>(`/api/v1/documents/${documentId}/legalization-status`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function downloadPracaGovExport(workerId: string): Promise<void> {
  const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
  const token = getAccessToken();
  const res = await fetch(
    `${apiBase}/api/v1/workers/${workerId}/legalizations/praca-gov-export`,
    { headers: token ? { Authorization: `Bearer ${token}` } : {} },
  );
  if (!res.ok) throw new Error(`CSV export failed: ${res.status}`);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "praca-gov-export.csv";
  a.click();
  URL.revokeObjectURL(url);
}

// ── Hours Import ──────────────────────────────────────────────────────────────

export async function uploadHoursFile(
  clientId: string,
  file: File,
): Promise<UploadResponse> {
  const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
  const token = getAccessToken();
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(`${apiBase}/api/v1/clients/${clientId}/hours-import/upload`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { detail?: string }).detail ?? `Upload failed: ${res.status}`);
  }
  return res.json() as Promise<UploadResponse>;
}

export function getClientColumnMappings(clientId: string): Promise<ColumnMappingRead> {
  return request<ColumnMappingRead>(`/api/v1/clients/${clientId}/column-mappings`);
}

export function saveClientColumnMappings(
  clientId: string,
  mappings: ColumnMappingItem[],
): Promise<ColumnMappingRead> {
  return request<ColumnMappingRead>(`/api/v1/clients/${clientId}/column-mappings`, {
    method: "PUT",
    body: JSON.stringify({ mappings }),
  });
}

export function validateBatch(
  batchId: string,
  mappings: Record<string, string>,
  saveForClient: boolean = false,
): Promise<PreviewResponse> {
  return request<PreviewResponse>(`/api/v1/hours-import/${batchId}/validate`, {
    method: "POST",
    body: JSON.stringify({ mappings, save_for_client: saveForClient }),
  });
}

export function commitBatch(
  batchId: string,
  mappings: Record<string, string>,
  saveForClient: boolean = false,
): Promise<CommitResponse> {
  return request<CommitResponse>(`/api/v1/hours-import/${batchId}/commit`, {
    method: "POST",
    body: JSON.stringify({ mappings, save_for_client: saveForClient }),
  });
}

export function getHoursImportBatch(batchId: string): Promise<HoursImportBatch> {
  return request<HoursImportBatch>(`/api/v1/hours-import/${batchId}`);
}

export function deleteHoursImportBatch(batchId: string): Promise<void> {
  return request<void>(`/api/v1/hours-import/${batchId}`, { method: "DELETE" });
}

export function getClientHoursImportHistory(
  clientId: string,
  page = 1,
  pageSize = 20,
): Promise<Paginated<HoursImportBatch>> {
  const params = new URLSearchParams({ page: String(page), page_size: String(pageSize) });
  return request<Paginated<HoursImportBatch>>(
    `/api/v1/clients/${clientId}/hours-import?${params}`,
  );
}

// ── Prospects ─────────────────────────────────────────────────────────────────

export function getProspects(
  page = 1,
  pageSize = 50,
  status?: ProspectStatus,
  source?: ProspectSource,
): Promise<Paginated<Prospect>> {
  const params = new URLSearchParams({ page: String(page), page_size: String(pageSize) });
  if (status) params.set("status", status);
  if (source) params.set("source", source);
  return request<Paginated<Prospect>>(`/api/v1/prospects?${params}`);
}

export function createProspect(data: ProspectCreate): Promise<Prospect> {
  return request<Prospect>("/api/v1/prospects", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateProspect(id: string, data: ProspectUpdate): Promise<Prospect> {
  return request<Prospect>(`/api/v1/prospects/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export function convertProspect(id: string): Promise<ConvertProspectResponse> {
  return request<ConvertProspectResponse>(`/api/v1/prospects/${id}/convert`, {
    method: "POST",
  });
}

// Placement Calendar
export function getPlacementCalendar(params: {
  start?: string;
  end?: string;
  client_id?: string;
  active_only?: boolean;
}): Promise<CalendarEntry[]> {
  const p = new URLSearchParams();
  if (params.start) p.set("start", params.start);
  if (params.end) p.set("end", params.end);
  if (params.client_id) p.set("client_id", params.client_id);
  if (params.active_only) p.set("active_only", "true");
  return request<CalendarEntry[]>(`/api/v1/placements/calendar?${p}`);
}

// Worker file uploads
export function listWorkerFiles(
  workerId: string,
  page = 1,
  pageSize = 20,
): Promise<Paginated<WorkerFile>> {
  return request<Paginated<WorkerFile>>(
    `/api/v1/workers/${workerId}/files?page=${page}&page_size=${pageSize}`,
  );
}

export async function uploadWorkerFile(
  workerId: string,
  file: File,
  documentType?: WorkerFileDocumentType,
): Promise<WorkerFile> {
  const token = getAccessToken();
  const formData = new FormData();
  formData.append("file", file);
  const url = `${BASE_URL}/api/v1/workers/${workerId}/files${documentType ? `?document_type=${documentType}` : ""}`;
  const res = await fetch(url, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    credentials: "include",
    body: formData,
  });
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
  return res.json() as Promise<WorkerFile>;
}

export function getWorkerFileDownloadUrl(
  workerId: string,
  fileId: string,
): Promise<WorkerFileDownloadResponse> {
  return request<WorkerFileDownloadResponse>(
    `/api/v1/workers/${workerId}/files/${fileId}/download`,
  );
}

export async function deleteWorkerFile(workerId: string, fileId: string): Promise<void> {
  await request<void>(`/api/v1/workers/${workerId}/files/${fileId}`, { method: "DELETE" });
}

// ── Invoices ──────────────────────────────────────────────────────────────────

export function getInvoices(params: {
  client_id?: string;
  status?: string;
  page?: number;
  page_size?: number;
}): Promise<Paginated<Invoice>> {
  const p = new URLSearchParams();
  if (params.client_id) p.set("client_id", params.client_id);
  if (params.status) p.set("status", params.status);
  p.set("page", String(params.page ?? 1));
  p.set("page_size", String(params.page_size ?? 20));
  return request<Paginated<Invoice>>(`/api/v1/invoices?${p}`);
}

export function getInvoice(id: string): Promise<InvoiceWithLineItems> {
  return request<InvoiceWithLineItems>(`/api/v1/invoices/${id}`);
}

export function updateInvoice(id: string, data: InvoiceUpdate): Promise<Invoice> {
  return request<Invoice>(`/api/v1/invoices/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export function deleteInvoice(id: string): Promise<void> {
  return request<void>(`/api/v1/invoices/${id}`, { method: "DELETE" });
}

// ── Shift scheduling ──────────────────────────────────────────────────────────

export function getShiftTemplates(params?: {
  client_id?: string;
  active_only?: boolean;
}): Promise<ShiftTemplate[]> {
  const p = new URLSearchParams();
  if (params?.client_id) p.set("client_id", params.client_id);
  if (params?.active_only) p.set("active_only", "true");
  return request<ShiftTemplate[]>(`/api/v1/shifts/templates?${p}`);
}

export function createShiftTemplate(data: ShiftTemplateCreate): Promise<ShiftTemplate> {
  return request<ShiftTemplate>("/api/v1/shifts/templates", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateShiftTemplate(id: string, data: ShiftTemplateUpdate): Promise<ShiftTemplate> {
  return request<ShiftTemplate>(`/api/v1/shifts/templates/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export function deleteShiftTemplate(id: string): Promise<void> {
  return request<void>(`/api/v1/shifts/templates/${id}`, { method: "DELETE" });
}

export function getShiftSchedule(params?: {
  start?: string;
  end?: string;
  client_id?: string;
  worker_id?: string;
  template_id?: string;
}): Promise<ShiftEntry[]> {
  const p = new URLSearchParams();
  if (params?.start) p.set("start", params.start);
  if (params?.end) p.set("end", params.end);
  if (params?.client_id) p.set("client_id", params.client_id);
  if (params?.worker_id) p.set("worker_id", params.worker_id);
  if (params?.template_id) p.set("template_id", params.template_id);
  return request<ShiftEntry[]>(`/api/v1/shifts/schedule?${p}`);
}

export function createShiftEntry(data: ShiftEntryCreate): Promise<ShiftEntry> {
  return request<ShiftEntry>("/api/v1/shifts/schedule", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function deleteShiftEntry(id: string): Promise<void> {
  return request<void>(`/api/v1/shifts/schedule/${id}`, { method: "DELETE" });
}

export function checkShiftConflicts(params: {
  worker_id: string;
  start_dt: string;
  end_dt: string;
  exclude_entry_id?: string;
}): Promise<ConflictCheckResult> {
  const p = new URLSearchParams({
    worker_id: params.worker_id,
    start_dt: params.start_dt,
    end_dt: params.end_dt,
  });
  if (params.exclude_entry_id) p.set("exclude_entry_id", params.exclude_entry_id);
  return request<ConflictCheckResult>(`/api/v1/shifts/conflicts?${p}`);
}

export function getShiftCapacity(params?: {
  start?: string;
  end?: string;
  client_id?: string;
}): Promise<CapacitySlot[]> {
  const p = new URLSearchParams();
  if (params?.start) p.set("start", params.start);
  if (params?.end) p.set("end", params.end);
  if (params?.client_id) p.set("client_id", params.client_id);
  return request<CapacitySlot[]>(`/api/v1/shifts/capacity?${p}`);
}

export async function exportShiftSchedule(params?: {
  start?: string;
  end?: string;
  client_id?: string;
}): Promise<void> {
  const p = new URLSearchParams();
  if (params?.start) p.set("start", params.start);
  if (params?.end) p.set("end", params.end);
  if (params?.client_id) p.set("client_id", params.client_id);
  const token = getAccessToken();
  const res = await fetch(`${BASE_URL}/api/v1/shifts/export?${p}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error(`Schedule export failed: ${res.status}`);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const filename = `schedule_${params?.start ?? "week"}.csv`;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
