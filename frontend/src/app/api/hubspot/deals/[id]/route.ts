import { NextRequest, NextResponse } from "next/server";

const HUBSPOT_TOKEN = process.env.HUBSPOT_PRIVATE_APP_TOKEN;

async function hs(path: string, init: RequestInit = {}) {
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

// PATCH /api/hubspot/deals/[id] — update deal stage
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!HUBSPOT_TOKEN) {
    return NextResponse.json(
      { error: "HUBSPOT_PRIVATE_APP_TOKEN not configured" },
      { status: 503 },
    );
  }

  const { id } = await params;
  const body = await req.json() as { stage: string };

  if (!body.stage) {
    return NextResponse.json({ error: "stage is required" }, { status: 400 });
  }

  try {
    await hs(`/crm/v3/objects/deals/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ properties: { dealstage: body.stage } }),
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[hubspot/deals/[id]] PATCH failed:", err);
    return NextResponse.json(
      { error: "Failed to update deal stage" },
      { status: 502 },
    );
  }
}
