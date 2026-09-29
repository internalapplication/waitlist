import { HttpError } from "@/lib/http";

function firstHeaderValue(value: string | null): string | null {
  return value ? value.split(",")[0].trim().toLowerCase() : null;
}

/**
 * CSRF defence for cookie-authenticated POST routes. Browsers always send `Sec-Fetch-Site`
 * and `Origin` on cross-site requests, so a request coming from another site is refused.
 * Requests without these headers (curl, server-to-server) carry no browser cookies, so
 * they cannot be a CSRF attack and are left to the normal auth check.
 */
export function assertSameOrigin(request: Request): void {
  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite && fetchSite !== "same-origin" && fetchSite !== "none") {
    throw new HttpError(403, "This request was blocked for security reasons.", "invalid_origin");
  }

  const origin = request.headers.get("origin");
  if (!origin) return;

  let originHost: string;
  try {
    originHost = new URL(origin).host.toLowerCase();
  } catch {
    throw new HttpError(403, "This request was blocked for security reasons.", "invalid_origin");
  }

  const allowed = new Set<string>();
  for (const name of ["x-forwarded-host", "host"]) {
    const host = firstHeaderValue(request.headers.get(name));
    if (host) allowed.add(host);
  }
  if (process.env.NEXT_PUBLIC_APP_URL) {
    try {
      allowed.add(new URL(process.env.NEXT_PUBLIC_APP_URL).host.toLowerCase());
    } catch {
      /* ignore an invalid value */
    }
  }

  if (!allowed.has(originHost)) {
    throw new HttpError(403, "This request was blocked for security reasons.", "invalid_origin");
  }
}
