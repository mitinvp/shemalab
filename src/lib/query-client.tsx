import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";

/**
 * One `QueryClient` per browser tab (not per render) for the server-persisted
 * progress/groups/report data in `@/lib/school`. SSR-safe: `useState`'s
 * lazy initializer runs once per component instance, so a server render and
 * the client's first render each get their own client — no request-shared
 * cache leaking between visitors.
 */
export function QueryProvider({ children }: { children: ReactNode }) {
  const [client] = useState(() => new QueryClient());
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
