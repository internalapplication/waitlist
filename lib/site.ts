/** Public base URL of the app. Falls back to localhost if the variable is missing or invalid. */
export function getAppUrl(): URL {
  try {
    return new URL(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000");
  } catch {
    return new URL("http://localhost:3000");
  }
}
