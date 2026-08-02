import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ProgressBar } from "@/components/tambula/ProgressBar";
import { DonationTicker } from "@/components/tambula/DonationTicker";
import { useCampaign, useCampaignStats, useLiveDonations } from "@/hooks/use-campaign";
import { daysUntil, formatUGX } from "@/lib/format";

export const Route = createFileRoute("/donations")({
  head: () => ({
    meta: [
      { title: "Live donations — Tambula Mengo" },
      { name: "description", content: "See every gift to Mengo Senior School's Tambula Mengo campaign, updated live." },
      { property: "og:title", content: "Live donations — Tambula Mengo" },
      { property: "og:description", content: "Every donation appears here in real time." },
    ],
  }),
  component: Page,
});

function Page() {
  const campaign = useCampaign();
  const stats = useCampaignStats();
  const [tab, setTab] = useState<"all" | "donations" | "kits">("all");
  const feed = useLiveDonations(100, tab === "donations" ? "donation" : tab === "kits" ? "kit_purchase" : undefined);

  const raised = stats.data?.total_raised ?? 0;
  const goal = campaign.data?.goal_amount ?? 0;
  const days = campaign.data ? daysUntil(campaign.data.event_date) : 0;

  return (
    <div className="container-page py-8 md:py-12 space-y-8 pb-24 md:pb-12">
      <header>
        <h1 className="text-3xl md:text-4xl font-serif font-bold text-primary">Live donations</h1>
        <p className="text-muted-foreground mt-1">Every gift appears here in seconds — no refresh needed.</p>
      </header>

      <section className="card-heritage p-5 md:p-6 bg-primary text-primary-foreground">
        <ProgressBar raised={raised} goal={goal} donations={feed.data ?? []} />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
          <Stat label="Total raised" value={formatUGX(raised)} />
          <Stat label="Donors" value={(stats.data?.donor_count ?? 0).toLocaleString()} />
          <Stat label="Average gift" value={formatUGX(stats.data?.average_donation ?? 0)} />
          <Stat label="Days to go" value={days.toString()} />
        </div>
      </section>

      <section>
        <div className="flex gap-2 mb-4 border-b border-border">
          {(["all", "donations", "kits"] as const).map((k) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              className={`px-4 py-2 text-sm font-medium capitalize border-b-2 -mb-px ${
                tab === k ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {k === "all" ? "All" : k === "donations" ? "Donations" : "Kit purchases"}
            </button>
          ))}
        </div>
        <div className="card-heritage p-4 md:p-6">
          {feed.isLoading ? (
            <div className="py-8 text-center text-muted-foreground">Loading…</div>
          ) : (
            <DonationTicker items={feed.data ?? []} />
          )}
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white/10 rounded-lg p-3">
      <div className="text-lg md:text-xl font-serif font-bold text-gold truncate">{value}</div>
      <div className="text-[11px] uppercase tracking-widest opacity-80">{label}</div>
    </div>
  );
}