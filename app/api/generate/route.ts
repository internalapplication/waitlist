import { requireClerkUserId } from "@/lib/auth/clerk";
import { errorResponse, noStoreJson } from "@/lib/http";
import { assertSameOrigin } from "@/lib/security";
import { generateBodySchema, parseBody, readJson } from "@/lib/validation/project";
import { generateForUser } from "@/services/generation.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Groq can take a while for a full page.
export const maxDuration = 120;

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const clerkUserId = await requireClerkUserId();
    const body = parseBody(generateBodySchema, await readJson(request));

    const result = await generateForUser({
      clerkUserId,
      description: body.description,
      regenerate: body.regenerate === true,
    });
    return noStoreJson(result);
  } catch (error) {
    return errorResponse(error);
  }
}
