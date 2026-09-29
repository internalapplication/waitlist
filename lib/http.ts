import { NextResponse } from "next/server";

/** An error that is safe to show to the user. */
export class HttpError extends Error {
  status: number;
  code: string;
  extra?: Record<string, unknown>;

  constructor(status: number, message: string, code = "error", extra?: Record<string, unknown>) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.code = code;
    this.extra = extra;
  }
}

/** Converts any thrown value into a JSON response without leaking internals. */
export function errorResponse(error: unknown): NextResponse {
  if (error instanceof HttpError) {
    const headers: Record<string, string> = {};
    const retryAfter = error.extra?.retryAfter;
    if (typeof retryAfter === "number") headers["Retry-After"] = String(retryAfter);
    return NextResponse.json(
      { error: error.message, code: error.code, ...(error.extra ?? {}) },
      { status: error.status, headers },
    );
  }

  console.error("[api] unexpected error:", error);
  return NextResponse.json(
    { error: "Something went wrong on our side. Please try again.", code: "internal_error" },
    { status: 500 },
  );
}

export function noStoreJson(body: unknown, init?: ResponseInit): NextResponse {
  const response = NextResponse.json(body, init);
  response.headers.set("Cache-Control", "no-store");
  return response;
}
