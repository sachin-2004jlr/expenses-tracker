"use server";

import { isAuthConfigured, signIn, signOut } from "@/lib/auth";

/** Start the Google OAuth flow; lands on the dashboard afterwards. */
export async function signInWithGoogleAction(redirectTo = "/dashboard"): Promise<void> {
  if (!isAuthConfigured()) return;
  await signIn("google", { redirectTo });
}

/** End the session and return to the landing page. */
export async function signOutAction(): Promise<void> {
  if (!isAuthConfigured()) return;
  await signOut({ redirectTo: "/" });
}
