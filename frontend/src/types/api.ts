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
  created_at: string;
  updated_at: string;
}

export interface CandidateCreate {
  first_name: string;
  last_name: string;
  phone?: string;
  email?: string;
  nationality?: string;
  availability_from?: string;
  preferred_position?: PreferredPosition;
  languages?: string[];
  location_preference?: string;
  gdpr_consent: boolean;
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
  a1_cert_status: string | null;
  gdpr_consent: boolean;
  created_at: string;
  updated_at: string;
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

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}
