import { NextRequest, NextResponse } from "next/server";

const HUBSPOT_TOKEN = process.env.HUBSPOT_PRIVATE_APP_TOKEN;
const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL?.trim() ?? "http://localhost:8000";

interface AdsLeadPayload {
  name: string;
  phone: string;
  city?: string;
  source: string;
  locale: string;
  gdpr_consent_at: string;
}

function normalizePhone(raw: string, locale: string): string {
  const stripped = raw.replace(/[\s\-().]/g, "");
  if (stripped.startsWith("+")) return stripped;
  if (stripped.startsWith("00")) return `+${stripped.slice(2)}`;
  const country = locale === "de" ? "49" : "48";
  if (stripped.startsWith(country)) return `+${stripped}`;
  return `+${country}${stripped}`;
}

export async function POST(req: NextRequest) {
  let payload: AdsLeadPayload;
  try {
    payload = (await req.json()) as AdsLeadPayload;
    if (!payload.name?.trim() || !payload.phone?.trim()) {
      return NextResponse.json({ error: "name and phone required" }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const nameParts = payload.name.trim().split(/\s+/);
  const firstName = nameParts[0] ?? payload.name;
  const lastName = nameParts.slice(1).join(" ") || "-";
  const phone = normalizePhone(payload.phone, payload.locale);
  const now = payload.gdpr_consent_at ?? new Date().toISOString();

  // HubSpot — primary lead capture, fire-and-forget
  if (HUBSPOT_TOKEN) {
    fetch("https://api.hubapi.com/crm/v3/objects/contacts", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${HUBSPOT_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        properties: {
          firstname: firstName,
          lastname: lastName,
          phone,
          ...(payload.city ? { city: payload.city } : {}),
          lifecyclestage: "lead",
          hs_lead_status: "NEW",
          candidate_form_locale: payload.locale,
          candidate_gdpr_consent: "true",
          candidate_gdpr_consent_at: now,
          lead_source_detail: `google_ads_${payload.source}`,
        },
      }),
    }).catch((err) => console.error("[ads-lead] HubSpot:", err));
  }

  // Backend candidate — best-effort, non-blocking
  fetch(`${BACKEND_URL}/api/v1/candidates`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      first_name: firstName,
      last_name: lastName,
      phone,
      nationality: "PL",
      availability_from: new Date().toISOString().split("T")[0],
      preferred_position: "warehouse_picker",
      languages: [payload.locale === "de" ? "de" : "pl"],
      ...(payload.city ? { location_preference: payload.city } : {}),
      referred_by: `google_ads_${payload.source}`,
      gdpr_consent: true,
      gdpr_consent_at: now,
    }),
  }).catch((err) => console.error("[ads-lead] Backend:", err));

  return NextResponse.json({ ok: true }, { status: 201 });
}
