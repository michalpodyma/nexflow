import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, company, email, phone, type, message } = body;

  if (!process.env.RESEND_API_KEY) {
    console.error("[contact] RESEND_API_KEY not set — email not sent");
    return NextResponse.json({ ok: true });
  }

  const { Resend } = await import("resend");
  const resend = new Resend(process.env.RESEND_API_KEY);

  const typeLabel = type === "employer" ? "Pracodawca" : type === "worker" ? "Pracownik" : "Inne";

  await resend.emails.send({
    from: "formularz@nexflow.work",
    to: "hr@nexflow.work",
    replyTo: email,
    subject: `Nowe zapytanie od ${name} (${typeLabel})`,
    text: [
      `Imię i nazwisko: ${name}`,
      company ? `Firma: ${company}` : null,
      `E-mail: ${email}`,
      phone ? `Telefon: ${phone}` : null,
      `Rodzaj: ${typeLabel}`,
      ``,
      message,
    ]
      .filter(Boolean)
      .join("\n"),
  });

  return NextResponse.json({ ok: true });
}
