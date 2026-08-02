import { createFileRoute, redirect } from "@tanstack/react-router";

// The donations page has been removed — everything lives on the home page now.
export const Route = createFileRoute("/donations")({
  beforeLoad: () => {
    throw redirect({ to: "/", replace: true });
  },
  component: () => null,
});