/**
 * GET /api/telegram/diag
 * Temporary diagnostic endpoint — tests Paperclip API connectivity from Vercel.
 * Protected by CRON_SECRET. Remove after debugging.
 */
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const secret = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && secret !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiUrl = process.env.PAPERCLIP_API_URL ?? "https://app.paperclip.ing";
  const botKey = process.env.PAPERCLIP_BOT_API_KEY ?? "";
  const companyId = process.env.PAPERCLIP_COMPANY_ID ?? "";

  const result: Record<string, unknown> = {
    apiUrl,
    botKeySet: !!botKey,
    botKeyPrefix: botKey ? botKey.slice(0, 12) + "..." : null,
    companyId,
  };

  // Test 1: Can we reach the Paperclip API at all?
  try {
    const pingRes = await fetch(`${apiUrl}/api/agents/me`, {
      headers: { Authorization: `Bearer ${botKey}` },
    });
    result.pingStatus = pingRes.status;
    result.pingBody = await pingRes.text();
  } catch (e) {
    result.pingError = String(e);
  }

  // Test 2: Company issues list
  try {
    const issuesRes = await fetch(
      `${apiUrl}/api/companies/${companyId}/issues?status=todo,in_progress,blocked&limit=3`,
      { headers: { Authorization: `Bearer ${botKey}` } },
    );
    result.issuesStatus = issuesRes.status;
    result.issuesBody = await issuesRes.text();
  } catch (e) {
    result.issuesError = String(e);
  }

  return NextResponse.json(result);
}
