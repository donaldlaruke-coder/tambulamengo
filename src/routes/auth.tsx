import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import crest from "@/assets/mengo-badge.jpg.asset.json";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Staff sign in — Tambula Mengo" }, { name: "robots", content: "noindex" }] }),
  component: AuthPage,
});

const BACKEND = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";

function AuthPage() {
  const nav = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // Check if already logged in
    fetch(`${BACKEND}/api/admin-api/me/`, { credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        if (d.authenticated && d.is_staff) nav({ to: "/admin" });
      })
      .catch(() => {});
  }, [nav]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch(`${BACKEND}/api/admin-api/login/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Login failed");
      if (!data.is_staff) {
        toast.error("Your account does not have staff permissions.");
        return;
      }
      toast.success(`Welcome, ${data.username}!`);
      nav({ to: "/admin" });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="container-page max-w-md py-16">
      <div className="text-center mb-6">
        <img src={crest.url} width={72} height={72} className="mx-auto h-18 w-18 rounded-full object-cover ring-2 ring-gold/60" alt="" />
        <h1 className="mt-3 text-2xl font-serif font-bold text-primary">Staff sign in</h1>
        <p className="text-sm text-muted-foreground">Mengo Senior School administrators only.</p>
      </div>
      <form onSubmit={submit} className="card-heritage p-6 space-y-4">
        <div>
          <label className="block text-sm font-semibold mb-1">Username</label>
          <input type="text" required value={username} onChange={(e) => setUsername(e.target.value)} className="w-full rounded-lg border border-input bg-background px-4 py-3" placeholder="admin" />
        </div>
        <div>
          <label className="block text-sm font-semibold mb-1">Password</label>
          <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-lg border border-input bg-background px-4 py-3" />
        </div>
        <button type="submit" disabled={busy} className="btn-primary w-full">
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
      <p className="text-xs text-muted-foreground text-center mt-4">
        Use the Django admin credentials created via <code>createsuperuser</code>.
      </p>
    </div>
  );
}