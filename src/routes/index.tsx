import { createFileRoute, Link } from "@tanstack/react-router";
import crest from "@/assets/mengo-badge.jpg.asset.json";
import { ProgressBar } from "@/components/tambula/ProgressBar";
import { DonationTicker } from "@/components/tambula/DonationTicker";
import { HeroVideoWall, VideoStrip } from "@/components/tambula/HeroVideos";
import { useCampaign, useCampaignStats, useLiveDonations } from "@/hooks/use-campaign";
import { daysUntil, formatUGX } from "@/lib/format";

export const Route = createFileRoute("/")({ component: Index });

function Index() {
  const campaign = useCampaign();
  const stats = useCampaignStats();
  const donations = useLiveDonations(8);

  const raised = stats.data?.total_raised ?? 0;
  const goal = campaign.data?.goal_amount ?? 18_000_000_000;
  const eventDate = campaign.data?.event_date ?? "2026-08-15";
  const days = daysUntil(eventDate);
  const eventDateLabel = new Date(eventDate + "T00:00:00").toLocaleDateString("en-UG", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  return (
    <div>
      {/* HERO */}
      <section className="relative overflow-hidden text-white">
        <HeroVideoWall />
        <div className="relative container-page py-16 md:py-28 grid md:grid-cols-2 gap-10 items-center">
          <div>
            <img
              src={crest.url}
              alt="Mengo Senior School badge"
              width={96}
              height={96}
              className="h-20 w-20 md:h-24 md:w-24 rounded-full ring-4 ring-gold/60 shadow-2xl object-cover mb-5"
            />
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs uppercase tracking-widest text-gold mb-4">
              <span className="h-2 w-2 rounded-full bg-gold animate-pulse" /> Live campaign
            </div>
            <h1 className="text-5xl md:text-7xl font-serif font-bold leading-[1.02] drop-shadow-lg">
              Tambula <span className="text-gold">Mengo</span>
            </h1>
            <p className="mt-3 text-lg md:text-xl italic text-gold">
              {campaign.data?.tagline ?? "Akwana Akira Ayomba — Make friends and never foes."}
            </p>
            <p className="mt-5 text-base md:text-lg text-white/95 max-w-xl">
              For 130 years Mengo Senior School has shaped generations of Ugandan leaders. Walk with us on{" "}
              <strong className="text-gold">{eventDateLabel}</strong> — or give from anywhere in the world.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link to="/donate" className="btn-gold text-base">Donate now</Link>
              <Link to="/kits" className="btn-outline !text-white !border-white/40 hover:!bg-white/10">Get your run kit</Link>
            </div>
          </div>
          <div className="card-heritage p-6 md:p-8 !bg-white/95 !border-white/40 text-foreground backdrop-blur-sm shadow-2xl">
            <ProgressBar raised={raised} goal={goal} />
            <div className="grid grid-cols-3 gap-3 mt-6 text-center">
              <Stat label="Donors" value={stats.data?.donor_count?.toLocaleString() ?? "—"} />
              <Stat label="Gifts" value={stats.data?.donation_count?.toLocaleString() ?? "—"} />
              <Stat label="Days to go" value={days.toString()} />
            </div>
            <div className="mt-4 text-xs text-muted-foreground text-center">
              Live from MTN MoMo, Airtel Money & Stanbic Bank.
            </div>
          </div>
        </div>
      </section>

      {/* Life on the hill — video strip */}
      <section className="container-page py-12 md:py-16">
        <div className="flex items-end justify-between mb-5">
          <div>
            <div className="text-xs uppercase tracking-widest text-gold font-semibold">The heartbeat of the hill</div>
            <h2 className="text-2xl md:text-4xl font-serif font-bold text-primary mt-1">A school in motion</h2>
          </div>
          <p className="hidden md:block text-sm text-muted-foreground max-w-sm text-right">
            Every gift lands in these classrooms, dorms, chapels and pitches. Watch and walk with us.
          </p>
        </div>
        <VideoStrip />
      </section>

      {/* STORY */}
      <section className="container-page py-14 md:py-20 grid md:grid-cols-3 gap-10">
        <div className="md:col-span-2">
          <h2 className="text-3xl font-serif font-bold text-primary">Why we walk</h2>
          <p className="mt-4 text-lg leading-relaxed text-foreground/90">
            {campaign.data?.story ??
              "For 130 years Mengo Senior School has shaped generations of Ugandan leaders."}
          </p>
          <div className="mt-6 grid sm:grid-cols-3 gap-3">
            {[
              { t: "Learning spaces", d: "Refurbish classrooms & the library." },
              { t: "Bursaries", d: "Keep bright students in school." },
              { t: "Safer campus", d: "Water, lighting and boarding upgrades." },
            ].map((p) => (
              <div key={p.t} className="card-heritage p-4">
                <div className="text-sm uppercase tracking-widest text-gold font-semibold">{p.t}</div>
                <div className="mt-1 text-sm text-muted-foreground">{p.d}</div>
              </div>
            ))}
          </div>
        </div>
        <aside className="card-heritage p-6">
          <div className="flex items-center gap-3 mb-3">
            <img src={crest.url} alt="" width={44} height={44} className="h-11 w-11 rounded-full object-cover ring-2 ring-gold/50" />
            <div>
              <div className="font-serif font-bold text-primary">The Event</div>
              <div className="text-xs text-muted-foreground">Sponsored walk & run</div>
            </div>
          </div>
          <dl className="text-sm space-y-2">
            <div className="flex justify-between"><dt className="text-muted-foreground">Date</dt><dd className="font-medium text-right">{eventDateLabel}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">Kit</dt><dd className="font-medium text-right">{formatUGX(30000)}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">Collection</dt><dd className="font-medium text-right">School pavilion</dd></div>
          </dl>
          <p className="text-xs text-muted-foreground mt-4">
            {campaign.data?.event_details}
          </p>
          <Link to="/kits" className="btn-primary mt-4 w-full">Reserve your kit</Link>
        </aside>
      </section>

      {/* LIVE FEED */}
      <section className="container-page pb-16">
        <div className="flex items-baseline justify-between mb-4">
          <h2 className="text-2xl md:text-3xl font-serif font-bold text-primary">Live donations</h2>
          <Link to="/donations" className="text-sm text-primary underline underline-offset-4">See all →</Link>
        </div>
        <div className="card-heritage p-4 md:p-6">
          <DonationTicker items={donations.data ?? []} />
        </div>
      </section>

      {/* Sticky mobile donate */}
      <div className="md:hidden fixed bottom-0 inset-x-0 z-40 p-3 bg-background/95 border-t border-border">
        <Link to="/donate" className="btn-primary w-full">Donate now</Link>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-2xl font-serif font-bold text-primary">{value}</div>
      <div className="text-[11px] uppercase tracking-widest text-muted-foreground">{label}</div>
    </div>
  );
}
