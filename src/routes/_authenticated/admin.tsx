import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { formatUGX, timeAgo } from "@/lib/format";
import { getBackendUrl } from "@/lib/backend-url";
import { PickupStation } from "@/components/tambula/PickupStation";

export const Route = createFileRoute("/_authenticated/admin")({
  ssr: false,
  head: () => ({ meta: [{ title: "Admin — Tambula Mengo" }, { name: "robots", content: "noindex" }] }),
  component: Admin,
});

type AdminTx = {
  id: string; internal_reference: string; provider_reference?: string; amount: number; type: string;
  payment_method: string; status: string; message: string | null;
  is_anonymous: boolean; donor_display_name: string | null;
  donor_name?: string | null; donor_phone?: string | null; donor_email?: string | null;
  created_at: string; confirmed_at: string | null;
};

function Admin() {
  const nav = useNavigate();
  const qc = useQueryClient();
  const [tab, setTab] = useState<"overview" | "pickup" | "transactions" | "pending" | "kits" | "campaign">("overview");

  const isAdminQ = useQuery({
    queryKey: ["is-admin"],
    queryFn: async () => {
      try {
        const res = await fetch(`${getBackendUrl()}/api/admin-api/me/`, { credentials: "include" });
        if (!res.ok) return false;
        const data = await res.json();
        return !!(data.authenticated && data.is_staff);
      } catch {
        return false;
      }
    },
  });

  const stats = useQuery({
    queryKey: ["admin-stats"],
    enabled: !!isAdminQ.data,
    queryFn: async () => {
      const res = await fetch(`${getBackendUrl()}/api/admin-api/stats/`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load stats");
      return res.json() as Promise<{
        total_raised: number; donor_count: number; donation_count: number;
        average_donation: number; kit_orders_count: number; pending_count: number;
      }>;
    },
  });

  const txs = useQuery({
    queryKey: ["admin-txs"],
    enabled: !!isAdminQ.data,
    queryFn: async () => {
      const res = await fetch(`${getBackendUrl()}/api/admin-api/transactions/`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load transactions");
      return res.json() as Promise<AdminTx[]>;
    },
  });

  async function signOut() {
    try {
      await fetch(`${getBackendUrl()}/api/admin-api/logout/`, { method: "POST", credentials: "include" });
    } catch {}
    nav({ to: "/auth" });
  }

  if (isAdminQ.isLoading) return <div className="container-page py-10">Loading…</div>;
  if (!isAdminQ.data) {
    return (
      <div className="container-page py-16 text-center">
        <h1 className="text-2xl font-serif font-bold text-primary">Not authorised</h1>
        <p className="text-muted-foreground mt-2">You don't have staff permissions.</p>
        <button onClick={signOut} className="btn-outline mt-4">Sign out</button>
      </div>
    );
  }

  const pending = (txs.data ?? []).filter((t) => t.status === "pending");
  const confirmed = (txs.data ?? []).filter((t) => t.status === "confirmed");
  const kitOrders = (txs.data ?? []).filter((t) => t.type === "kit_purchase");

  return (
    <div className="container-page py-8 md:py-10">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-serif font-bold text-primary">Admin dashboard</h1>
          <p className="text-xs text-muted-foreground mt-1">Django Staff Administration</p>
        </div>
        <div className="flex gap-2">
          <a
            href={`${getBackendUrl()}/api/admin/`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-outline !min-h-0 !py-2 !px-4 text-sm"
          >
            Open Django Admin ↗
          </a>
          <button onClick={signOut} className="btn-outline !min-h-0 !py-2 !px-4 text-sm">Sign out</button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Kpi label="Total raised" value={formatUGX(stats.data?.total_raised ?? 0)} />
        <Kpi label="Donors" value={(stats.data?.donor_count ?? 0).toLocaleString()} />
        <Kpi label="Pending" value={pending.length.toString()} highlight={pending.length > 0} />
        <Kpi label="Kit orders" value={kitOrders.filter((t) => t.status === "confirmed").length.toString()} />
      </div>

      <div className="flex gap-2 mb-4 border-b border-border overflow-x-auto">
        {(["overview", "pickup", "transactions", "pending", "kits", "campaign"] as const).map((k) => (
          <button key={k} onClick={() => setTab(k)}
            className={`px-4 py-2 text-sm font-medium capitalize border-b-2 -mb-px whitespace-nowrap ${
              tab === k ? "border-primary text-primary" : "border-transparent text-muted-foreground"
            }`}>{k}</button>
        ))}
      </div>

      {tab === "overview" && (
        <div className="card-heritage p-6">
          <h2 className="font-serif font-bold text-primary text-lg mb-3">Recent activity</h2>
          <TxTable rows={(txs.data ?? []).slice(0, 15)} />
        </div>
      )}
      {tab === "pickup" && <PickupStation />}
      {tab === "transactions" && (
        <div className="card-heritage p-4 md:p-6">
          <div className="flex justify-between items-center mb-4">
            <div className="text-sm text-muted-foreground">{confirmed.length} confirmed · {pending.length} pending</div>
            <button onClick={() => downloadCsv(txs.data ?? [])} className="btn-outline !min-h-0 !py-2 !px-3 text-sm">Export CSV</button>
          </div>
          <TxTable rows={txs.data ?? []} />
        </div>
      )}
      {tab === "pending" && (
        <div className="card-heritage p-4 md:p-6">
          <p className="text-sm text-muted-foreground mb-3">
            Bank transfers and unconfirmed mobile-money payments. Confirm once you've verified the payment.
          </p>
          <TxTable rows={pending} showActions />
        </div>
      )}
      {tab === "kits" && (
        <KitsAdmin />
      )}
      {tab === "campaign" && (
        <CampaignAdmin />
      )}
    </div>
  );
}

function Kpi({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`card-heritage p-4 ${highlight ? "border-primary" : ""}`}>
      <div className="text-xs uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="text-xl md:text-2xl font-serif font-bold text-primary mt-1 truncate">{value}</div>
    </div>
  );
}

function TxTable({ rows, showActions }: { rows: AdminTx[]; showActions?: boolean }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [methodFilter, setMethodFilter] = useState<string>("all");
  const [groupByDay, setGroupByDay] = useState<boolean>(true);

  const qc = useQueryClient();
  const confirm = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`${getBackendUrl()}/api/admin-api/confirm/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error("Failed to confirm");
    },
    onSuccess: () => {
      toast.success("Confirmed");
      qc.invalidateQueries({ queryKey: ["admin-txs"] });
      qc.invalidateQueries({ queryKey: ["admin-stats"] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const reject = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`${getBackendUrl()}/api/admin-api/reject/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error("Failed to reject");
    },
    onSuccess: () => {
      toast.success("Rejected");
      qc.invalidateQueries({ queryKey: ["admin-txs"] });
      qc.invalidateQueries({ queryKey: ["admin-stats"] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  // Filter rows based on search and dropdown categories
  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return rows.filter((t) => {
      // Type filter
      if (typeFilter !== "all" && t.type !== typeFilter) return false;
      // Status filter
      if (statusFilter !== "all" && t.status !== statusFilter) return false;
      // Method filter
      if (methodFilter !== "all" && t.payment_method !== methodFilter) return false;

      // Search query across all fields
      if (q) {
        const nameMatch = (t.donor_name || t.donor_display_name || "").toLowerCase().includes(q);
        const phoneMatch = (t.donor_phone || "").toLowerCase().includes(q);
        const emailMatch = (t.donor_email || "").toLowerCase().includes(q);
        const refMatch = (t.internal_reference || "").toLowerCase().includes(q);
        const codeMatch = (t.provider_reference || "").toLowerCase().includes(q);
        const msgMatch = (t.message || "").toLowerCase().includes(q);
        const amountMatch = t.amount.toString().includes(q);
        const typeMatch = t.type.toLowerCase().includes(q);

        if (!nameMatch && !phoneMatch && !emailMatch && !refMatch && !codeMatch && !msgMatch && !amountMatch && !typeMatch) {
          return false;
        }
      }
      return true;
    });
  }, [rows, searchQuery, typeFilter, statusFilter, methodFilter]);

  // Group filtered rows by calendar date
  const groupedByDate = useMemo(() => {
    const groups: { dateLabel: string; items: AdminTx[]; totalAmount: number }[] = [];
    const dateMap = new Map<string, AdminTx[]>();

    filtered.forEach((t) => {
      const d = new Date(t.created_at);
      const dateStr = d.toLocaleDateString("en-GB", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      });
      if (!dateMap.has(dateStr)) {
        dateMap.set(dateStr, []);
      }
      dateMap.get(dateStr)!.push(t);
    });

    dateMap.forEach((items, dateLabel) => {
      const totalAmount = items.reduce((sum, item) => sum + item.amount, 0);
      groups.push({ dateLabel, items, totalAmount });
    });

    return groups;
  }, [filtered]);

  return (
    <div className="space-y-4">
      {/* Search and Category Filters Control Panel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-muted/30 p-3.5 rounded-xl border border-border">
        {/* Search Bar */}
        <div className="relative flex-1 min-w-[240px]">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="🔍 Search name, phone, ref (KIT-…), code, amount…"
            className="w-full rounded-lg border border-input bg-background px-3.5 py-2 text-sm font-medium focus:border-primary outline-none"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground"
            >
              ✕ Clear
            </button>
          )}
        </div>

        {/* Category Selectors */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="rounded-lg border border-input bg-background px-3 py-2 font-medium"
          >
            <option value="all">Category: All Types</option>
            <option value="donation">🎁 Donations</option>
            <option value="kit_purchase">🎽 Kit Purchases</option>
          </select>

          {/* Status Filter */}
          {!showActions && (
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-lg border border-input bg-background px-3 py-2 font-medium"
            >
              <option value="all">Status: All Statuses</option>
              <option value="confirmed">✓ Confirmed</option>
              <option value="pending">⏳ Pending</option>
              <option value="failed">✕ Failed</option>
            </select>
          )}

          {/* Payment Method Filter */}
          <select
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value)}
            className="rounded-lg border border-input bg-background px-3 py-2 font-medium"
          >
            <option value="all">Method: All Methods</option>
            <option value="mtn_momo">MTN MoMo</option>
            <option value="airtel_money">Airtel Money</option>
            <option value="card">Bank Card</option>
            <option value="bank">Bank Transfer</option>
          </select>

          {/* Grouping Toggle */}
          <button
            type="button"
            onClick={() => setGroupByDay((prev) => !prev)}
            className={`px-3 py-2 rounded-lg border font-semibold transition-colors ${
              groupByDay
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background border-border text-muted-foreground hover:border-primary"
            }`}
          >
            {groupByDay ? "📅 Grouped by Day" : "📋 List View"}
          </button>

          {/* CSV Export for filtered results */}
          <button
            type="button"
            onClick={() => downloadCsv(filtered)}
            className="btn-outline !min-h-0 !py-2 !px-3 text-xs"
          >
            📥 Export CSV ({filtered.length})
          </button>
        </div>
      </div>

      {/* Filter summary bar */}
      <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
        <span>
          Showing <strong>{filtered.length}</strong> of {rows.length} transactions
          {filtered.length > 0 && (
            <span className="ml-2 font-semibold text-primary">
              · Total: {formatUGX(filtered.reduce((sum, item) => sum + item.amount, 0))}
            </span>
          )}
        </span>
        {(searchQuery || typeFilter !== "all" || statusFilter !== "all" || methodFilter !== "all") && (
          <button
            onClick={() => {
              setSearchQuery("");
              setTypeFilter("all");
              setStatusFilter("all");
              setMethodFilter("all");
            }}
            className="text-xs text-primary underline underline-offset-2"
          >
            Reset all filters
          </button>
        )}
      </div>

      {/* Transactions Render */}
      {!filtered.length ? (
        <div className="text-muted-foreground text-center py-10 card-heritage">
          No transactions match the selected search or filter criteria.
        </div>
      ) : groupByDay ? (
        /* Grouped By Day View */
        <div className="space-y-6">
          {groupedByDate.map((group) => (
            <div key={group.dateLabel} className="card-heritage overflow-hidden">
              {/* Day Header */}
              <div className="bg-muted/40 px-4 py-3 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-serif font-bold text-primary">{group.dateLabel}</span>
                  <span className="text-xs bg-primary/10 text-primary font-semibold px-2 py-0.5 rounded-full">
                    {group.items.length} transaction{group.items.length > 1 ? "s" : ""}
                  </span>
                </div>
                <div className="text-sm font-semibold text-primary">
                  {formatUGX(group.totalAmount)}
                </div>
              </div>

              {/* Table for this day */}
              <TableContent rows={group.items} showActions={showActions} confirm={confirm} reject={reject} />
            </div>
          ))}
        </div>
      ) : (
        /* Flat List View */
        <div className="card-heritage overflow-hidden">
          <TableContent rows={filtered} showActions={showActions} confirm={confirm} reject={reject} />
        </div>
      )}
    </div>
  );
}

function TableContent({
  rows,
  showActions,
  confirm,
  reject,
}: {
  rows: AdminTx[];
  showActions?: boolean;
  confirm: any;
  reject: any;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-xs uppercase tracking-widest text-muted-foreground bg-muted/20">
          <tr className="text-left border-b border-border">
            <th className="py-2.5 px-4">When</th>
            <th className="py-2.5 px-3">Donor / Contact</th>
            <th className="py-2.5 px-3">Category</th>
            <th className="py-2.5 px-3">Method</th>
            <th className="py-2.5 px-3 text-right">Amount</th>
            <th className="py-2.5 px-3">Status</th>
            <th className="py-2.5 px-3">Ref / Code</th>
            {showActions && <th className="py-2.5 px-4 text-right">Action</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((t) => (
            <tr key={t.id} className="hover:bg-muted/10 transition-colors">
              <td className="py-3 px-4 whitespace-nowrap text-xs text-muted-foreground">
                {timeAgo(t.created_at)}
              </td>
              <td className="py-3 px-3">
                <div className="font-semibold text-foreground">
                  {t.is_anonymous ? "Anonymous" : t.donor_name || t.donor_display_name || "—"}
                </div>
                {t.donor_phone && <div className="text-xs font-mono text-muted-foreground">{t.donor_phone}</div>}
                {t.donor_email && <div className="text-xs text-muted-foreground truncate max-w-[150px]">{t.donor_email}</div>}
              </td>
              <td className="py-3 px-3 whitespace-nowrap">
                <span className={`text-xs px-2 py-1 rounded-md font-medium ${
                  t.type === "kit_purchase" ? "bg-amber-500/10 text-amber-600 border border-amber-500/20" : "bg-blue-500/10 text-blue-600 border border-blue-500/20"
                }`}>
                  {t.type === "kit_purchase" ? "🎽 Kit Purchase" : "🎁 Donation"}
                </span>
              </td>
              <td className="py-3 px-3 whitespace-nowrap text-xs capitalize">
                {t.payment_method.replace("_", " ")}
              </td>
              <td className="py-3 px-3 text-right font-semibold text-primary whitespace-nowrap">
                {formatUGX(t.amount)}
              </td>
              <td className="py-3 px-3 whitespace-nowrap">
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                  t.status === "confirmed" ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20" :
                  t.status === "failed" ? "bg-rose-500/10 text-rose-600 border border-rose-500/20" :
                  "bg-amber-500/10 text-amber-600 border border-amber-500/20"
                }`}>
                  {t.status === "confirmed" ? "✓ Confirmed" : t.status === "failed" ? "✕ Failed" : "⏳ Pending"}
                </span>
              </td>
              <td className="py-3 px-3 font-mono text-xs">
                <div className="font-bold text-foreground">{t.internal_reference}</div>
                {t.provider_reference && (
                  <div className="text-[10px] text-muted-foreground truncate max-w-[140px]" title={t.provider_reference}>
                    Code: {t.provider_reference}
                  </div>
                )}
              </td>
              {showActions && (
                <td className="py-3 px-4 text-right whitespace-nowrap">
                  <button
                    onClick={() => confirm.mutate(t.id)}
                    className="text-xs bg-primary text-primary-foreground font-semibold rounded-md px-2.5 py-1.5 mr-2 hover:opacity-90 transition-opacity"
                  >
                    Confirm
                  </button>
                  <button
                    onClick={() => reject.mutate(t.id)}
                    className="text-xs text-destructive hover:underline font-medium"
                  >
                    Reject
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function downloadCsv(rows: AdminTx[]) {
  const header = ["created_at","reference","provider_code","donor_name","donor_phone","donor_email","type","method","amount","status","message"];
  const csv = [header.join(",")].concat(rows.map((r) => [
    r.created_at, r.internal_reference, r.provider_reference ?? "",
    (r.is_anonymous ? "Anonymous" : (r.donor_name || r.donor_display_name || "")).replace(/,/g, " "),
    r.donor_phone ?? "",
    r.donor_email ?? "",
    r.type, r.payment_method, r.amount, r.status, (r.message ?? "").replace(/[\n,]/g, " "),
  ].join(","))).join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  const a = document.createElement("a"); a.href = url; a.download = `tambula-mengo-${new Date().toISOString().slice(0,10)}.csv`; a.click();
  URL.revokeObjectURL(url);
}

type Kit = { id: string; name: string; description: string | null; price: number; size_options: string[]; active: boolean; stock: number | null };
function KitsAdmin() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["admin-kits"],
    queryFn: async () => {
      const res = await fetch(`${getBackendUrl()}/api/admin-api/kits/`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load kits");
      return res.json() as Promise<Kit[]>;
    },
  });
  const [name, setName] = useState(""); const [price, setPrice] = useState(30000);
  const [desc, setDesc] = useState(""); const [sizes, setSizes] = useState("S,M,L,XL");
  const add = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${getBackendUrl()}/api/admin-api/kits/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name, description: desc || null, price,
          size_options: sizes.split(",").map((s) => s.trim()).filter(Boolean),
        }),
      });
      if (!res.ok) throw new Error("Failed to add kit");
    },
    onSuccess: () => { toast.success("Kit added"); qc.invalidateQueries({ queryKey: ["admin-kits"] }); setName(""); },
    onError: (e) => toast.error((e as Error).message),
  });

  const toggle = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const res = await fetch(`${getBackendUrl()}/api/admin-api/kit-toggle/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ id, active }),
      });
      if (!res.ok) throw new Error("Failed to toggle kit");
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-kits"] }),
  });

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <div className="card-heritage p-6">
        <h3 className="font-serif font-bold text-primary text-lg mb-4">Add a kit</h3>
        <div className="space-y-3">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Kit name" className="w-full rounded border border-input px-3 py-2" />
          <input type="number" value={price} onChange={(e) => setPrice(Number(e.target.value))} placeholder="Price UGX" className="w-full rounded border border-input px-3 py-2" />
          <input value={sizes} onChange={(e) => setSizes(e.target.value)} placeholder="Sizes (comma separated) or leave empty" className="w-full rounded border border-input px-3 py-2" />
          <textarea value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Description" rows={2} className="w-full rounded border border-input px-3 py-2" />
          <button onClick={() => add.mutate()} disabled={!name || price <= 0} className="btn-primary w-full">Add kit</button>
        </div>
      </div>
      <div className="card-heritage p-6">
        <h3 className="font-serif font-bold text-primary text-lg mb-4">Existing kits</h3>
        <ul className="divide-y divide-border">
          {(data ?? []).map((k) => (
            <li key={k.id} className="py-3 flex items-center justify-between gap-3">
              <div>
                <div className="font-semibold">{k.name}</div>
                <div className="text-sm text-muted-foreground">{formatUGX(k.price)} · sizes: {k.size_options.join(", ") || "—"}</div>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={k.active} onChange={(e) => toggle.mutate({ id: k.id, active: e.target.checked })} />
                Active
              </label>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function CampaignAdmin() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["admin-campaign"],
    queryFn: async () => {
      const res = await fetch(`${getBackendUrl()}/api/admin-api/campaign/`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load campaign settings");
      return res.json();
    },
  });

  const [form, setForm] = useState<Record<string, string>>({});
  useEffect(() => {
    if (data) setForm({
      campaign_name: data.campaign_name ?? "", tagline: data.tagline ?? "", story: data.story ?? "",
      goal_amount: String(data.goal_amount ?? 0), event_date: data.event_date ?? "",
      event_details: data.event_details ?? "",
      bank_name: data.bank_name ?? "", bank_account_name: data.bank_account_name ?? "", bank_account_number: data.bank_account_number ?? "",
    });
  }, [data]);

  const save = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${getBackendUrl()}/api/admin-api/campaign/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.detail || "Failed to save settings");
    },
    onSuccess: () => {
      toast.success("Campaign settings saved successfully!");
      qc.invalidateQueries({ queryKey: ["admin-campaign"] });
      qc.invalidateQueries({ queryKey: ["campaign"] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  if (!data) return <div>Loading…</div>;
  const upd = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm({ ...form, [k]: e.target.value });
  return (
    <div className="card-heritage p-6 grid gap-4 max-w-2xl">
      <Field label="Campaign name"><input value={form.campaign_name ?? ""} onChange={upd("campaign_name")} className="w-full rounded border border-input px-3 py-2" /></Field>
      <Field label="Tagline"><input value={form.tagline ?? ""} onChange={upd("tagline")} className="w-full rounded border border-input px-3 py-2" /></Field>
      <Field label="Story"><textarea rows={4} value={form.story ?? ""} onChange={upd("story")} className="w-full rounded border border-input px-3 py-2" /></Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Goal (UGX)"><input type="number" value={form.goal_amount ?? ""} onChange={upd("goal_amount")} className="w-full rounded border border-input px-3 py-2" /></Field>
        <Field label="Event date"><input type="date" value={form.event_date ?? ""} onChange={upd("event_date")} className="w-full rounded border border-input px-3 py-2" /></Field>
      </div>
      <Field label="Event details"><textarea rows={2} value={form.event_details ?? ""} onChange={upd("event_details")} className="w-full rounded border border-input px-3 py-2" /></Field>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Field label="Bank name"><input value={form.bank_name ?? ""} onChange={upd("bank_name")} className="w-full rounded border border-input px-3 py-2" /></Field>
        <Field label="Account name"><input value={form.bank_account_name ?? ""} onChange={upd("bank_account_name")} className="w-full rounded border border-input px-3 py-2" /></Field>
        <Field label="Account number"><input value={form.bank_account_number ?? ""} onChange={upd("bank_account_number")} className="w-full rounded border border-input px-3 py-2" /></Field>
      </div>
      <button onClick={() => save.mutate()} className="btn-primary">Save changes</button>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="text-xs uppercase tracking-widest text-muted-foreground mb-1">{label}</div>
      {children}
    </label>
  );
}