/**
 * POST /api/twilio-webhook
 *
 * @deprecated Screening now uses the Meta WhatsApp Business API.
 * Incoming candidate messages are handled by the backend at POST /api/webhooks/whatsapp.
 * This route is kept to avoid 404s on any stale Twilio webhook config but does no processing.
 */

// ─── Route handler ────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function POST(_req: Request): Promise<Response> {
  // Deprecated: screening now uses the Meta WhatsApp Business API.
  // New webhook: POST /api/webhooks/whatsapp (handled by backend)
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?><Response></Response>`,
    { status: 200, headers: { "Content-Type": "text/xml" } },
  );
}
