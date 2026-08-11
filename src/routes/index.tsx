import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import crest from "@/assets/mengo-badge.jpg";
import { ProgressBar } from "@/components/tambula/ProgressBar";
import { DonationTicker } from "@/components/tambula/DonationTicker";
import { HeroVideoWall, VideoStrip } from "@/components/tambula/HeroVideos";
import { useCampaign, useCampaignStats, useLiveDonations } from "@/hooks/use-campaign";
import { daysUntil, formatUGX } from "@/lib/format";

export const Route = createFileRoute("/")({ component: Index });

/* ─── Animated counter ─── */
function AnimatedNumber({ to, duration = 1400 }: { to: number; duration?: number }) {
  const [val, setVal] = useState(0);
  const started = useRef(false);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (to === 0) return;
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !started.current) {
        started.current = true;
        const start = performance.now();
        const step = (now: number) => {
          const p = Math.min((now - start) / duration, 1);
          const ease = 1 - Math.pow(1 - p, 3);
          setVal(Math.round(ease * to));
          if (p < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
        io.disconnect();
      }
    }, { threshold: 0.3 });
    io.observe(el);
    return () => io.disconnect();
  }, [to, duration]);
  return <span ref={ref}>{val.toLocaleString()}</span>;
}

/* ─── Kit tally graphic ─── */
function KitBars({ kitCount, donationCount }: { kitCount: number; donationCount: number }) {
  const total = kitCount + donationCount;
  const kitPct = total > 0 ? Math.round((kitCount / total) * 100) : 50;
  const donPct = 100 - kitPct;

  // Donut SVG calculations
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (kitPct / 100) * circumference;

  return (
    <div className="lp-kit-bars space-y-4">
      <div className="flex items-center gap-4 bg-white/5 p-3 rounded-xl border border-white/10">
        {/* SVG Donut Graphic */}
        <div className="relative w-20 h-20 flex-shrink-0 flex items-center justify-center">
          <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 90 90">
            <circle
              cx="45"
              cy="45"
              r={radius}
              stroke="rgba(255,255,255,0.15)"
              strokeWidth="10"
              fill="transparent"
            />
            <circle
              cx="45"
              cy="45"
              r={radius}
              stroke="#C9A24B"
              strokeWidth="10"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              fill="transparent"
              style={{ transition: "stroke-dashoffset 1s ease-in-out" }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="text-sm font-serif font-bold text-gold">{kitPct}%</span>
            <span className="text-[9px] uppercase tracking-wider text-white/60">Kits</span>
          </div>
        </div>

        {/* Legend */}
        <div className="flex-1 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-gold inline-block" />
              <span className="text-white/80">Kits Bought</span>
            </div>
            <span className="font-bold text-gold font-serif">{kitCount.toLocaleString()}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-white/30 inline-block" />
              <span className="text-white/80">Direct Gifts</span>
            </div>
            <span className="font-bold text-white font-serif">{donationCount.toLocaleString()}</span>
          </div>
        </div>
      </div>

      <div className="lp-kit-bars__track">
        <div
          className="lp-kit-bars__segment lp-kit-bars__segment--kit"
          style={{ width: `${kitPct}%` }}
          title={`Kit purchases: ${kitCount}`}
        />
        <div
          className="lp-kit-bars__segment lp-kit-bars__segment--don"
          style={{ width: `${donPct}%` }}
          title={`Donations: ${donationCount}`}
        />
      </div>
    </div>
  );
}

/* ─── Main page ─── */
function Index() {
  const campaign = useCampaign();
  const stats = useCampaignStats();
  // 10 most recent — no "see all" link
  const donations = useLiveDonations(10);
  // Separate kit feed for counts
  const kitFeed = useLiveDonations(200, "kit_purchase");
  const donFeed = useLiveDonations(200, "donation");

  const raised = stats.data?.total_raised ?? 0;
  const goal = campaign.data?.goal_amount ?? 18_000_000_000;
  const eventDate = campaign.data?.event_date ?? "2026-08-15";
  const days = daysUntil(eventDate);
  const eventDateLabel = new Date(eventDate + "T00:00:00").toLocaleDateString("en-UG", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
  const pct = goal > 0 ? Math.min(100, Math.round((raised / goal) * 100)) : 0;
  const kitCount = kitFeed.data?.length ?? 0;
  const donCount = donFeed.data?.length ?? 0;

  return (
    <div className="lp-root">

      {/* ═══════════════════════════════════════ HERO ══ */}
      <section className="lp-hero">
        <HeroVideoWall />
        <div className="lp-hero__rule" />
        <div className="lp-hero__body container-page">

          {/* LEFT — text */}
          <div className="lp-hero__text">
            <div className="lp-hero__eyebrow">
              <img src={crest} alt="Mengo crest" className="lp-hero__crest" />
              <span className="lp-hero__eyebrow-label">
                <span className="lp-hero__pulse" />
                Live campaign
              </span>
            </div>
            <h1 className="lp-hero__h1">
              Tambula<br />
              <em className="lp-hero__em">Mengo</em>
            </h1>
            <p className="lp-hero__tagline">
              {campaign.data?.tagline ?? "Akwana Akira Ayomba — make friends, never foes."}
            </p>
            <p className="lp-hero__desc">
              130 years of shaping Uganda's finest minds. Walk with us on{" "}
              <strong>{eventDateLabel}</strong> — or give from anywhere in the world.
            </p>
            <div className="lp-hero__cta">
              <Link to="/donate" className="lp-cta-gold">Give now</Link>
              <Link to="/kits" className="lp-cta-ghost">Get a run kit</Link>
            </div>
          </div>

          {/* RIGHT — live stats card */}
          <div className="lp-hero__card">
            <div className="lp-card__header">
              <span className="lp-card__label">Total raised</span>
              <span className="lp-card__pct">{pct}%</span>
            </div>
            <div className="lp-card__amount">{formatUGX(raised)}</div>
            <div className="lp-card__goal">of {formatUGX(goal)} goal</div>
            <div className="lp-card__track">
              <div className="lp-card__fill" style={{ width: `${Math.max(pct, 2)}%` }} />
            </div>
            <div className="lp-card__stats">
              <div className="lp-card__stat">
                <span className="lp-card__stat-val"><AnimatedNumber to={stats.data?.donor_count ?? 0} /></span>
                <span className="lp-card__stat-lbl">Donors</span>
              </div>
              <div className="lp-card__divider" />
              <div className="lp-card__stat">
                <span className="lp-card__stat-val"><AnimatedNumber to={kitCount} /></span>
                <span className="lp-card__stat-lbl">Kits sold</span>
              </div>
              <div className="lp-card__divider" />
              <div className="lp-card__stat">
                <span className="lp-card__stat-val">{days}</span>
                <span className="lp-card__stat-lbl">Days left</span>
              </div>
            </div>
            <div className="lp-card__footer">
              Live from MTN MoMo · Airtel Money · Stanbic Bank
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════ PULL QUOTE ══ */}
      <section className="lp-pullquote">
        <div className="container-page lp-pullquote__inner">
          <span className="lp-pullquote__mark">"</span>
          <blockquote className="lp-pullquote__text">
            Every gift is a brick in the wall of opportunity for a child who
            might never otherwise have had a chance.
          </blockquote>
          <cite className="lp-pullquote__cite">— Mengo Senior School Alumni</cite>
        </div>
      </section>

      {/* ════════════════════════════ VIDEO / LIFE ON HILL ══ */}
      <section className="lp-media container-page">
        <header className="lp-section-header">
          <div className="lp-section-header__left">
            <span className="lp-kicker">The heartbeat of the hill</span>
            <h2 className="lp-section-h2">A school in motion</h2>
          </div>
          <p className="lp-section-header__right">
            Every gift lands in these classrooms, dorms, chapels and pitches.
          </p>
        </header>
        <VideoStrip />
      </section>

      {/* ══════════════════════════════════ WHY WE WALK ══ */}
      <section className="lp-why container-page">
        <div className="lp-why__grid">
          <div className="lp-why__story">
            <span className="lp-kicker">Why we walk</span>
            <h2 className="lp-section-h2">130 years of excellence</h2>
            <p className="lp-why__body">
              {campaign.data?.story ||
                "For 130 years Mengo Senior School has shaped generations of Ugandan leaders. Tambula Mengo is our sponsored walk-and-run to raise funds for the next chapter. Building the Mega Dining Hall Complex!"}
            </p>
            <div className="lp-pillars">
              {[
                { icon: "🍲", title: "Mega Dining Hall", desc: "High-capacity dining levels and modern kitchen infrastructure." },
                { icon: "🏋️", title: "Fitness & Gym Hub", desc: "Fully equipped indoor gymnasium to support student wellness." },
                { icon: "💻", title: "Multipurpose IT Hall", desc: "High-capacity, tech-enabled auditorium for school assemblies, exams, and events." },
              ].map((p) => (
                <div key={p.title} className="lp-pillar">
                  <span className="lp-pillar__icon">{p.icon}</span>
                  <div>
                    <div className="lp-pillar__title">{p.title}</div>
                    <div className="lp-pillar__desc">{p.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <aside className="lp-event-card">
            <div className="lp-event-card__top">
              <img src={crest} alt="" className="lp-event-card__crest" />
              <div>
                <div className="lp-event-card__title">The Event</div>
                <div className="lp-event-card__sub">Sponsored walk &amp; run</div>
              </div>
            </div>
            <div className="lp-event-card__rows">
              <div className="lp-event-card__row">
                <span className="lp-event-card__key">Date</span>
                <span className="lp-event-card__val">{eventDateLabel}</span>
              </div>
              <div className="lp-event-card__row">
                <span className="lp-event-card__key">Run kit</span>
                <span className="lp-event-card__val flex flex-col items-end leading-tight">
                  <span className="font-bold text-primary text-sm sm:text-base">UGX 27,000</span>
                  <span className="text-xs text-muted-foreground line-through font-normal">UGX 30,000</span>
                </span>
              </div>
              <div className="lp-event-card__row">
                <span className="lp-event-card__key">Collection</span>
                <span className="lp-event-card__val">School pavilion</span>
              </div>
            </div>
            {campaign.data?.event_details && (
              <p className="lp-event-card__details">{campaign.data.event_details}</p>
            )}
            <Link to="/kits" className="lp-cta-primary lp-event-card__cta">
              Reserve your kit →
            </Link>
            <Link to="/donate" className="lp-cta-outline lp-event-card__donate">
              Or donate without a kit
            </Link>
          </aside>
        </div>
      </section>

      {/* ════════════════════════════════ KIT SUMMARY ══ */}
      <section className="lp-kits-section">
        <div className="container-page">
          <header className="lp-section-header" style={{ marginBottom: "2rem" }}>
            <div className="lp-section-header__left">
              <span className="lp-kicker">Kit purchases</span>
              <h2 className="lp-section-h2">Runners signed up</h2>
            </div>
          </header>

          <div className="lp-kits-grid">
            {/* Big number */}
            <div className="lp-kits-hero">
              <div className="lp-kits-hero__number">
                <AnimatedNumber to={kitCount} />
              </div>
              <div className="lp-kits-hero__label">run kits purchased</div>
              <div className="lp-kits-hero__sub">
                Each kit secures your entry to the walk on {eventDateLabel}.
              </div>
              <Link to="/kits" className="lp-cta-primary lp-kits-hero__cta">
                Get your kit
              </Link>
            </div>

            {/* Split bar */}
            <div className="lp-kits-detail">
              <div className="lp-kits-detail__title">Breakdown</div>
              <KitBars kitCount={kitCount} donationCount={donCount} />

              {/* Revenue from kits */}
              <div className="lp-kits-stat-row">
                <div className="lp-kits-stat">
                  <div className="lp-kits-stat__val">{formatUGX(kitCount * 27_000)}</div>
                  <div className="lp-kits-stat__lbl">Kit revenue</div>
                </div>
                <div className="lp-kits-stat">
                  <div className="lp-kits-stat__val">{formatUGX(raised - kitCount * 27_000 > 0 ? raised - kitCount * 27_000 : 0)}</div>
                  <div className="lp-kits-stat__lbl">Pure donations</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════ LIVE FEED ══ */}
      <section className="lp-feed">
        <div className="container-page">
          <header className="lp-feed__header flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className="lp-kicker">Real-time</span>
              <h2 className="lp-section-h2">Recent gifts</h2>
            </div>
            <Link
              to="/leaderboard"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-amber-400/15 hover:bg-amber-400/25 border border-amber-500/30 text-amber-900 dark:text-amber-300 font-bold text-xs sm:text-sm transition-all shadow-sm"
            >
              🏆 Donor Leaderboard →
            </Link>
          </header>
          <div className="lp-feed__card">
            {donations.data?.length ? (
              <DonationTicker items={donations.data.slice(0, 10)} />
            ) : (
              <div className="lp-feed__empty">
                Be the first to give — every gift appears here in real time.
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════ FINAL CTA BAND ══ */}
      <section className="lp-band">
        <div className="container-page lp-band__inner">
          <div className="lp-band__text">
            <h2 className="lp-band__h2">Your gift matters — today.</h2>
            <p className="lp-band__sub">
              A gift of any size brings Mengo closer to its goal.
              Give in under 60 seconds via MTN MoMo or Airtel Money.
            </p>
          </div>
          <div className="lp-band__actions">
            <Link to="/donate" className="lp-cta-gold">Donate now</Link>
            <Link to="/kits" className="lp-cta-ghost lp-band__ghost">Get a run kit</Link>
          </div>
        </div>
      </section>

      {/* Sticky mobile bar */}
      <div className="lp-mobile-sticky">
        <Link to="/donate" className="lp-cta-primary" style={{ width: "100%" }}>
          Donate now
        </Link>
      </div>
    </div>
  );
}
