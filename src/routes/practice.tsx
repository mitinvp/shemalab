import { createFileRoute, Navigate } from "@tanstack/react-router";

// The old 10-topic «Контрольна» was replaced by per-topic tests inside every
// topic page, so this route just sends visitors to the catalog.
export const Route = createFileRoute("/practice")({
  component: () => <Navigate to="/" />,
});
