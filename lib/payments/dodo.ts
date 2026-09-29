import { HttpError } from "@/lib/http";

function baseUrl(): string {
  return process.env.DODO_PAYMENTS_ENVIRONMENT === "live_mode"
    ? "https://live.dodopayments.com"
    : "https://test.dodopayments.com";
}

export interface CheckoutSession {
  sessionId: string;
  checkoutUrl: string;
}

/**
 * Creates a Dodo Payments checkout session for the one-time product
 * (DODO_PRODUCT_ID must be a one-time $0.99 USD product in your Dodo dashboard).
 */
export async function createCheckoutSession(input: {
  email: string;
  name?: string;
  returnUrl: string;
  metadata: Record<string, string>;
}): Promise<CheckoutSession> {
  const apiKey = process.env.DODO_PAYMENTS_API_KEY;
  const productId = process.env.DODO_PRODUCT_ID;
  if (!apiKey || !productId) {
    console.error("[dodo] DODO_PAYMENTS_API_KEY or DODO_PRODUCT_ID is not set.");
    throw new HttpError(503, "Payments are not configured yet. Please try again later.", "payments_unavailable");
  }

  let response: Response;
  try {
    response = await fetch(`${baseUrl()}/checkouts`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        product_cart: [{ product_id: productId, quantity: 1 }],
        customer: { email: input.email, ...(input.name ? { name: input.name } : {}) },
        return_url: input.returnUrl,
        metadata: input.metadata,
      }),
      signal: AbortSignal.timeout(15_000),
    });
  } catch (error) {
    console.error("[dodo] checkout request failed:", error);
    throw new HttpError(502, "We could not reach the payment provider. Please try again.", "payments_unreachable");
  }

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    console.error(`[dodo] checkout HTTP ${response.status}:`, detail.slice(0, 500));
    throw new HttpError(502, "We could not start checkout. Please try again.", "checkout_failed");
  }

  const data = (await response.json()) as { session_id?: string; checkout_url?: string };
  if (!data.session_id || !data.checkout_url || !data.checkout_url.startsWith("https://")) {
    console.error("[dodo] unexpected checkout response:", data);
    throw new HttpError(502, "We could not start checkout. Please try again.", "checkout_failed");
  }
  return { sessionId: data.session_id, checkoutUrl: data.checkout_url };
}

/** Reads the metadata we attached at checkout from an existing Dodo payment. */
export async function getPaymentMetadata(paymentId: string): Promise<Record<string, string> | null> {
  const apiKey = process.env.DODO_PAYMENTS_API_KEY;
  if (!apiKey) return null;

  try {
    const response = await fetch(`${baseUrl()}/payments/${encodeURIComponent(paymentId)}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) return null;
    const data = (await response.json()) as { metadata?: Record<string, string> | null };
    return data.metadata ?? null;
  } catch (error) {
    console.error("[dodo] payment lookup failed:", error);
    return null;
  }
}
