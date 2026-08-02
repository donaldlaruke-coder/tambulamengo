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

/* ─── Main page ─── */
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
  const pct = goal > 0 ? Math.min(100, Math.round((raised / goal) * 100)) : 0;

  return (
    <div className="lp-root">

      {/* ═══════════════════════════════════════ HERO ══ */}
      <section className="lp-hero">
        <HeroVideoWall />

        {/* thin gold rule at top */}
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
              <Link to="/donate" className="lp-cta-primary">
                Give now
              </Link>
              <Link to="/kits" className="lp-cta-ghost">
                Get a run kit
              </Link>
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

            {/* Progress track */}
            <div className="lp-card__track">
              <div
                className="lp-card__fill"
                style={{ width: `${Math.max(pct, 2)}%` }}
              />
            </div>

            {/* Three numbers */}
            <div className="lp-card__stats">
              <div className="lp-card__stat">
                <span className="lp-card__stat-val">
                  <AnimatedNumber to={stats.data?.donor_count ?? 0} />
                </span>
                <span className="lp-card__stat-lbl">Donors</span>
              </div>
              <div className="lp-card__divider" />
              <div className="lp-card__stat">
                <span className="lp-card__stat-val">
                  <AnimatedNumber to={stats.data?.donation_count ?? 0} />
                </span>
                <span className="lp-card__stat-lbl">Gifts</span>
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
          {/* Story */}
          <div className="lp-why__story">
            <span className="lp-kicker">Why we walk</span>
            <h2 className="lp-section-h2">130 years of excellence</h2>
            <p className="lp-why__body">
              {campaign.data?.story ??
                "Founded in 1895, Mengo Senior School has nurtured Uganda's doctors, engineers, artists and leaders. This run is our collective 'thank you' — and an investment in the next generation of Ugandans who will change the world."}
            </p>

            {/* Pillars */}
            <div className="lp-pillars">
              {[
                { icon: "📚", title: "Learning spaces", desc: "Refurbish classrooms and the library with modern equipment." },
                { icon: "🎓", title: "Bursaries", desc: "Keep bright students in school regardless of means." },
                { icon: "🏠", title: "Safer campus", desc: "Water, lighting and boarding upgrades for all students." },
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

          {/* Event card */}
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
                <span className="lp-event-card__val">{formatUGX(30_000)}</span>
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

      {/* ════════════════════════════════ LIVE FEED ══ */}
      <section className="lp-feed">
        <div className="container-page">
          <header className="lp-feed__header">
            <div>
              <span className="lp-kicker">Real-time</span>
              <h2 className="lp-section-h2">Live donations</h2>
            </div>
            <Link to="/donations" className="lp-feed__all">
              See all gifts →
            </Link>
          </header>

          <div className="lp-feed__card">
            {donations.data?.length ? (
              <DonationTicker items={donations.data} />
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
            <Link to="/donate" className="lp-cta-gold">
              Donate now
            </Link>
            <Link to="/kits" className="lp-cta-ghost lp-band__ghost">
              Get a run kit
            </Link>
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
