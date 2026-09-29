import { randomUUID } from "node:crypto";
import { requireClerkUserId } from "@/lib/auth/clerk";
import { errorResponse, HttpError, noStoreJson } from "@/lib/http";
import { createCheckoutSession } from "@/lib/payments/dodo";
import { assertSameOrigin } from "@/lib/security";
import { enforceRateLimit } from "@/lib/rate-limit";
import { checkoutBodySchema, parseBody, readJson } from "@/lib/validation/project";
import type { Project } from "@/types/project";
import { getProjectByUserId, saveDraftProject, toUsage } from "@/services/project.service";
import {
  getCheckoutIdentity,
  getPaidState,
  markPaymentFailed,
  markPaymentPending,
} from "@/services/user.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const clerkUserId = await requireClerkUserId();
    const { description } = parseBody(checkoutBodySchema, await readJson(request));

    enforceRateLimit(
      `checkout:${clerkUserId}`,
      { limit: 10, windowMs: 10 * 60 * 1000 },
      "Too many checkout attempts.",
    );

    const paid = await getPaidState(clerkUserId);

    // A paying user can buy again only once all generations of the previous payment are used.
    // Their saved page stays untouched; the new payment just starts a fresh count.
    const isRepurchase = paid.hasPaid;
    let project: Project | null = null;
    if (isRepurchase) {
      project = await getProjectByUserId(clerkUserId);
      if (toUsage(project, paid.paymentId ?? "unknown").remaining > 0) {
        throw new HttpError(
          409,
          "You still have generations left. Use them before buying more.",
          "already_paid",
        );
      }
    }

    const identity = await getCheckoutIdentity();

    const paymentRef = randomUUID();
    if (!isRepurchase) {
      // Keep the idea server-side too, in case the browser copy is lost.
      project = await saveDraftProject(clerkUserId, description, "pending_payment");
      await markPaymentPending(clerkUserId, paymentRef);
    }

    const appUrl = (process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin).replace(/\/+$/, "");

    try {
      const session = await createCheckoutSession({
        email: identity.email,
        name: identity.name,
        returnUrl: `${appUrl}/?checkout=return`,
        metadata: {
          clerkUserId,
          paymentRef,
          projectId: project?._id ? project._id.toString() : "",
        },
      });
      return noStoreJson({ checkoutUrl: session.checkoutUrl });
    } catch (error) {
      await markPaymentFailed(clerkUserId, paymentRef).catch(() => undefined);
      throw error;
    }
  } catch (error) {
    return errorResponse(error);
  }
}
