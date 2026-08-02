import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { getBackendUrl } from "@/lib/backend-url";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    try {
      const res = await fetch(`${getBackendUrl()}/api/admin-api/me/`, { credentials: "include" });
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