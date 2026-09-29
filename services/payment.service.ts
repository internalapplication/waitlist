import { getPaymentMetadata } from "@/lib/payments/dodo";
import { markPaid, markPaymentFailed, markRefunded } from "@/services/user.service";

interface DodoEventData {
  payment_id?: string;
  status?: string;
  metadata?: Record<string, string> | null;
  product_cart?: { product_id?: string }[] | null;
}

export interface DodoEvent {
  type?: string;
  data?: DodoEventData;
}

export type WebhookResult = "duplicate" | "processed" | "ignored";

/**
 * The user is identified by the `clerkUserId` we put in the checkout metadata.
 * Dodo signs the whole event, so this value can be trusted after verification.
 * If an event carries no metadata (some refund events), it is read from the payment itself.
 */
async function resolveUserId(data: DodoEventData): Promise<string | null> {
  const fromEvent = data.metadata?.clerkUserId;
  if (fromEvent) return fromEvent;
  if (!data.payment_id) return null;
  const metadata = await getPaymentMetadata(data.payment_id);
  return metadata?.clerkUserId ?? null;
}

async function handlePaymentSucceeded(data: DodoEventData): Promise<WebhookResult> {
  if (!data.payment_id) {
    console.warn("[dodo] payment.succeeded without a payment id");
    return "ignored";
  }
  if (data.status && data.status !== "succeeded") return "ignored";

  const userId = await resolveUserId(data);
  if (!userId) {
    console.warn("[dodo] payment.succeeded for an unknown user:", data.payment_id);
    return "ignored";
  }

  // The payment must be for our product. (Amount is not compared on purpose:
  // Dodo may charge in the buyer's local currency and add tax.)
  const expectedProduct = process.env.DODO_PRODUCT_ID;
  if (expectedProduct && Array.isArray(data.product_cart) && data.product_cart.length > 0) {
    if (!data.product_cart.some((item) => item.product_id === expectedProduct)) {
      console.warn("[dodo] payment for a different product ignored:", data.payment_id);
      return "ignored";
    }
  }

  return markPaid(userId, data.payment_id);
}

async function handlePaymentNotCompleted(data: DodoEventData): Promise<WebhookResult> {
  const userId = data.metadata?.clerkUserId;
  const paymentRef = data.metadata?.paymentRef;
  if (!userId || !paymentRef) return "ignored";
  return (await markPaymentFailed(userId, paymentRef)) ? "processed" : "ignored";
}

async function handleRefund(data: DodoEventData): Promise<WebhookResult> {
  if (!data.payment_id) return "ignored";
  const userId = await resolveUserId(data);
  if (!userId) return "ignored";
  return markRefunded(userId, data.payment_id);
}

/**
 * Applies a signature-verified Dodo event. There is no event log: every change is
 * an idempotent write to the user's Clerk metadata, so duplicate deliveries are harmless.
 */
export async function processDodoEvent(event: DodoEvent): Promise<WebhookResult> {
  const data = event.data ?? {};

  switch (event.type) {
    case "payment.succeeded":
      return handlePaymentSucceeded(data);
    case "payment.failed":
    case "payment.cancelled":
      return handlePaymentNotCompleted(data);
    case "refund.succeeded":
      return handleRefund(data);
    default:
      return "ignored";
  }
}
