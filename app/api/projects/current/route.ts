import { requireClerkUserId } from "@/lib/auth/clerk";
import { errorResponse, noStoreJson } from "@/lib/http";
import { enforceRateLimit } from "@/lib/rate-limit";
import { getProjectByUserId, isGenerationInProgress, toPublicProject, toUsage } from "@/services/project.service";
import { getPaidState } from "@/services/user.service";
import type { Project, CurrentProjectResponse } from "@/types/project";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const clerkUserId = await requireClerkUserId();
    // The page polls this while waiting for a payment or a generation; leave plenty of room.
    enforceRateLimit(`state:${clerkUserId}`, { limit: 90, windowMs: 60 * 1000 }, "Too many requests.");
    const paid = await getPaidState(clerkUserId);

    // Saved pages live in MongoDB. If it is briefly down, payment state must still load,
    // otherwise a paying user would be stuck on "Processing payment…".
    let project: Project | null = null;
    try {
      project = await getProjectByUserId(clerkUserId);
    } catch (error) {
      console.error("[projects/current] could not load saved project:", error);
    }

    const body: CurrentProjectResponse = {
      user: { hasPaid: paid.hasPaid },
      // The generated HTML is only ever returned to users with verified payment.
      project: project ? toPublicProject(project, paid.hasPaid) : null,
      payment:
        paid.paymentStatus && paid.paymentUpdatedAt
          ? { status: paid.paymentStatus, updatedAt: paid.paymentUpdatedAt }
          : null,
      generation: { inProgress: isGenerationInProgress(project) },
      usage: toUsage(project, paid.paymentId ?? "unknown"),
    };
    return noStoreJson(body);
  } catch (error) {
    return errorResponse(error);
  }
}
