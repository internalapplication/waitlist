import { createHmac, timingSafeEqual } from "node:crypto";

interface VerifyInput {
  rawBody: string;
  id: string | null;
  timestamp: string | null;
  signature: string | null;
  secret: string;
  /** Maximum clock skew in seconds. */
  toleranceSeconds?: number;
}

/**
 * Verifies a Standard Webhooks signature (the scheme Dodo Payments uses).
 *
 * signed content = `${webhook-id}.${webhook-timestamp}.${raw body}`
 * signature      = base64(HMAC-SHA256(secretBytes, signed content))
 * header         = space-separated list like `v1,<signature> v1,<signature>`
 */
export function verifyDodoWebhook({
  rawBody,
  id,
  timestamp,
  signature,
  secret,
  toleranceSeconds = 300,
}: VerifyInput): boolean {
  if (!id || !timestamp || !signature || !secret) return false;

  const timestampSeconds = Number(timestamp);
  if (!Number.isFinite(timestampSeconds)) return false;
  const skew = Math.abs(Math.floor(Date.now() / 1000) - timestampSeconds);
  if (skew > toleranceSeconds) return false;

  const key = Buffer.from(secret.startsWith("whsec_") ? secret.slice(6) : secret, "base64");
  const expected = createHmac("sha256", key).update(`${id}.${timestamp}.${rawBody}`).digest();

  for (const part of signature.split(" ")) {
    const [version, value] = part.split(",");
    if (version !== "v1" || !value) continue;
    const candidate = Buffer.from(value, "base64");
    if (candidate.length === expected.length && timingSafeEqual(candidate, expected)) return true;
  }
  return false;
}
