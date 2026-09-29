import { auth, currentUser } from "@clerk/nextjs/server";
import { HttpError } from "@/lib/http";

/** Returns the signed-in Clerk user id or throws a 401. */
export async function requireClerkUserId(): Promise<string> {
  const { userId } = await auth();
  if (!userId) {
    throw new HttpError(401, "Please sign in with Google to continue.", "unauthenticated");
  }
  return userId;
}

export async function getClerkProfile(): Promise<{ email?: string; name?: string }> {
  const user = await currentUser();
  if (!user) return {};

  const primary = user.emailAddresses.find((address) => address.id === user.primaryEmailAddressId);
  const email = (primary ?? user.emailAddresses[0])?.emailAddress;
  const name = [user.firstName, user.lastName].filter(Boolean).join(" ").trim() || undefined;
  return { email, name };
}
