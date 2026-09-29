import type { NextConfig } from "next";

const isProduction = process.env.NODE_ENV === "production";

/**
 * Clerk's frontend API host is encoded in the publishable key (pk_test_/pk_live_ + base64).
 * Reading it lets the CSP allow exactly your Clerk domain instead of a wildcard.
 */
function clerkFrontendHost(): string | null {
  const encoded = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.split("_")[2];
  if (!encoded) return null;
  try {
    const host = Buffer.from(encoded, "base64").toString("utf8").replace(/\$$/, "");
    return /^[a-z0-9.-]+$/i.test(host) ? host : null;
  } catch {
    return null;
  }
}

function contentSecurityPolicy(): string {
  const host = clerkFrontendHost();
  const clerk = ["https://*.clerk.accounts.dev", ...(host ? [`https://${host}`] : [])].join(" ");

  return [
    "default-src 'self'",
    // Next.js and Clerk inject small inline scripts, so 'unsafe-inline' is required here.
    `script-src 'self' 'unsafe-inline' ${clerk} https://challenges.cloudflare.com`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https://img.clerk.com",
    "font-src 'self' data:",
    `connect-src 'self' ${clerk} https://clerk-telemetry.com`,
    "frame-src 'self' https://challenges.cloudflare.com",
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join("; ");
}

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
  ...(isProduction
    ? [
        { key: "Strict-Transport-Security", value: "max-age=31536000" },
        {
          // Set CSP_MODE=report-only to log violations without blocking (for troubleshooting).
          key:
            process.env.CSP_MODE === "report-only"
              ? "Content-Security-Policy-Report-Only"
              : "Content-Security-Policy",
          value: contentSecurityPolicy(),
        },
      ]
    : []),
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

export default nextConfig;
