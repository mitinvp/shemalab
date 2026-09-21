/**
 * Self-hosted Better Auth for THIS app (server-only).
 *
 * The app runs its own Better Auth at `/api/auth/*`, so the session cookie
 * stays on this app's own origin. Sign-in is a normal, direct Google OAuth
 * client (`GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`, created in Google Cloud
 * Console) plus an optional local email/password fallback — works on any
 * host, no third-party auth broker involved.
 *
 * Two modes:
 *   - On (`VITE_AUTH_ENABLED=true` and `DATABASE_URL` set): real sign-in,
 *     persisted in Postgres.
 *   - Off (`VITE_AUTH_ENABLED=false`): no providers; `requireUserId` resolves
 *     a shared dev user with no database configured, and throws fail-closed
 *     once `DATABASE_URL` is set (see `verify.server.ts`).
 *
 * NEVER import this from client code — it pulls in `pg` and server-only
 * Better Auth internals. The client uses `@/lib/auth/client`; components read
 * the user via `@/lib/auth/use-current-user`; server functions get a verified
 * id via `@/lib/auth/middleware`.
 */
import { betterAuth } from "better-auth";
import { bearer } from "better-auth/plugins";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import { getCookie } from "@tanstack/react-start/server";
import { randomBytes } from "node:crypto";
import { Pool } from "pg";
import { ensureDbReady, getPglite } from "../db";
import { emailAndPasswordEnabled } from "./email-password";
import { pgliteDialect } from "./pglite-dialect";

// Kick (and share) PGLite bootstrap as soon as the auth server module loads.
void ensureDbReady();

/**
 * Local-dev secret must outlive module reloads: PGLite (and its session rows)
 * is stored on `globalThis`, so an HMR re-eval of this file must NOT mint a
 * new signing secret or every existing session becomes invalid mid-dev.
 * Process restart clears both the secret and PGLite together.
 */
const globalAuthRef = globalThis as typeof globalThis & {
  __schemalabAuthDevSecret__?: string;
};
function devAuthSecret(): string {
  globalAuthRef.__schemalabAuthDevSecret__ ??= randomBytes(32).toString("hex");
  return globalAuthRef.__schemalabAuthDevSecret__;
}

/** Read an env var, treating empty/whitespace as unset. */
const env = (key: string): string | undefined => {
  const value = process.env[key]?.trim();
  return value ? value : undefined;
};

// Explicit off-switch. Set `VITE_AUTH_ENABLED=false` to force auth off
// everywhere (dev user); "true" (or unset) means auth is meant to be on.
const authDisabled = env("VITE_AUTH_ENABLED") === "false";

/** True when sign-in is meant to be active (real auth is enforced). */
export const authConfigured = !authDisabled;

// This app's own Better Auth origin. When deployed, set BETTER_AUTH_URL to
// the app's public URL. Local dev falls back to localhost:8080.
const explicitBaseURL = env("BETTER_AUTH_URL");
// Browsers may send Origin as any of these for the same local server —
// trusting only `localhost` rejects `127.0.0.1` and breaks email/password
// with "Invalid origin".
const LOCAL_DEV_ORIGINS: string[] = [
  "http://localhost:8080",
  "http://127.0.0.1:8080",
  "http://[::1]:8080",
];
const baseURL = explicitBaseURL ?? "http://localhost:8080";

// Origins Better Auth accepts on credentialed POSTs (sign-up/sign-in, etc.).
// Missing entries here surface as FORBIDDEN "Invalid origin".
const trustedOrigins: string[] = explicitBaseURL
  ? [explicitBaseURL, ...LOCAL_DEV_ORIGINS]
  : LOCAL_DEV_ORIGINS;

const databaseUrl = env("DATABASE_URL");

// Real Postgres when `DATABASE_URL` is set (deployed apps), else the app's
// embedded PGLite (local dev) via a Kysely dialect — so Better Auth persists
// to the SAME DB as app data, including email/password users. Both use the
// Better Auth schema from `migrations/0001_auth.sql`.
const database = databaseUrl
  ? new Pool({ connectionString: databaseUrl })
  : { dialect: pgliteDialect(() => getPglite()), type: "postgres" as const };

/** Session token cookie name. */
export const SESSION_TOKEN_COOKIE = "__Host-schemalab-auth.session_token";

// Direct Google sign-in — an OAuth client the college creates itself in
// Google Cloud Console (see DEPLOY.md). Off unless both env vars are set.
const googleClientId = env("GOOGLE_CLIENT_ID");
const googleClientSecret = env("GOOGLE_CLIENT_SECRET");
const googleDirectConfigured = Boolean(googleClientId && googleClientSecret);
/** Restrict sign-in to one Google Workspace domain (e.g. "zac.org.ua"). Optional. */
const googleHostedDomain = env("GOOGLE_HOSTED_DOMAIN");

export const auth = betterAuth({
  baseURL,
  // Deployed apps should set BETTER_AUTH_SECRET explicitly. Local dev: a
  // process-stable secret on globalThis so HMR doesn't invalidate
  // PGLite-backed sessions (see above).
  secret: env("BETTER_AUTH_SECRET") ?? devAuthSecret(),

  database,

  // CSRF / origin check for credentialed auth POSTs (email sign-up/sign-in, …).
  trustedOrigins,

  account: {
    encryptOAuthTokens: true,
    accountLinking: {
      enabled: true,
      trustedProviders: ["google"],
    },
  },

  // Cache the session in the short-lived signed `session_data` cookie so reads
  // (incl. the client's `/get-session`) skip the DB.
  session: { cookieCache: { enabled: true, maxAge: 300 } },

  // Local email/password — toggled only via `./email-password` (not a plugin).
  ...(emailAndPasswordEnabled ? { emailAndPassword: { enabled: true } } : {}),

  ...(googleDirectConfigured
    ? {
        socialProviders: {
          google: {
            clientId: googleClientId as string,
            clientSecret: googleClientSecret as string,
            ...(googleHostedDomain
              ? { authorizationUrlParams: { hd: googleHostedDomain } }
              : {}),
          },
        },
      }
    : {}),

  // `__Host-` prefixed cookies: Secure + Path=/ + no Domain attribute, so a
  // cookie can't be widened to a parent domain. Better Auth's auto `__Secure-`
  // prefix permits a Domain attribute, so we set names/Secure ourselves.
  // (Browsers allow Secure cookies on `http://localhost`, so local dev works.)
  advanced: {
    useSecureCookies: false,
    defaultCookieAttributes: { secure: true, sameSite: "lax", path: "/" },
    cookies: {
      session_token: { name: SESSION_TOKEN_COOKIE },
      session_data: { name: "__Host-schemalab-auth.session_data" },
      account_data: { name: "__Host-schemalab-auth.account_data" },
      dont_remember: { name: "__Host-schemalab-auth.dont_remember" },
    },
  },

  plugins: [
    // Accepts `Authorization: Bearer <session-token>` as an alternative to
    // the cookie — harmless no-op unless a request actually sends one.
    bearer(),
    // Bridges Better Auth's Set-Cookie into TanStack Start responses. MUST be
    // last so it runs after every other plugin's hooks.
    tanstackStartCookies(),
  ],
});

export function readSessionToken(): string | null {
  return getCookie(SESSION_TOKEN_COOKIE) ?? null;
}
