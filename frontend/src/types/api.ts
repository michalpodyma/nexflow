export type LanguageCode = "pl" | "de" | "en" | "uk" | "id" | "es" | "nl";

export type ScreeningStatus =
  | "new"
  | "chatbot_in_progress"
  | "screened_pass"
  | "screened_fail"
  | "offered"
  | "hired"
  | "rejected";

export type PreferredPosition =
  | "warehouse_picker"
  | "forklift_operator"
  | "logistics_driver"
  | "other";

export type WorkPermitType = "UE" | "non_UE_permit" | "none";

export type AttendanceStatus = "active" | "off" | "terminated";

export type DocumentType = "ukrainian_passport" | "eu_id" | "work_permit" | "none";

export type Currency = "PLN" | "EUR";

export interface Candidate {
  id: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  email: string | null;
  nationality: string | null;
  availability_from: string | null;
  preferred_position: PreferredPosition | null;
  languages: string[] | null;
  location_preference: string | null;
  screening_status: ScreeningStatus;
  screening_score: number | null;
  gdpr_consent: boolean;
  gdpr_consent_at: string | null;
  notes: string | null;
  contacted_at: string | null;
  job_posting_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface CandidateReminder {
  id: string;
  candidate_id: string;
  reminder_date: string;
  reminder_text: string;
  dismissed: boolean;
  created_at: string;
}

export interface DueRemindersCount {
  due_count: number;
}

export interface CandidateCreate {
  first_name: string;
  last_name: string;
  phone: string;  // E.164 international format
  email?: string;
  nationality: string;  // ISO 3166-1 alpha-2
  availability_from: string;  // ISO date "YYYY-MM-DD"
  preferred_position: PreferredPosition;
  languages: LanguageCode[];
  location_preference?: string;
  document_type?: DocumentType;
  cv_url?: string;
  gdpr_consent: boolean;
  gdpr_consent_at: string;  // ISO datetime, client-side timestamp
}

export interface WorkerAssignment {
  id: string;
  position: string;
  client_id: string;
  client_name: string;
  employer_rate: number;
  start_date: string;
  end_date: string | null;
  is_active: boolean;
}

export interface Worker {
  id: string;
  first_name: string;
  last_name: string;
  nationality: string | null;
  phone: string | null;
  email: string | null;
  work_permit_type: WorkPermitType | null;
  work_permit_expiry: string | null;
  health_cert_expiry: string | null;
  safety_cert_expiry: string | null;
  a1_cert_status: string | null;
  attendance_status: AttendanceStatus;
  gdpr_consent: boolean;
  current_client_id: string | null;
  current_client_name: string | null;
  assignment_start_date: string | null;
  assignment_end_date: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface WorkerCreate {
  first_name: string;
  last_name: string;
  nationality?: string;
  phone?: string;
  email?: string;
  address?: string;
  date_of_birth?: string;
  work_permit_type?: WorkPermitType;
  work_permit_expiry?: string;
  health_cert_expiry?: string;
  safety_cert_expiry?: string;
  a1_cert_status?: string;
  attendance_status?: AttendanceStatus;
  gdpr_consent?: boolean;
  gdpr_consent_at?: string;
}

export interface WorkerUpdate {
  first_name?: string;
  last_name?: string;
  nationality?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  date_of_birth?: string | null;
  work_permit_type?: WorkPermitType | null;
  work_permit_expiry?: string | null;
  health_cert_expiry?: string | null;
  safety_cert_expiry?: string | null;
  a1_cert_status?: string | null;
  attendance_status?: AttendanceStatus;
  current_client_id?: string | null;
  assignment_start_date?: string | null;
  assignment_end_date?: string | null;
}

export interface WorkerDetail extends Worker {
  assignments: WorkerAssignment[];
}

export interface Client {
  id: string;
  company_name: string;
  nip: string | null;
  vat_eu: string | null;
  address: string | null;
  city: string | null;
  postal_code: string | null;
  country: string | null;
  phone: string | null;
  email: string | null;
  account_manager_name: string | null;
  payment_terms_days: number;
  currency: Currency;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PipelineStageCount {
  status: string;
  count: number;
}

export interface WeeklyTrend {
  week_start: string; // YYYY-MM-DD
  new_candidates: number;
}

export interface AnalyticsOverview {
  active_workers: number;
  placement_rate: number; // 0.0–1.0
  pipeline_velocity: number; // new candidates in last 7 days
  revenue_forecast_monthly_pln: number;
  pipeline_by_stage: PipelineStageCount[];
  weekly_trends: WeeklyTrend[];
  computed_at: string;
}

export interface JobPosting {
  id: string;
  title: string;
  status: string;
}

export type JobOrderUrgency = "normal" | "urgent" | "critical";

export type JobOrderStatus =
  | "open"
  | "sourcing"
  | "submitted"
  | "interview"
  | "filled"
  | "on_hold"
  | "cancelled";

export interface JobOrder {
  id: string;
  client_id: string;
  title: string;
  description: string | null;
  location: string | null;
  headcount_needed: number;
  headcount_filled: number;
  urgency: JobOrderUrgency;
  status: JobOrderStatus;
  deadline: string | null; // ISO date
  salary_min: string | null;
  salary_max: string | null;
  currency: Currency;
  created_at: string;
  updated_at: string;
}

export interface JobOrderCreate {
  client_id: string;
  title: string;
  description?: string;
  location?: string;
  headcount_needed?: number;
  urgency?: JobOrderUrgency;
  status?: JobOrderStatus;
  deadline?: string;
  salary_min?: string;
  salary_max?: string;
  currency?: Currency;
}

export interface JobOrderUpdate {
  title?: string;
  description?: string;
  location?: string;
  headcount_needed?: number;
  headcount_filled?: number;
  urgency?: JobOrderUrgency;
  status?: JobOrderStatus;
  deadline?: string | null;
  salary_min?: string | null;
  salary_max?: string | null;
  currency?: Currency;
}

export type AlertSeverity = "critical" | "warning" | "info";
export type ComplianceDocumentType = "work_permit" | "health_cert" | "safety_cert";

export interface ComplianceAlert {
  worker_id: string;
  worker_name: string;
  document_type: ComplianceDocumentType;
  document_label: string;
  expiry_date: string;
  days_remaining: number;
  severity: AlertSeverity;
}

export interface ComplianceAlertsResponse {
  alerts: ComplianceAlert[];
  critical_count: number;
  warning_count: number;
  info_count: number;
  total: number;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}

export type CandidateJobOrderStatus =
  | "submitted"
  | "interviewing"
  | "offered"
  | "placed"
  | "rejected";

export interface CandidateJobOrder {
  id: string;
  candidate_id: string;
  job_order_id: string;
  status: CandidateJobOrderStatus;
  submitted_at: string;
  updated_at: string;
}

export interface CandidateJobOrderCreate {
  job_order_id: string;
  status?: CandidateJobOrderStatus;
}

export interface CandidateJobOrderUpdate {
  status: CandidateJobOrderStatus;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  // refresh_token is managed as an httpOnly cookie — not returned in the JSON body
}

// ── Accommodations ────────────────────────────────────────────────────────────

export interface Accommodation {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  total_capacity: number;
  rooms_count: number | null;
  monthly_rent: string | null;      // Decimal serialised as string
  monthly_utilities: string | null;
  is_active: boolean;
  notes: string | null;
  current_occupancy: number;
  created_at: string;
  updated_at: string;
}

export interface ResidentSummary {
  worker_id: string;
  worker_name: string;
  room_number: string | null;
  move_in_date: string;
  move_out_date: string | null;
  monthly_cost_to_worker: string | null;
  assignment_id: string;
}

export interface AccommodationDetail extends Accommodation {
  residents: ResidentSummary[];
}

export interface AccommodationCreate {
  name: string;
  address?: string;
  city?: string;
  total_capacity: number;
  rooms_count?: number;
  monthly_rent?: string;
  monthly_utilities?: string;
  is_active?: boolean;
  notes?: string;
}

export interface AccommodationUpdate {
  name?: string;
  address?: string | null;
  city?: string | null;
  total_capacity?: number;
  rooms_count?: number | null;
  monthly_rent?: string | null;
  monthly_utilities?: string | null;
  is_active?: boolean;
  notes?: string | null;
}

export interface AssignmentCreate {
  worker_id: string;
  room_number?: string;
  move_in_date: string;   // ISO datetime
  monthly_cost_to_worker?: string;
}

export interface AssignmentUpdate {
  room_number?: string | null;
  move_out_date?: string | null;
  monthly_cost_to_worker?: string | null;
}

export interface AccommodationAssignment {
  id: string;
  worker_id: string;
  accommodation_id: string;
  room_number: string | null;
  move_in_date: string;
  move_out_date: string | null;
  monthly_cost_to_worker: string | null;
  created_at: string;
  updated_at: string;
}

// ── Transport ─────────────────────────────────────────────────────────────────

export interface Vehicle {
  id: string;
  make: string;
  model: string;
  year: number | null;
  license_plate: string;
  capacity: number;
  insurance_expiry_date: string | null;  // ISO date
  inspection_expiry_date: string | null; // ISO date
  is_active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface VehicleCreate {
  make: string;
  model: string;
  year?: number;
  license_plate: string;
  capacity: number;
  insurance_expiry_date?: string;
  inspection_expiry_date?: string;
  is_active?: boolean;
  notes?: string;
}

export interface VehicleUpdate {
  make?: string;
  model?: string;
  year?: number | null;
  license_plate?: string;
  capacity?: number;
  insurance_expiry_date?: string | null;
  inspection_expiry_date?: string | null;
  is_active?: boolean;
  notes?: string | null;
}

export interface TransportRoute {
  id: string;
  name: string;
  origin: string;
  destination: string;
  vehicle_id: string | null;
  driver_worker_id: string | null;
  departure_time: string | null; // "HH:MM:SS"
  return_time: string | null;    // "HH:MM:SS"
  is_active: boolean;
  assigned_workers: number;
  vehicle_plate: string | null;
  driver_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface RouteCreate {
  name: string;
  origin: string;
  destination: string;
  vehicle_id?: string;
  driver_worker_id?: string;
  departure_time?: string;
  return_time?: string;
  is_active?: boolean;
}

export interface RouteUpdate {
  name?: string;
  origin?: string;
  destination?: string;
  vehicle_id?: string | null;
  driver_worker_id?: string | null;
  departure_time?: string | null;
  return_time?: string | null;
  is_active?: boolean;
}

export interface TransportAssignment {
  id: string;
  worker_id: string;
  route_id: string;
  start_date: string;
  end_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface RoutePassenger {
  worker_id: string;
  worker_name: string;
  start_date: string;
  end_date: string | null;
  assignment_id: string;
}
