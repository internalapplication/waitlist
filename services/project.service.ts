import { projectsCollection } from "@/models/project.model";
import { MAX_GENERATIONS } from "@/lib/utils";
import type { GenerationUsage, Project, PublicProject } from "@/types/project";

/**
 * A "generating" project older than this is treated as abandoned. It must be longer than the
 * slowest possible run (two Groq attempts of up to 90 s each), otherwise a second run could
 * start while the first is still going and push the count past the limit.
 */
export const GENERATION_STALE_MS = 5 * 60 * 1000;

export function isGenerationInProgress(project: Project | null): boolean {
  return (
    project?.status === "generating" && Date.now() - project.updatedAt.getTime() < GENERATION_STALE_MS
  );
}

/** Generations used under the current payment. A new payment starts again at 0. */
export function generationsUsed(project: Project | null, paymentId: string | null): number {
  if (!project || !paymentId || project.quotaPaymentId !== paymentId) return 0;
  return project.generationCount ?? 0;
}

export function toUsage(project: Project | null, paymentId: string | null): GenerationUsage {
  const used = Math.min(generationsUsed(project, paymentId), MAX_GENERATIONS);
  return { used, limit: MAX_GENERATIONS, remaining: MAX_GENERATIONS - used };
}

/** `includeHtml` must only be true for users with verified payment. */
export function toPublicProject(project: Project, includeHtml: boolean): PublicProject {
  return {
    id: project._id ? project._id.toString() : project.userId,
    businessDescription: project.businessDescription,
    generatedName: project.generatedName,
    generatedHtml: includeHtml ? project.generatedHtml : undefined,
    status: project.status,
    updatedAt: project.updatedAt.toISOString(),
  };
}

export async function getProjectByUserId(userId: string): Promise<Project | null> {
  const projects = await projectsCollection();
  return projects.findOne({ userId });
}

/** Creates or updates the user's single current project before checkout. */
export async function saveDraftProject(
  userId: string,
  businessDescription: string,
  status: "draft" | "pending_payment",
): Promise<Project> {
  const projects = await projectsCollection();
  const now = new Date();

  const project = await projects.findOneAndUpdate(
    { userId },
    {
      $set: { businessDescription, status, updatedAt: now },
      $setOnInsert: { createdAt: now, generationCount: 0 },
    },
    { upsert: true, returnDocument: "after" },
  );
  if (!project) throw new Error("Failed to save project draft.");
  return project;
}

export type ClaimResult =
  | { claimed: true; previous: Project | null }
  | { claimed: false; reason: "busy" | "limit" };

/**
 * Atomically marks the project as "generating" if (a) no other generation is running
 * and (b) the user still has generations left under this payment. Both checks live in
 * the same database filter, so parallel requests cannot slip past the limit.
 */
export async function claimGeneration(
  userId: string,
  businessDescription: string,
  paymentId: string,
  limit: number,
): Promise<ClaimResult> {
  const projects = await projectsCollection();
  const now = new Date();
  const staleBefore = new Date(now.getTime() - GENERATION_STALE_MS);

  // First run under a new payment (or an older project without a quota): start the count at 0.
  await projects.updateOne(
    { userId, quotaPaymentId: { $ne: paymentId } },
    { $set: { quotaPaymentId: paymentId, generationCount: 0 } },
  );

  try {
    const previous = await projects.findOneAndUpdate(
      {
        userId,
        generationCount: { $not: { $gte: limit } },
        $or: [{ status: { $ne: "generating" } }, { updatedAt: { $lt: staleBefore } }],
      },
      {
        $set: { businessDescription, status: "generating", updatedAt: now },
        $setOnInsert: { createdAt: now, generationCount: 0, quotaPaymentId: paymentId },
      },
      { upsert: true, returnDocument: "before" },
    );
    return { claimed: true, previous };
  } catch (error) {
    // Duplicate key on the unique userId index: the project exists but did not match the filter.
    if ((error as { code?: number }).code === 11000) {
      const current = await projects.findOne({ userId });
      return { claimed: false, reason: (current?.generationCount ?? 0) >= limit ? "limit" : "busy" };
    }
    throw error;
  }
}

export async function completeGeneration(
  userId: string,
  result: { html: string; name: string; designIndex: number },
): Promise<Project> {
  const projects = await projectsCollection();
  const updated = await projects.findOneAndUpdate(
    { userId },
    {
      $set: {
        generatedHtml: result.html,
        generatedName: result.name,
        designIndex: result.designIndex,
        status: "completed",
        updatedAt: new Date(),
      },
      $inc: { generationCount: 1 },
      $unset: { lastError: "" },
    },
    { returnDocument: "after" },
  );
  if (!updated) throw new Error("Project disappeared during generation.");
  return updated;
}

/** After a failed run: keep an earlier page if there is one, otherwise mark failed. */
export async function releaseGeneration(userId: string, hadHtml: boolean, error: string): Promise<void> {
  const projects = await projectsCollection();
  await projects.updateOne(
    { userId, status: "generating" },
    { $set: { status: hadHtml ? "completed" : "failed", lastError: error.slice(0, 300), updatedAt: new Date() } },
  );
}
