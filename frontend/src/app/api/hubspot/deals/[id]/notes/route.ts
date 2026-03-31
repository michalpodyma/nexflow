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

// POST /api/hubspot/deals/[id]/notes — add a note to a deal
export async function POST(
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
  const body = await req.json() as { note: string };

  if (!body.note?.trim()) {
    return NextResponse.json({ error: "note is required" }, { status: 400 });
  }

  try {
    // Create a note engagement and associate it to the deal
    const note = await hs("/crm/v3/objects/notes", {
      method: "POST",
      body: JSON.stringify({
        properties: {
          hs_note_body: body.note.trim(),
          hs_timestamp: Date.now().toString(),
        },
        associations: [
          {
            to: { id },
            types: [
              { associationCategory: "HUBSPOT_DEFINED", associationTypeId: 214 },
            ],
          },
        ],
      }),
    });
    return NextResponse.json({ id: note?.id }, { status: 201 });
  } catch (err) {
    console.error("[hubspot/deals/[id]/notes] POST failed:", err);
    return NextResponse.json(
      { error: "Failed to create note" },
      { status: 502 },
    );
  }
}
