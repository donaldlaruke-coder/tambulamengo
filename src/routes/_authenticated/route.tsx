import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

const BACKEND = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    try {
      const res = await fetch(`${BACKEND}/api/admin-api/me/`, { credentials: "include" });
      const data = await res.json();
      if (!data.authenticated || !data.is_staff) {
        throw redirect({ to: "/auth" });
      }
      return { user: data.username };
    } catch {
      throw redirect({ to: "/auth" });
    }
  },
  component: () => <Outlet />,
});