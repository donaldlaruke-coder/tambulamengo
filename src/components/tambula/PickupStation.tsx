import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getBackendUrl } from "@/lib/backend-url";
import { formatUGX, timeAgo } from "@/lib/format";

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
  const [scanResult, setScanResult] = useState<any>(null);
  const [loadingScan, setLoadingScan] = useState(false);

  const [page, setPage] = useState(1);
  const pageSize = 10;

  const recent = useQuery({
    queryKey: ["pickup-recent"],
    queryFn: async () => {
      const res = await fetch(`${getBackendUrl()}/api/admin-api/transactions/?type=kit_purchase&status=confirmed`, {
        credentials: "include",
      });
      if (!res.ok) return [];
      const data = await res.json();
      return (data as any[]).filter((t: any) => t.kit_collected);
    },
    refetchInterval: 30_000,
  });

  const allPickups = recent.data ?? [];
  const totalPages = Math.max(1, Math.ceil(allPickups.length / pageSize));
  const pagedPickups = allPickups.slice((page - 1) * pageSize, page * pageSize);

  async function handleScanSubmit(refToSearch: string) {
    if (!refToSearch.trim()) return;
    setLoadingScan(true);
    setScanResult(null);

    // Extract reference from URL if a full QR link was scanned
    let cleanRef = refToSearch.trim();
    if (cleanRef.includes("ref=")) {
      cleanRef = cleanRef.split("ref=")[1].split("&")[0];
    }

    try {
      const res = await fetch(`${getBackendUrl()}/api/admin-api/scan-kit/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ reference: cleanRef }),
      });

      const resText = await res.text();
      let data: any = {};
      try {
        data = JSON.parse(resText);
      } catch {
        toast.error(`Server Error (${res.status}). Ensure you are logged into admin.`);
        setScanResult({ error: `Server error (${res.status}): ${resText.slice(0, 100)}` });
        return;
      }
      if (!res.ok) {
        toast.error(data.detail || "Verification failed");
        setScanResult({ error: data.detail || "Invalid or Unconfirmed Kit Reference" });
      } else {
        setScanResult(data);
        if (data.already_picked) {
          toast.error("⚠️ Already Collected! This kit pass is unusable again.");
        } else {
          toast.success("✅ Kit Marked as Picked Up!");
        }
        qc.invalidateQueries({ queryKey: ["pickup-recent"] });
      }
    } catch (err) {
      console.error(err);
      toast.error("Network error checking kit pass");
    } finally {
      setLoadingScan(false);
    }
  }

  function runSearch(q: string) {
    setQuery(q);
    setSubmitted(q.trim());
    handleScanSubmit(q);
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

      {loadingScan && (
        <div className="card-heritage p-6 text-center text-muted-foreground">
          Verifying kit pass with server…
        </div>
      )}

      {scanResult && !loadingScan && (
        <div className="card-heritage p-5">
          {scanResult.error ? (
            <div className="rounded-xl border-2 border-amber-500/40 bg-amber-500/10 p-4 text-amber-800 dark:text-amber-200 text-sm font-semibold">
              ❌ {scanResult.error}
            </div>
          ) : scanResult.already_picked ? (
            <div className="rounded-xl border-2 border-red-500 bg-red-500/10 p-5 text-left space-y-3 animate-in fade-in">
              <div className="flex items-center gap-2 text-red-600 dark:text-red-400 font-bold text-lg">
                <span>⚠️ ALREADY COLLECTED — UNUSABLE AGAIN</span>
              </div>
              <p className="text-sm text-red-700 dark:text-red-300 font-medium">
                {scanResult.message}
              </p>
              <div className="text-xs bg-background/80 p-3 rounded-lg border border-red-200 dark:border-red-900/50 space-y-1">
                <div><strong>Payer:</strong> {scanResult.donor_name} ({scanResult.donor_phone})</div>
                <div><strong>Reference:</strong> {scanResult.reference}</div>
                <div><strong>Items:</strong> {scanResult.items?.map((i: any) => `${i.quantity}x ${i.name} (${i.size})`).join(", ")}</div>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border-2 border-green-500 bg-green-500/10 p-5 text-left space-y-3 animate-in fade-in">
              <div className="flex items-center gap-2 text-green-600 dark:text-green-400 font-bold text-lg">
                <span>✅ KIT VERIFIED & MARKED AS PICKED UP</span>
              </div>
              <p className="text-sm text-green-700 dark:text-green-300 font-semibold">
                {scanResult.message}
              </p>
              <div className="text-xs bg-background/80 p-3 rounded-lg border border-green-200 dark:border-green-900/50 space-y-1">
                <div><strong>Payer:</strong> {scanResult.donor_name} ({scanResult.donor_phone})</div>
                <div><strong>Reference:</strong> {scanResult.reference}</div>
                <div><strong>Items Released:</strong> {scanResult.items?.map((i: any) => `${i.quantity}x ${i.name} (${i.size})`).join(", ")}</div>
                <div className="text-muted-foreground pt-1">Verified by {scanResult.picked_by} at {scanResult.picked_at}</div>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="card-heritage p-5">
        <h3 className="font-serif font-bold text-primary mb-3">Recent pickups</h3>
        {allPickups.length === 0 ? (
          <p className="text-sm text-muted-foreground">No pickups yet.</p>
        ) : (
          <>
            <ul className="divide-y divide-border text-sm">
              {pagedPickups.map((r: any) => (
                <li key={r.id} className="py-2 flex items-center justify-between gap-3">
                  <div>
                    <div className="font-semibold">
                      {r.is_anonymous ? "Anonymous" : r.donor_name || r.donor_display_name || r.donor_phone || "—"}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {r.internal_reference} · {formatUGX(r.amount)}
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground whitespace-nowrap">
                    {r.kit_collected_at ? timeAgo(r.kit_collected_at) : "—"}
                  </div>
                </li>
              ))}
            </ul>

            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-3 border-t border-border text-xs text-muted-foreground">
                <span>Page {page} of {totalPages}</span>
                <div className="flex gap-1">
                  <button
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                    className="btn-outline !min-h-0 !py-1 !px-2.5 text-xs disabled:opacity-40"
                  >
                    Previous
                  </button>
                  <button
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => p + 1)}
                    className="btn-outline !min-h-0 !py-1 !px-2.5 text-xs disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
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
  const scannerRef = useRef<InstanceType<typeof import("html5-qrcode")["Html5Qrcode"]> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let scanner: InstanceType<typeof import("html5-qrcode")["Html5Qrcode"]> | null = null;

    import("html5-qrcode").then(({ Html5Qrcode }) => {
      if (cancelled) return;
      scanner = new Html5Qrcode(elId, { verbose: false } as any);
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
        .catch((e: any) => setError(e?.message ?? "Camera unavailable"));
    });

    return () => {
      cancelled = true;
      if (scanner) {
        scanner
          .stop()
          .catch(() => {})
          .finally(() => {
            try { scanner!.clear(); } catch { /* noop */ }
          });
      }
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