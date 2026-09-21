import { createAuthClient } from "better-auth/react";

/**
 * Better Auth client for this React SPA (browser-side). Talks to this app's
 * own Better Auth at same-origin `/api/auth/*` — plain cookie-based session,
 * no popups or bearer tokens needed.
 */
export const authClient = createAuthClient({});

/**
 * True when sign-in UI should be shown — i.e. whenever `VITE_AUTH_ENABLED` is
 * not `"false"`. With the key unset or `"true"`, sign-in is real; with it
 * `"false"`, the app falls back to a shared dev user (see `use-current-user`).
 */
export const authEnabled = import.meta.env.VITE_AUTH_ENABLED !== "false";

/** Start Google sign-in (full-page redirect). */
export async function signInGoogle(callbackURL = "/"): Promise<void> {
  const { error } = await authClient.signIn.social({ provider: "google", callbackURL });
  if (error) throw new Error(error.message ?? "Не вдалося увійти через Google.");
}

/** Sign out of this app's session and redirect. */
export async function signOut(redirectTo = "/"): Promise<void> {
  const { error } = await authClient.signOut();
  if (error) throw new Error(error.message ?? "Не вдалося вийти.");
  window.location.href = redirectTo;
}
