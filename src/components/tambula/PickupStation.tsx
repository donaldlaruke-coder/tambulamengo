import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Html5Qrcode } from "html5-qrcode";
import { supabase } from "@/integrations/supabase/client";
import { formatUGX, normalizeUgPhone, timeAgo } from "@/lib/format";

type KitItem = {
  id: string;
  quantity: number;
  size: string | null;
  unit_price: number;
  picked_up_at: string | null;
  kit: { name: string } | null;
};

type PickupOrder = {
  id: string;
  internal_reference: string;
  amount: number;
  status: string;
  created_at: string;
  confirmed_at: string | null;
  donor: { name: string | null; phone: string | null } | null;
  kit_items: KitItem[];
};

const SELECT =
  "id, internal_reference, amount, status, created_at, confirmed_at, donor:donors(name, phone), kit_items:kit_order_items(id, quantity, size, unit_price, picked_up_at, kit:kit_products(name))";

export function PickupStation() {
  const qc = useQueryClient();
  const [query, setQuery] = useState("");
  const [submitted, setSubmitted] = useState("");
  const [scanning, setScanning] = useState(false);

  const lookup = useQuery({
    queryKey: ["pickup-lookup", submitted],
    enabled: submitted.length > 2,
    queryFn: async (): Promise<PickupOrder | null> => {
      const raw = submitted.trim();
      let refToSearch = raw.toUpperCase();
      const match = raw.match(/(KIT|TM)-[A-Z0-9]{4}-[A-Z0-9]{4}/i);
      if (match) {
        refToSearch = match[0].toUpperCase();
      } else {
        try {
          const parsed = JSON.parse(raw);
          if (parsed.ref) refToSearch = parsed.ref.toUpperCase();
        } catch {}
      }
      const phone = normalizeUgPhone(raw);
      // 1. Try exact reference match
      const byRef = await supabase
        .from("transactions")
        .select(SELECT)
        .eq("type", "kit_purchase")
        .eq("internal_reference", refToSearch)
        .maybeSingle();
      if (byRef.data) return byRef.data as unknown as PickupOrder;
      // 2. Try phone lookup via donors
      if (phone) {
        const { data: donors } = await supabase
          .from("donors")
          .select("id")
          .eq("phone", phone)
          .limit(5);
        const ids = (donors ?? []).map((d) => d.id);
        if (ids.length) {
          const { data } = await supabase
            .from("transactions")
            .select(SELECT)
            .eq("type", "kit_purchase")
            .in("donor_id", ids)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          return (data as unknown as PickupOrder | null) ?? null;
        }
      }
      return null;
    },
  });

  const recent = useQuery({
    queryKey: ["pickup-recent"],
    queryFn: async () => {
      const { data } = await supabase
        .from("kit_order_items")
        .select("id, picked_up_at, quantity, size, transaction:transactions(internal_reference, donor:donors(name, phone)), kit:kit_products(name)")
        .not("picked_up_at", "is", null)
        .order("picked_up_at", { ascending: false })
        .limit(10);
      return data ?? [];
    },
  });

  const markPickup = useMutation({
    mutationFn: async (order: PickupOrder) => {
      const { data: user } = await supabase.auth.getUser();
      const now = new Date().toISOString();
      const ids = order.kit_items.filter((k) => !k.picked_up_at).map((k) => k.id);
      if (!ids.length) throw new Error("Already picked up");
      const { error } = await supabase
        .from("kit_order_items")
        .update({ picked_up_at: now, picked_up_by: user.user?.id ?? null })
        .in("id", ids);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Kit marked as picked up");
      qc.invalidateQueries({ queryKey: ["pickup-lookup"] });
      qc.invalidateQueries({ queryKey: ["pickup-recent"] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  function runSearch(q: string) {
    setQuery(q);
    setSubmitted(q.trim());
  }

  return (
    <div className="space-y-6">
      <div className="card-heritage p-5 space-y-3">
        <label className="block text-sm font-semibold">Look up a kit order</label>
        <div className="flex gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); runSearch(query); } }}
            placeholder="Reference (KIT-…) or phone (07…)"
            className="flex-1 rounded-lg border-2 border-input bg-background px-4 py-3 text-base font-mono"
          />
          <button onClick={() => runSearch(query)} className="btn-primary !min-h-0 !py-3 !px-4">Search</button>
        </div>
        <button
          type="button"
          onClick={() => setScanning((s) => !s)}
          className="btn-outline w-full !min-h-0 !py-3"
        >
          {scanning ? "Close scanner" : "📷 Scan QR code"}
        </button>
        {scanning && (
          <QrScanner
            onScan={(text) => {
              setScanning(false);
              runSearch(text);
            }}
          />
        )}
      </div>

      {submitted && (
        <div className="card-heritage p-5">
          {lookup.isLoading ? (
            <div className="text-muted-foreground py-6 text-center">Searching…</div>
          ) : !lookup.data ? (
            <div className="text-muted-foreground py-6 text-center">
              No kit order found for “{submitted}”. Check the reference or phone.
            </div>
          ) : (
            <OrderCard order={lookup.data} onMark={() => markPickup.mutate(lookup.data!)} busy={markPickup.isPending} />
          )}
        </div>
      )}

      <div className="card-heritage p-5">
        <h3 className="font-serif font-bold text-primary mb-3">Recent pickups</h3>
        {(recent.data ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">No pickups yet.</p>
        ) : (
          <ul className="divide-y divide-border text-sm">
            {(recent.data ?? []).map((r: any) => (
              <li key={r.id} className="py-2 flex items-center justify-between gap-3">
                <div>
                  <div className="font-semibold">
                    {r.transaction?.donor?.name || r.transaction?.donor?.phone || "Anonymous"}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {r.quantity}× {r.kit?.name}{r.size ? ` (${r.size})` : ""} · {r.transaction?.internal_reference}
                  </div>
                </div>
                <div className="text-xs text-muted-foreground whitespace-nowrap">{timeAgo(r.picked_up_at)}</div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function OrderCard({ order, onMark, busy }: { order: PickupOrder; onMark: () => void; busy: boolean }) {
  const paid = order.status === "confirmed";
  const remaining = order.kit_items.filter((k) => !k.picked_up_at);
  const allPicked = remaining.length === 0 && order.kit_items.length > 0;

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-widest text-muted-foreground">Order</div>
          <div className="font-mono text-sm">{order.internal_reference}</div>
          <div className="mt-2 font-serif text-xl font-bold text-primary">{formatUGX(order.amount)}</div>
          <div className="text-sm text-muted-foreground">
            {order.donor?.name || "—"}{order.donor?.phone ? ` · ${order.donor.phone}` : ""}
          </div>
        </div>
        <StatusPill paid={paid} allPicked={allPicked} />
      </div>

      <ul className="divide-y divide-border border-y border-border">
        {order.kit_items.map((k) => (
          <li key={k.id} className="py-3 flex items-center justify-between gap-3">
            <div>
              <div className="font-semibold">{k.quantity}× {k.kit?.name ?? "Kit"}{k.size ? ` · ${k.size}` : ""}</div>
              <div className="text-xs text-muted-foreground">{formatUGX(k.unit_price)} each</div>
            </div>
            {k.picked_up_at ? (
              <span className="text-xs text-primary font-semibold">Picked up {timeAgo(k.picked_up_at)}</span>
            ) : (
              <span className="text-xs text-muted-foreground">Not collected</span>
            )}
          </li>
        ))}
      </ul>

      {!paid ? (
        <div className="rounded-lg bg-destructive/10 text-destructive p-3 text-sm">
          Payment not confirmed yet. Verify the transaction on the Pending tab before releasing the kit.
        </div>
      ) : allPicked ? (
        <div className="rounded-lg bg-primary/10 text-primary p-3 text-sm">
          This order has already been collected in full.
        </div>
      ) : (
        <button
          onClick={onMark}
          disabled={busy}
          className="btn-primary w-full text-lg py-4"
        >
          {busy ? "Saving…" : `Mark ${remaining.length} kit${remaining.length > 1 ? "s" : ""} as picked up`}
        </button>
      )}
    </div>
  );
}

function StatusPill({ paid, allPicked }: { paid: boolean; allPicked: boolean }) {
  if (!paid) return <span className="text-xs font-bold uppercase bg-destructive/10 text-destructive px-3 py-1 rounded-full">Unpaid</span>;
  if (allPicked) return <span className="text-xs font-bold uppercase bg-muted text-muted-foreground px-3 py-1 rounded-full">Collected</span>;
  return <span className="text-xs font-bold uppercase bg-primary/10 text-primary px-3 py-1 rounded-full">Ready</span>;
}

function QrScanner({ onScan }: { onScan: (text: string) => void }) {
  const elId = useRef(`qr-${Math.random().toString(36).slice(2)}`).current;
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const scanner = new Html5Qrcode(elId, { verbose: false });
    scannerRef.current = scanner;
    scanner
      .start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        (decoded) => {
          if (cancelled) return;
          onScan(decoded);
        },
        () => {},
      )
      .catch((e) => setError(e?.message ?? "Camera unavailable"));
    return () => {
      cancelled = true;
      scanner
        .stop()
        .catch(() => {})
        .finally(() => {
          try { scanner.clear(); } catch { /* noop */ }
        });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <div id={elId} className="mx-auto max-w-sm overflow-hidden rounded-lg border border-border" />
      {error && <p className="text-xs text-destructive mt-2">Camera error: {error}. You can still search by reference.</p>}
    </div>
  );
}