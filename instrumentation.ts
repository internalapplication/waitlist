// Runs once when the server starts. It only logs, so a missing variable is visible in the
// Railway deploy logs instead of showing up later as a confusing 500 for a user.
const REQUIRED_ENV = [
  "NEXT_PUBLIC_APP_URL",
  "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
  "CLERK_SECRET_KEY",
  "MONGODB_URI",
  "DODO_PAYMENTS_API_KEY",
  "DODO_PAYMENTS_WEBHOOK_SECRET",
  "DODO_PRODUCT_ID",
  "GROQ_API_KEY",
];

export function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs" || process.env.NODE_ENV !== "production") return;

  const missing = REQUIRED_ENV.filter((name) => !process.env[name]);
  if (missing.length > 0) {
    console.error(`[startup] Missing environment variables: ${missing.join(", ")}`);
  }
  if (process.env.DODO_PAYMENTS_ENVIRONMENT !== "live_mode") {
    console.warn("[startup] DODO_PAYMENTS_ENVIRONMENT is not live_mode: payments use the Dodo TEST environment.");
  }
  if (process.env.NEXT_PUBLIC_APP_URL && !process.env.NEXT_PUBLIC_APP_URL.startsWith("https://")) {
    console.warn("[startup] NEXT_PUBLIC_APP_URL is not an https:// URL.");
  }
}
