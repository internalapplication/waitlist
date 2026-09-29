import { generateWaitlistHtml } from "@/lib/ai/groq";
import { pickDesignIndex } from "@/lib/ai/prompts";
import { HttpError } from "@/lib/http";
import { enforceRateLimit } from "@/lib/rate-limit";
import { MAX_GENERATIONS } from "@/lib/utils";
import {
  claimGeneration,
  completeGeneration,
  generationsUsed,
  getProjectByUserId,
  releaseGeneration,
  toPublicProject,
  toUsage,
} from "@/services/project.service";
import { getPaidState } from "@/services/user.service";
import type { GenerateResponse } from "@/types/project";

const GENERATION_RATE_LIMIT = { limit: 5, windowMs: 10 * 60 * 1000 };

function limitReached(): HttpError {
  return new HttpError(
    403,
    `You have used all ${MAX_GENERATIONS} generations included with your purchase.`,
    "generation_limit_reached",
  );
}

export async function generateForUser(input: {
  clerkUserId: string;
  description?: string;
  regenerate: boolean;
}): Promise<GenerateResponse> {
  const { clerkUserId, regenerate } = input;

  // 1. Payment must be verified in Clerk (set only by the signed Dodo webhook).
  const paid = await getPaidState(clerkUserId);
  if (!paid.hasPaid) {
    throw new HttpError(402, "Payment has not been confirmed yet.", "payment_required");
  }

  const paymentId = paid.paymentId ?? "unknown";
  const existing = await getProjectByUserId(clerkUserId);

  // 2. Re-using a finished page is free and does not call Groq again.
  if (!regenerate && existing?.status === "completed" && existing.generatedHtml) {
    return {
      project: toPublicProject(existing, true),
      html: existing.generatedHtml,
      reused: true,
      usage: toUsage(existing, paymentId),
    };
  }

  // Quick check so a user with no generations left is not rate-limited or sent to Groq.
  // The claim below re-checks atomically, and that is the check that really enforces the limit.
  if (generationsUsed(existing, paymentId) >= MAX_GENERATIONS) throw limitReached();

  // 3. Pick the description: regeneration always keeps the original idea.
  const description = regenerate
    ? existing?.businessDescription
    : (input.description ?? existing?.businessDescription);
  if (!description) {
    throw new HttpError(400, "Describe your SaaS or business first.", "missing_description");
  }

  enforceRateLimit(
    `generate:${clerkUserId}`,
    GENERATION_RATE_LIMIT,
    "You are generating too quickly.",
  );

  // 4. Claim the project so two requests cannot run at once.
  const claim = await claimGeneration(clerkUserId, description, paymentId, MAX_GENERATIONS);
  if (!claim.claimed) {
    if (claim.reason === "limit") throw limitReached();
    throw new HttpError(409, "Your page is already being generated. Please wait a moment.", "already_generating");
  }
  const { previous } = claim;

  const hadHtml = Boolean(previous?.generatedHtml ?? existing?.generatedHtml);
  const designIndex = pickDesignIndex(previous?.designIndex ?? existing?.designIndex);

  try {
    const page = await generateWaitlistHtml({ description, directionIndex: designIndex, regenerate });
    const project = await completeGeneration(clerkUserId, {
      html: page.html,
      name: page.name,
      designIndex,
    });
    return { project: toPublicProject(project, true), html: page.html, usage: toUsage(project, paymentId) };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Generation failed.";
    await releaseGeneration(clerkUserId, hadHtml, message).catch((releaseError) =>
      console.error("[generation] could not release project:", releaseError),
    );
    throw error;
  }
}
