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
  worker_id: string | null;
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
  address?: string | null;
  date_of_birth?: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
  // praca.gov fields
  passport_number?: string | null;
  gender?: string | null;
  citizenship?: string | null;
  travel_document_type?: string | null;
  travel_document_series?: string | null;
  travel_document_number?: string | null;
  travel_document_issue_date?: string | null;
  travel_document_expiry?: string | null;
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
  // praca.gov fields
  passport_number?: string;
  gender?: string;
  citizenship?: string;
  travel_document_type?: string;
  travel_document_series?: string;
  travel_document_number?: string;
  travel_document_issue_date?: string;
  travel_document_expiry?: string;
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
  // praca.gov fields
  passport_number?: string | null;
  gender?: string | null;
  citizenship?: string | null;
  travel_document_type?: string | null;
  travel_document_series?: string | null;
  travel_document_number?: string | null;
  travel_document_issue_date?: string | null;
  travel_document_expiry?: string | null;
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

export interface ClientCreate {
  company_name: string;
  nip?: string | null;
  vat_eu?: string | null;
  address?: string | null;
  city?: string | null;
  postal_code?: string | null;
  country?: string | null;
  phone?: string | null;
  email?: string | null;
  account_manager_name?: string | null;
  payment_terms_days?: number;
  currency?: Currency;
  is_active?: boolean;
}

export interface ClientUpdate {
  company_name?: string;
  nip?: string | null;
  vat_eu?: string | null;
  address?: string | null;
  city?: string | null;
  postal_code?: string | null;
  country?: string | null;
  phone?: string | null;
  email?: string | null;
  account_manager_name?: string | null;
  payment_terms_days?: number;
  currency?: Currency;
  is_active?: boolean;
}

export type ActivityType = "note" | "call" | "email" | "meeting";

export interface ClientActivity {
  id: string;
  client_id: string;
  activity_type: ActivityType;
  description: string;
  created_by: string | null;
  created_at: string;
}

export interface ClientActivityCreate {
  activity_type: ActivityType;
  description: string;
  created_by?: string | null;
}

export interface ClientContact {
  id: string;
  client_id: string;
  name: string;
  role: string | null;
  phone: string | null;
  email: string | null;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
}

export interface ClientContactCreate {
  name: string;
  role?: string | null;
  phone?: string | null;
  email?: string | null;
  is_primary?: boolean;
}

export interface ClientContactUpdate {
  name?: string;
  role?: string | null;
  phone?: string | null;
  email?: string | null;
  is_primary?: boolean;
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

export interface PlacementsByMonth {
  month: string; // YYYY-MM
  count: number;
}

export interface ComplianceSummary {
  expiring_7d: number;
  expiring_30d: number;
  expiring_90d: number;
}

export interface RecruiterAnalytics {
  active_workers: number;
  placement_rate: number;
  fill_rate: number;
  avg_time_to_fill_days: number | null;
  placements_by_month: PlacementsByMonth[];
  compliance_summary: ComplianceSummary;
  weekly_trends: WeeklyTrend[];
  computed_at: string;
}

export interface RevenuePerClient {
  client_name: string;
  revenue_monthly_pln: number;
}

export interface ProspectFunnelCount {
  status: string;
  count: number;
}

export interface B2BAnalytics {
  revenue_forecast_monthly_pln: number;
  pipeline_velocity: number;
  pipeline_value_pln: number;
  conversion_rate: number;
  revenue_per_client: RevenuePerClient[];
  pipeline_by_stage: PipelineStageCount[];
  prospects_funnel: ProspectFunnelCount[];
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

// ── Documents ─────────────────────────────────────────────────────────────────

export type TemplateType = "employment_contract" | "mandate_contract" | "annex" | "other" | "oswiadczenie" | "permit_a" | "permit_b" | "permit_seasonal" | "residence_prep";
export type DocumentStatus = "draft" | "final" | "signed";

export interface DocumentTemplate {
  id: string;
  name: string;
  template_type: TemplateType;
  is_active: boolean;
  version: number;
  created_at: string;
  updated_at: string;
}

export interface DocumentTemplateDetail extends DocumentTemplate {
  body_html: string;
}

export interface DocumentTemplateCreate {
  name: string;
  template_type: TemplateType;
  body_html: string;
  is_active?: boolean;
}

export interface DocumentTemplateUpdate {
  name?: string;
  template_type?: TemplateType;
  body_html?: string;
  is_active?: boolean;
}

export type LegalizationStatus = "filed" | "pending" | "approved" | "rejected" | "expired";

export interface GeneratedDocument {
  id: string;
  template_id: string;
  worker_id: string;
  assignment_id: string | null;
  status: DocumentStatus;
  generated_by_user: string | null;
  template_name_snapshot: string;
  created_at: string;
  updated_at: string;
  // Legalization tracking
  legalization_status: LegalizationStatus | null;
  legalization_filed_at: string | null;
  legalization_approved_at: string | null;
  legalization_expires_at: string | null;
}

export interface LegalizationStatusUpdate {
  legalization_status: LegalizationStatus;
  legalization_filed_at?: string | null;
  legalization_approved_at?: string | null;
  legalization_expires_at?: string | null;
}

export interface GeneratedDocumentDetail extends GeneratedDocument {
  rendered_html: string;
}

export interface GenerateDocumentRequest {
  template_id: string;
  worker_id: string;
  assignment_id?: string;
  overrides?: Record<string, string>;
}

// ── Hours Import ──────────────────────────────────────────────────────────────

export interface HoursImportBatch {
  id: string;
  client_id: string;
  original_filename: string;
  storage_key: string;
  content_type: string;
  file_size: number;
  status: "pending" | "mapped" | "validated" | "imported" | "failed";
  raw_headers: string[] | null;
  row_count: number | null;
  matched_count: number | null;
  unmatched_count: number | null;
  flagged_count: number | null;
  uploaded_by_user: string | null;
  created_at: string;
  updated_at: string;
}

export interface ColumnMappingItem {
  spreadsheet_header: string;
  internal_field: string;
}

export interface ColumnMappingRead {
  client_id: string;
  mappings: ColumnMappingItem[];
}

export interface UploadResponse {
  batch_id: string;
  headers: string[];
  suggested_mappings: Record<string, string>;
  row_count: number;
}

export interface PreviewRow {
  row_index: number;
  raw_data: Record<string, string | null>;
  matched_worker_id: string | null;
  match_method: string | null;
  match_status: "matched" | "unmatched" | "flagged";
  validation_errors: string[];
  work_date: string | null;
  hours_worked: string | null;
  overtime_hours: string | null;
}

export interface PreviewResponse {
  batch_id: string;
  rows: PreviewRow[];
  matched_count: number;
  unmatched_count: number;
  flagged_count: number;
}

export interface CommitResponse {
  batch_id: string;
  imported_count: number;
  skipped_count: number;
}

// ── Prospects ─────────────────────────────────────────────────────────────────

export type ProspectSource = "referral" | "cold_call" | "website" | "linkedin" | "event" | "other";
export type ProspectStatus = "new" | "contacted" | "qualified" | "proposal_sent" | "negotiating" | "converted" | "lost";

export interface Prospect {
  id: string;
  company_name: string;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  source: ProspectSource;
  status: ProspectStatus;
  estimated_monthly_value: string | null;
  notes: string | null;
  next_follow_up: string | null;
  converted_to_client_id: string | null;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProspectCreate {
  company_name: string;
  contact_name?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  source?: ProspectSource;
  status?: ProspectStatus;
  estimated_monthly_value?: string | null;
  notes?: string | null;
  next_follow_up?: string | null;
  assigned_to?: string | null;
}

export interface ProspectUpdate {
  company_name?: string;
  contact_name?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  source?: ProspectSource;
  status?: ProspectStatus;
  estimated_monthly_value?: string | null;
  notes?: string | null;
  next_follow_up?: string | null;
  assigned_to?: string | null;
}

export interface ConvertProspectResponse {
  prospect: Prospect;
  client_id: string;
}

export interface CalendarEntry {
  id: string;
  worker_id: string;
  worker_name: string;
  client_id: string;
  client_name: string;
  position: string;
  start_date: string; // ISO date YYYY-MM-DD
  end_date: string | null; // ISO date, null = open-ended
  is_active: boolean;
}

export type WorkerFileDocumentType =
  | "work_permit"
  | "passport"
  | "medical_exam"
  | "bhp_cert"
  | "a1_cert"
  | "id_card"
  | "other";

export interface WorkerFile {
  id: string;
  worker_id: string;
  file_name: string;
  content_type: string;
  file_size: number;
  document_type: WorkerFileDocumentType | null;
  uploaded_by_user: string | null;
  created_at: string;
}

export interface WorkerFileDownloadResponse {
  url: string;
  expires_in: number;
}

export interface WorkerAccommodationEntry {
  assignment_id: string;
  accommodation_id: string;
  accommodation_name: string;
  accommodation_address: string | null;
  accommodation_city: string | null;
  room_number: string | null;
  move_in_date: string;
  move_out_date: string | null;
  monthly_cost_to_worker: string | null;
}
