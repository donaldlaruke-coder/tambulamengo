import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import crest from "@/assets/mengo-crest.png";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Staff sign in — Tambula Mengo" }, { name: "robots", content: "noindex" }] }),
  component: AuthPage,
});

function AuthPage() {
  const nav = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) nav({ to: "/admin" });
    });
  }, [nav]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Signed in");
        nav({ to: "/admin" });
      } else {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { emailRedirectTo: window.location.origin + "/admin" },
        });
        if (error) throw error;
        toast.success("Account created — you're the first admin.");
        nav({ to: "/admin" });
      }
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="container-page max-w-md py-16">
      <div className="text-center mb-6">
        <img src={crest} width={64} height={64} className="mx-auto h-16 w-16" alt="" />
        <h1 className="mt-3 text-2xl font-serif font-bold text-primary">Staff sign in</h1>
        <p className="text-sm text-muted-foreground">Mengo Senior School administrators only.</p>
      </div>
      <form onSubmit={submit} className="card-heritage p-6 space-y-4">
        <div>
          <label className="block text-sm font-semibold mb-1">Email</label>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-lg border border-input bg-background px-4 py-3" />
        </div>
        <div>
          <label className="block text-sm font-semibold mb-1">Password</label>
          <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-lg border border-input bg-background px-4 py-3" />
        </div>
        <button type="submit" disabled={busy} className="btn-primary w-full">
          {busy ? "…" : mode === "signin" ? "Sign in" : "Create first admin"}
        </button>
        <button type="button" onClick={() => setMode(mode === "signin" ? "signup" : "signin")} className="text-sm text-primary underline underline-offset-4 w-full text-center">
          {mode === "signin" ? "First-time setup? Create the first admin →" : "← Back to sign in"}
        </button>
      </form>
      <p className="text-xs text-muted-foreground text-center mt-4">
        First person to sign up automatically becomes admin. Ask us to disable signups afterwards.
      </p>
    </div>
  );
}