import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface IntakePayload {
  first_name: string;
  last_name: string;
  phone: string;
  email?: string;
  nationality: string;
  availability_from: string;
  preferred_position: string;
  languages: string[];
  location_preference?: string;
  document_type?: string;
  referred_by?: string;
  cv_url?: string;
  gdpr_consent: boolean;
  gdpr_consent_at: string;
  locale: string;
}

// ---------------------------------------------------------------------------
// Config (env vars)
// ---------------------------------------------------------------------------

const HUBSPOT_TOKEN = process.env.HUBSPOT_PRIVATE_APP_TOKEN;
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const RESEND_FROM = process.env.RESEND_FROM_EMAIL ?? "noreply@nexflow.work";
const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL?.trim() ?? "http://localhost:8000";

// ---------------------------------------------------------------------------
// HubSpot helpers
// ---------------------------------------------------------------------------

async function hubspot(path: string, init: RequestInit = {}) {
  const res = await fetch(`https://api.hubapi.com${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${HUBSPOT_TOKEN}`,
      "Content-Type": "application/json",
      ...(init.headers as Record<string, string>),
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`HubSpot ${path} → ${res.status}: ${body}`);
  }
  if (res.status === 204) return null;
  return res.json() as Promise<Record<string, unknown>>;
}

async function upsertContact(p: IntakePayload): Promise<string> {
  let contactId: string | null = null;

  // Search by email to support idempotent re-submission
  if (p.email) {
    try {
      const result = await hubspot("/crm/v3/objects/contacts/search", {
        method: "POST",
        body: JSON.stringify({
          filterGroups: [
            { filters: [{ propertyName: "email", operator: "EQ", value: p.email }] },
          ],
          properties: ["hs_object_id"],
          limit: 1,
        }),
      });
      const results = result?.results as Array<{ id: string }> | undefined;
      if (results && results.length > 0) {
        contactId = results[0].id;
      }
    } catch {
      // Search failure is non-fatal — fall through to create
    }
  }

  const properties: Record<string, string> = {
    firstname: p.first_name,
    lastname: p.last_name,
    phone: p.phone,
    lifecyclestage: "lead",
    ...(p.email ? { email: p.email } : {}),
    ...(p.location_preference ? { city: p.location_preference } : {}),
    // Custom HubSpot properties — must be created in your account:
    //   Settings → Properties → Contact → Create property
    candidate_availability_from: p.availability_from,
    candidate_preferred_position: p.preferred_position,
    candidate_languages: p.languages.join(";"),
    candidate_nationality: p.nationality,
    candidate_form_locale: p.locale,
    candidate_gdpr_consent: "true",
    candidate_gdpr_consent_at: p.gdpr_consent_at,
    ...(p.document_type ? { candidate_document_type: p.document_type } : {}),
    ...(p.cv_url ? { candidate_cv_url: p.cv_url } : {}),
    ...(p.referred_by ? { candidate_referred_by: p.referred_by } : {}),
  };

  if (contactId) {
    await hubspot(`/crm/v3/objects/contacts/${contactId}`, {
      method: "PATCH",
      body: JSON.stringify({ properties }),
    });
  } else {
    const created = await hubspot("/crm/v3/objects/contacts", {
      method: "POST",
      body: JSON.stringify({ properties }),
    });
    contactId = created!.id as string;
  }

  return contactId!;
}

// ---------------------------------------------------------------------------
// Confirmation email (Resend)
// ---------------------------------------------------------------------------

const EMAIL_TEMPLATES: Record<
  string,
  { subject: string; html: (name: string) => string }
> = {
  pl: {
    subject: "Potwierdzenie rejestracji — Nexflow",
    html: (name) => `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#222">
        <h2 style="color:#003049">Cześć ${name},</h2>
        <p>Dziękujemy za przesłanie zgłoszenia do Nexflow.</p>
        <p>Twoja aplikacja została odebrana. Nasz rekruter skontaktuje się z Tobą
           w ciągu <strong>48 godzin</strong>.</p>
        <p style="color:#555">Pytania? Napisz do nas:
           <a href="mailto:kontakt@nexflow.eu" style="color:#0090e0">kontakt@nexflow.eu</a></p>
        <hr style="margin:24px 0;border:none;border-top:1px solid #eee"/>
        <p style="font-size:12px;color:#999">Nexflow sp. z o.o. | Słubice, Polska</p>
      </div>`,
  },
  de: {
    subject: "Registrierungsbestätigung — Nexflow",
    html: (name) => `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#222">
        <h2 style="color:#003049">Hallo ${name},</h2>
        <p>Vielen Dank für Ihre Bewerbung bei Nexflow.</p>
        <p>Wir haben Ihre Anfrage erhalten. Unser Recruiter wird sich innerhalb von
           <strong>48 Stunden</strong> bei Ihnen melden.</p>
        <p style="color:#555">Fragen? Schreiben Sie uns:
           <a href="mailto:kontakt@nexflow.eu" style="color:#0090e0">kontakt@nexflow.eu</a></p>
        <hr style="margin:24px 0;border:none;border-top:1px solid #eee"/>
        <p style="font-size:12px;color:#999">Nexflow sp. z o.o. | Słubice, Polen</p>
      </div>`,
  },
  en: {
    subject: "Registration Confirmation — Nexflow",
    html: (name) => `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#222">
        <h2 style="color:#003049">Hi ${name},</h2>
        <p>Thank you for submitting your application to Nexflow.</p>
        <p>We received your application. A recruiter will contact you within
           <strong>48 hours</strong>.</p>
        <p style="color:#555">Questions? Email us:
           <a href="mailto:kontakt@nexflow.eu" style="color:#0090e0">kontakt@nexflow.eu</a></p>
        <hr style="margin:24px 0;border:none;border-top:1px solid #eee"/>
        <p style="font-size:12px;color:#999">Nexflow sp. z o.o. | Słubice, Poland</p>
      </div>`,
  },
  uk: {
    subject: "Підтвердження реєстрації — Nexflow",
    html: (name) => `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#222">
        <h2 style="color:#003049">Привіт, ${name}!</h2>
        <p>Дякуємо за подачу заявки до Nexflow.</p>
        <p>Ваша заявка отримана. Наш рекрутер зв'яжеться з Вами протягом
           <strong>48 годин</strong>.</p>
        <p style="color:#555">Питання? Напишіть нам:
           <a href="mailto:kontakt@nexflow.eu" style="color:#0090e0">kontakt@nexflow.eu</a></p>
        <hr style="margin:24px 0;border:none;border-top:1px solid #eee"/>
        <p style="font-size:12px;color:#999">Nexflow sp. z o.o. | Słubice, Польща</p>
      </div>`,
  },
};

async function sendConfirmationEmail(p: IntakePayload): Promise<void> {
  if (!p.email || !RESEND_API_KEY) return;

  const template =
    EMAIL_TEMPLATES[p.locale] ?? EMAIL_TEMPLATES.en!;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: RESEND_FROM,
      to: [p.email],
      subject: template.subject,
      html: template.html(p.first_name),
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Resend failed: ${res.status} ${body}`);
  }
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  let payload: IntakePayload;

  // Parse multipart/form-data (sent by the intake form with optional CV file)
  try {
    const fd = await req.formData();
    const str = (key: string) => (fd.get(key) as string | null) ?? undefined;
    payload = {
      first_name: str("first_name") ?? "",
      last_name: str("last_name") ?? "",
      phone: str("phone") ?? "",
      email: str("email"),
      nationality: str("nationality") ?? "",
      availability_from: str("availability_from") ?? "",
      preferred_position: str("preferred_position") ?? "",
      languages: fd.getAll("languages").map(String),
      location_preference: str("location_preference"),
      document_type: str("document_type"),
      referred_by: str("referred_by"),
      gdpr_consent: str("gdpr_consent") === "true",
      gdpr_consent_at: str("gdpr_consent_at") ?? new Date().toISOString(),
      locale: str("locale") ?? "pl",
    };

    // Upload CV to Vercel Blob if provided
    const cvFile = fd.get("cv_file");
    if (cvFile && cvFile instanceof File && cvFile.size > 0) {
      if (process.env.BLOB_READ_WRITE_TOKEN) {
        try {
          const safeName = `${payload.phone.replace(/\D/g, "")}-${Date.now()}.pdf`;
          const blob = await put(`cvs/${safeName}`, cvFile, { access: "public" });
          payload.cv_url = blob.url;
        } catch (err) {
          console.error("[intake] CV upload to Vercel Blob failed:", err);
          // Non-blocking — proceed without CV URL
        }
      } else {
        console.warn("[intake] BLOB_READ_WRITE_TOKEN not set — CV upload skipped");
      }
    }
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  // Step 1 — persist candidate to backend (best-effort; HubSpot/email/chatbot still run if backend is down)
  let candidate: Record<string, unknown> = { phone: payload.phone };
  try {
    const backendRes = await fetch(`${BACKEND_URL}/api/v1/candidates`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        first_name: payload.first_name,
        last_name: payload.last_name,
        phone: payload.phone,
        ...(payload.email ? { email: payload.email } : {}),
        nationality: payload.nationality,
        availability_from: payload.availability_from,
        preferred_position: payload.preferred_position,
        languages: payload.languages,
        ...(payload.location_preference ? { location_preference: payload.location_preference } : {}),
        ...(payload.referred_by ? { referred_by: payload.referred_by } : {}),
        gdpr_consent: payload.gdpr_consent,
        gdpr_consent_at: payload.gdpr_consent_at,
      }),
    });

    if (!backendRes.ok) {
      const body = await backendRes.json().catch(() => ({})) as Record<string, string>;
      console.error(`[intake] Backend returned ${backendRes.status}: ${body.detail ?? "unknown"}`);
    } else {
      candidate = await backendRes.json() as Record<string, unknown>;
    }
  } catch (err) {
    console.error("[intake] Backend unreachable — continuing without DB persistence:", err);
  }

  // Step 2 — HubSpot contact only (best-effort, non-blocking)
  // Note: no Deal is created here — aplikuj candidates belong in Kandydaci, not B2B pipeline
  if (HUBSPOT_TOKEN) {
    try {
      await upsertContact(payload);
    } catch (err) {
      console.error("[intake] HubSpot sync failed:", err);
    }
  } else {
    console.warn("[intake] HUBSPOT_PRIVATE_APP_TOKEN not set — skipping HubSpot sync");
  }

  // Step 3 — confirmation email (best-effort, non-blocking)
  if (payload.email) {
    try {
      await sendConfirmationEmail(payload);
    } catch (err) {
      console.error("[intake] Confirmation email failed:", err);
    }
  }

  // WhatsApp screening is initiated by the backend WhatsApp pipeline (initiate_session).
  // The old Twilio SMS trigger has been removed — do not re-add it.

  return NextResponse.json(candidate, { status: 201 });
}
