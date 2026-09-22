import { createFileRoute } from "@tanstack/react-router";
import { auth } from "@/lib/auth/server";

/**
 * Mounts Better Auth's HTTP handler at /api/auth/* (sign-in, callback,
 * get-session, sign-out, etc.) — this file is the ONLY thing that makes
 * those endpoints exist. Without it, every request under /api/auth/ 404s,
 * because nothing else in the app registers that route.
 */
export const Route = createFileRoute("/api/auth/$")({
  server: {
    handlers: {
      GET: ({ request }) => auth.handler(request),
      POST: ({ request }) => auth.handler(request),
    },
  },
});
