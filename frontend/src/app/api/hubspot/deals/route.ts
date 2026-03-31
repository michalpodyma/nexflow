import { NextResponse } from "next/server";

const HUBSPOT_TOKEN = process.env.HUBSPOT_PRIVATE_APP_TOKEN;
const PIPELINE_ID = process.env.HUBSPOT_PIPELINE_ID ?? "default";
const DAYS_BACK = 30;

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
  return res.json() as Promise<Record<string, unknown>>;
}

export async function GET() {
  if (!HUBSPOT_TOKEN) {
    return NextResponse.json(
      { error: "HUBSPOT_PRIVATE_APP_TOKEN not configured" },
      { status: 503 },
    );
  }

  try {
    // 1. Fetch pipeline stage definitions so we have labels
    const pipelineData = await hs(`/crm/v3/pipelines/deals/${PIPELINE_ID}`);
    const stagesRaw = pipelineData.stages as Array<{
      id: string;
      label: string;
      displayOrder: number;
    }>;
    const stages = stagesRaw
      .sort((a, b) => a.displayOrder - b.displayOrder)
      .map((s) => ({ id: s.id, label: s.label }));

    // 2. Fetch deals in this pipeline created in the last 30 days
    const sinceMs = Date.now() - DAYS_BACK * 24 * 60 * 60 * 1000;
    const searchResult = await hs("/crm/v3/objects/deals/search", {
      method: "POST",
      body: JSON.stringify({
        filterGroups: [
          {
            filters: [
              { propertyName: "pipeline", operator: "EQ", value: PIPELINE_ID },
              {
                propertyName: "createdate",
                operator: "GTE",
                value: String(sinceMs),
              },
            ],
          },
        ],
        properties: ["dealname", "dealstage", "createdate", "pipeline"],
        limit: 100,
      }),
    });

    const dealResults = searchResult.results as Array<{
      id: string;
      properties: {
        dealname: string;
        dealstage: string;
        createdate: string;
      };
    }>;

    if (!dealResults || dealResults.length === 0) {
      return NextResponse.json({ stages, deals: [] });
    }

    // 3. Fetch associated contact IDs for all deals in batch
    const dealIds = dealResults.map((d) => d.id);
    const assocResult = await hs(
      "/crm/v4/associations/deals/contacts/batch/read",
      {
        method: "POST",
        body: JSON.stringify({ inputs: dealIds.map((id) => ({ id })) }),
      },
    );

    // Build map: dealId → first contactId
    const dealToContact = new Map<string, string>();
    const assocResults = assocResult.results as Array<{
      from: { id: string };
      to: Array<{ toObjectId: string }>;
    }>;
    for (const assoc of assocResults ?? []) {
      if (assoc.to?.length > 0) {
        dealToContact.set(assoc.from.id, assoc.to[0]!.toObjectId);
      }
    }

    const contactIds = Array.from(new Set(dealToContact.values()));

    // 4. Batch-read contact properties
    const contactMap = new Map<
      string,
      {
        firstname: string;
        lastname: string;
        phone: string;
        candidate_languages: string;
        candidate_preferred_position: string;
        candidate_form_locale: string;
      }
    >();

    if (contactIds.length > 0) {
      const contactsBatch = await hs("/crm/v3/objects/contacts/batch/read", {
        method: "POST",
        body: JSON.stringify({
          inputs: contactIds.map((id) => ({ id })),
          properties: [
            "firstname",
            "lastname",
            "phone",
            "candidate_languages",
            "candidate_preferred_position",
            "candidate_form_locale",
          ],
        }),
      });
      const contactResults = contactsBatch.results as Array<{
        id: string;
        properties: Record<string, string>;
      }>;
      for (const c of contactResults ?? []) {
        contactMap.set(c.id, {
          firstname: c.properties.firstname ?? "",
          lastname: c.properties.lastname ?? "",
          phone: c.properties.phone ?? "",
          candidate_languages: c.properties.candidate_languages ?? "",
          candidate_preferred_position:
            c.properties.candidate_preferred_position ?? "",
          candidate_form_locale: c.properties.candidate_form_locale ?? "",
        });
      }
    }

    // 5. Merge and return
    const deals = dealResults.map((d) => {
      const contactId = dealToContact.get(d.id);
      const contact = contactId ? contactMap.get(contactId) : null;
      const createdAt = new Date(d.properties.createdate);
      const daysAgo = Math.floor(
        (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24),
      );
      return {
        id: d.id,
        dealname: d.properties.dealname,
        stage: d.properties.dealstage,
        createdAt: d.properties.createdate,
        daysAgo,
        contact: contact ?? null,
      };
    });

    return NextResponse.json({ stages, deals });
  } catch (err) {
    console.error("[hubspot/deals] GET failed:", err);
    return NextResponse.json(
      { error: "Failed to fetch HubSpot data" },
      { status: 502 },
    );
  }
}
