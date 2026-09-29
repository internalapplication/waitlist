import { clerkClient } from "@clerk/nextjs/server";
import { getClerkProfile } from "@/lib/auth/clerk";
import { HttpError } from "@/lib/http";
import type { PaymentStatus } from "@/types/payment";
import type { PaidState } from "@/types/user";

/**
 * Clerk is the only store for who has paid. State lives in the user's PRIVATE
 * metadata: it can be written only with the secret key and never reaches the browser.
 * Keys are flat on purpose so partial updates are simple and safe to repeat.
 */

const STATUSES: PaymentStatus[] = ["pending", "paid", "failed", "refunded"];

function str(value: unknown): string | null {
  return typeof value === "string" && value ? value : null;
}

function strList(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && item !== "") : [];
}

function readState(meta: Record<string, unknown>): PaidState {
  const status = str(meta.paymentStatus);
  return {
    hasPaid: meta.hasPaid === true,
    paymentStatus: status && (STATUSES as string[]).includes(status) ? (status as PaymentStatus) : null,
    paymentRef: str(meta.paymentRef),
    paymentId: str(meta.paymentId),
    paymentIds: strList(meta.paymentIds),
    lastRefundedPaymentId: str(meta.lastRefundedPaymentId),
    paymentUpdatedAt: str(meta.paymentUpdatedAt),
  };
}

async function writeState(clerkUserId: string, data: Record<string, unknown>): Promise<void> {
  const client = await clerkClient();
  await client.users.updateUserMetadata(clerkUserId, {
    privateMetadata: { ...data, paymentUpdatedAt: new Date().toISOString() },
  });
}

/** Fresh read from Clerk. This is what /api/generate trusts. */
export async function getPaidState(clerkUserId: string): Promise<PaidState> {
  const client = await clerkClient();
  const user = await client.users.getUser(clerkUserId);
  return readState(user.privateMetadata as Record<string, unknown>);
}

/** Same as getPaidState, but returns null when Clerk has no such user (used by the webhook). */
export async function getPaidStateOrNull(clerkUserId: string): Promise<PaidState | null> {
  try {
    return await getPaidState(clerkUserId);
  } catch (error) {
    if ((error as { status?: number }).status === 404) return null;
    throw error;
  }
}

/** Email and name for the checkout page, taken from the signed-in Google account. */
export async function getCheckoutIdentity(): Promise<{ email: string; name?: string }> {
  const profile = await getClerkProfile();
  if (!profile.email) {
    throw new HttpError(400, "Your Google account has no email address we can use.", "no_email");
  }
  return { email: profile.email, name: profile.name };
}

export async function markPaymentPending(clerkUserId: string, paymentRef: string): Promise<void> {
  await writeState(clerkUserId, { paymentStatus: "pending", paymentRef });
}

/** Only a still-pending checkout with the same reference can be marked failed. */
export async function markPaymentFailed(clerkUserId: string, paymentRef: string): Promise<boolean> {
  const state = await getPaidStateOrNull(clerkUserId);
  if (!state || state.hasPaid || state.paymentStatus !== "pending" || state.paymentRef !== paymentRef) {
    return false;
  }
  await writeState(clerkUserId, { paymentStatus: "failed" });
  return true;
}

/** Called only from the signature-verified webhook. Safe to repeat. */
export async function markPaid(
  clerkUserId: string,
  paymentId: string,
): Promise<"processed" | "duplicate" | "ignored"> {
  const state = await getPaidStateOrNull(clerkUserId);
  if (!state) return "ignored";

  // A late redelivery of a payment that was already refunded must not unlock again.
  if (state.lastRefundedPaymentId === paymentId) return "duplicate";
  // A user can pay more than once (a new purchase after the 5 generations are used), so remember
  // every payment already applied. Redelivering an OLD payment must not undo the newest one.
  if (state.paymentIds.includes(paymentId)) return "duplicate";
  if (state.hasPaid && state.paymentStatus === "paid" && state.paymentId === paymentId) return "duplicate";

  const applied = [...state.paymentIds, ...(state.paymentId ? [state.paymentId] : []), paymentId];
  const paymentIds = [...new Set(applied)].slice(-20);

  await writeState(clerkUserId, { hasPaid: true, paymentStatus: "paid", paymentId, paymentIds });
  return "processed";
}

/** A refund only removes access if it is for the payment that granted it. */
export async function markRefunded(
  clerkUserId: string,
  paymentId: string,
): Promise<"processed" | "duplicate" | "ignored"> {
  const state = await getPaidStateOrNull(clerkUserId);
  if (!state) return "ignored";
  if (state.lastRefundedPaymentId === paymentId) return "duplicate";
  if (state.paymentId && state.paymentId !== paymentId) return "ignored";

  await writeState(clerkUserId, {
    hasPaid: false,
    paymentStatus: "refunded",
    lastRefundedPaymentId: paymentId,
  });
  return "processed";
}
