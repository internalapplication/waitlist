import { z } from "zod";
import { HttpError } from "@/lib/http";
import { MAX_DESCRIPTION_LENGTH, MIN_DESCRIPTION_LENGTH } from "@/lib/utils";

export const descriptionSchema = z
  .string({
    required_error: "Describe your SaaS or business.",
    invalid_type_error: "Describe your SaaS or business.",
  })
  .transform((value) => value.replace(/\u0000/g, "").replace(/\s+/g, " ").trim())
  .pipe(
    z
      .string()
      .min(MIN_DESCRIPTION_LENGTH, `Please describe your idea in at least ${MIN_DESCRIPTION_LENGTH} characters.`)
      .max(MAX_DESCRIPTION_LENGTH, `Please keep your description under ${MAX_DESCRIPTION_LENGTH} characters.`),
  );

export const checkoutBodySchema = z.object({
  description: descriptionSchema,
});

export const generateBodySchema = z.object({
  description: descriptionSchema.optional(),
  regenerate: z.boolean().optional(),
});

/** Parses an unknown JSON body or throws a 400 HttpError with a readable message. */
export function parseBody<T>(schema: z.ZodType<T, z.ZodTypeDef, unknown>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    const message = result.error.issues[0]?.message ?? "Invalid request.";
    throw new HttpError(400, message, "invalid_request");
  }
  return result.data;
}

const MAX_BODY_BYTES = 16 * 1024;

export async function readJson(request: Request): Promise<unknown> {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) {
    throw new HttpError(415, "Content-Type must be application/json.", "unsupported_media_type");
  }
  const declared = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) {
    throw new HttpError(413, "Request is too large.", "payload_too_large");
  }

  const text = await request.text();
  if (text.length > MAX_BODY_BYTES) {
    throw new HttpError(413, "Request is too large.", "payload_too_large");
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new HttpError(400, "Request body must be valid JSON.", "invalid_json");
  }
}
