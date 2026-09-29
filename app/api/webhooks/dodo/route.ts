import { NextResponse } from "next/server";
import { verifyDodoWebhook } from "@/lib/payments/webhook-verification";
import { processDodoEvent, type DodoEvent } from "@/services/payment.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_WEBHOOK_BYTES = 256 * 1024;

export async function POST(request: Request) {
  const secret = process.env.DODO_PAYMENTS_WEBHOOK_SECRET;
  if (!secret) {
    console.error("[dodo] DODO_PAYMENTS_WEBHOOK_SECRET is not set.");
    return NextResponse.json({ error: "Webhook is not configured." }, { status: 500 });
  }

  // Webhook payloads are small. Refuse anything large before doing any work.
  const declared = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(declared) && declared > MAX_WEBHOOK_BYTES) {
    return NextResponse.json({ error: "Payload too large." }, { status: 413 });
  }

  // The signature covers the exact raw body, so read it as text before parsing.
  const rawBody = await request.text();
  if (rawBody.length > MAX_WEBHOOK_BYTES) {
    return NextResponse.json({ error: "Payload too large." }, { status: 413 });
  }
  const eventId = request.headers.get("webhook-id");

  const verified = verifyDodoWebhook({
    rawBody,
    id: eventId,
    timestamp: request.headers.get("webhook-timestamp"),
    signature: request.headers.get("webhook-signature"),
    secret,
  });
  if (!verified || !eventId) {
    return NextResponse.json({ error: "Invalid signature." }, { status: 401 });
  }

  let event: DodoEvent;
  try {
    event = JSON.parse(rawBody) as DodoEvent;
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  try {
    const result = await processDodoEvent(event);
    return NextResponse.json({ received: true, result });
  } catch (error) {
    // A 5xx makes Dodo retry the delivery later.
    console.error("[dodo] webhook processing failed:", error);
    return NextResponse.json({ error: "Processing failed." }, { status: 500 });
  }
}
