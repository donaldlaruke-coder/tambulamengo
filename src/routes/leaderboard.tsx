import { createFileRoute, Link } from "@tanstack/react-router";
import { Trophy, Medal, Award, Crown, Sparkles, Heart, ShieldCheck, ArrowRight, Flame } from "lucide-react";
import { formatUGX, initials, timeAgo } from "@/lib/format";
import { useLeaderboard, type LeaderboardEntry } from "@/hooks/use-campaign";

export const Route = createFileRoute("/leaderboard")({
  head: () => ({
    meta: [
      { title: "Donor Leaderboard — Tambula Mengo" },
      {
        name: "description",
        content: "Top donors and benefactors championing Mengo Senior School's 130-year legacy.",
      },
    ],
  }),
  component: LeaderboardPage,
});

function LeaderboardPage() {
  const { data, isLoading, error } = useLeaderboard();

  const leaderboard = data?.leaderboard ?? [];
  const showAmounts = data?.show_amounts ?? true;
  const totalDonors = data?.total_donors ?? leaderboard.length;

  const top1 = leaderboard.find((d) => d.rank === 1);
  const top2 = leaderboard.find((d) => d.rank === 2);
  const top3 = leaderboard.find((d) => d.rank === 3);
  const restDonors = leaderboard.filter((d) => d.rank > 3);

  return (
    <div className="min-h-screen bg-background text-foreground py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-10">
        {/* Header Banner */}
        <header className="text-center space-y-4 pt-4">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold uppercase tracking-wider animate-pulse">
            <Flame className="h-4 w-4 text-amber-500" />
            Live Honor Roll · Real-Time Rankings
          </div>
          <h1 className="text-3xl sm:text-5xl font-serif font-extrabold tracking-tight text-foreground">
            Donor Leaderboard
          </h1>
          <p className="max-w-2xl mx-auto text-base sm:text-lg text-muted-foreground leading-relaxed">
            Honoring our most generous alumni, parents, well-wishers, and friends propelling{" "}
            <strong className="text-primary font-semibold">Mengo Senior School</strong> forward.
          </p>
          <div className="flex flex-wrap justify-center items-center gap-4 text-xs font-medium text-muted-foreground pt-1">
            <span className="flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-amber-500" />
              <span>Ranked by cumulative gifts per phone</span>
            </span>
            <span>•</span>
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
              <span>{totalDonors} {totalDonors === 1 ? "Contributor" : "Total Contributors"}</span>
            </span>
          </div>
        </header>

        {/* Loading State */}
        {isLoading && (
          <div className="py-20 text-center space-y-3">
            <div className="h-10 w-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-muted-foreground text-sm font-medium">Loading live donor standings…</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-6 text-center text-destructive">
            Failed to load leaderboard. Please refresh or try again shortly.
          </div>
        )}

        {!isLoading && leaderboard.length === 0 && (
          <div className="card-heritage p-12 text-center space-y-4 max-w-md mx-auto">
            <div className="h-16 w-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto text-2xl">
              🏆
            </div>
            <h3 className="text-xl font-bold font-serif">Be the First on the Leaderboard!</h3>
            <p className="text-sm text-muted-foreground">
              No confirmed gifts recorded yet. Make a donation today and claim the Gold 🥇 spot!
            </p>
            <div className="pt-2">
              <Link to="/donate" className="btn-primary w-full inline-flex items-center justify-center gap-2">
                <Heart className="h-4 w-4 fill-current" /> Make a Donation
              </Link>
            </div>
          </div>
        )}

        {!isLoading && leaderboard.length > 0 && (
          <>
            {/* Top 3 Podium Cards */}
            <section aria-label="Top 3 Donors Podium" className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end pt-4">
              {/* Silver (Rank 2) */}
              <div className="order-2 md:order-1">
                {top2 ? (
                  <PodiumCard
                    entry={top2}
                    tierTitle="Silver Plated"
                    badgeIcon={<Medal className="h-6 w-6 text-slate-300" />}
                    borderColor="border-slate-400/50 shadow-slate-300/20"
                    bgGradient="bg-gradient-to-b from-slate-100 via-card to-background dark:from-slate-900/60 dark:via-card dark:to-background"
                    badgeBg="bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-100 border-slate-400/40"
                    showAmounts={showAmounts}
                    ribbon="🥈 2nd Place"
                  />
                ) : (
                  <EmptyPodiumSlot rank={2} label="2nd Place (Silver)" />
                )}
              </div>

              {/* Gold (Rank 1 - Highlighted & Taller) */}
              <div className="order-1 md:order-2 md:-translate-y-4">
                {top1 ? (
                  <PodiumCard
                    entry={top1}
                    tierTitle="Gold Plated"
                    badgeIcon={<Crown className="h-8 w-8 text-amber-500 animate-bounce" />}
                    borderColor="border-amber-400 shadow-amber-500/30 ring-2 ring-amber-400/40"
                    bgGradient="bg-gradient-to-b from-amber-100/80 via-amber-500/5 to-card dark:from-amber-950/50 dark:via-amber-900/10 dark:to-card"
                    badgeBg="bg-gradient-to-r from-amber-400 to-yellow-500 text-amber-950 font-black border-amber-300 shadow-md"
                    showAmounts={showAmounts}
                    ribbon="🥇 Champion · 1st Place"
                    isChampion
                  />
                ) : (
                  <EmptyPodiumSlot rank={1} label="1st Place (Gold)" isChampion />
                )}
              </div>

              {/* Bronze (Rank 3) */}
              <div className="order-3 md:order-3">
                {top3 ? (
                  <PodiumCard
                    entry={top3}
                    tierTitle="Bronze Plated"
                    badgeIcon={<Award className="h-6 w-6 text-amber-700 dark:text-amber-400" />}
                    borderColor="border-amber-700/40 shadow-amber-700/10"
                    bgGradient="bg-gradient-to-b from-amber-100/40 via-card to-background dark:from-amber-950/30 dark:via-card dark:to-background"
                    badgeBg="bg-amber-200 text-amber-900 dark:bg-amber-900 dark:text-amber-100 border-amber-700/40"
                    showAmounts={showAmounts}
                    ribbon="🥉 3rd Place"
                  />
                ) : (
                  <EmptyPodiumSlot rank={3} label="3rd Place (Bronze)" />
                )}
              </div>
            </section>

            {/* Rank 4+ General Rankings List */}
            {restDonors.length > 0 && (
              <section className="space-y-4 pt-6">
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <h2 className="text-xl font-serif font-bold text-foreground flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-primary" />
                    Honor Roll (Ranks 4+)
                  </h2>
                  <span className="text-xs text-muted-foreground font-medium">
                    {restDonors.length} more contributors
                  </span>
                </div>

                <div className="card-heritage overflow-hidden p-0 divide-y divide-border">
                  {restDonors.map((donor) => (
                    <div
                      key={donor.rank}
                      className="flex items-center justify-between gap-4 p-4 hover:bg-muted/40 transition-colors"
                    >
                      <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                        {/* Rank Pill */}
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted border border-border text-foreground font-bold text-xs flex items-center justify-center">
                          #{donor.rank}
                        </div>

                        {/* Avatar / Initials */}
                        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-sm border border-primary/20">
                          {donor.is_anonymous ? "?" : initials(donor.donor_name)}
                        </div>

                        {/* Name & details */}
                        <div className="min-w-0">
                          <p className="font-semibold text-foreground truncate text-sm sm:text-base">
                            {donor.donor_name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {donor.donations_count} {donor.donations_count === 1 ? "gift" : "gifts"} given ·{" "}
                            {timeAgo(donor.last_donated_at)}
                          </p>
                        </div>
                      </div>

                      {/* Amount or Contributor Badge */}
                      <div className="text-right flex-shrink-0">
                        {showAmounts && donor.total_amount !== null ? (
                          <div className="font-serif font-bold text-primary text-base sm:text-lg">
                            {formatUGX(donor.total_amount)}
                          </div>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
                            Contributor
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </>
        )}

        {/* Motivational Call To Action */}
        <section className="rounded-3xl bg-gradient-to-r from-primary via-primary/95 to-amber-950 text-primary-foreground p-8 sm:p-10 shadow-2xl relative overflow-hidden text-center space-y-6">
          <div className="absolute top-0 right-0 -mr-12 -mt-12 w-48 h-48 rounded-full bg-amber-400/10 blur-2xl pointer-events-none" />
          <div className="max-w-2xl mx-auto space-y-3 relative z-10">
            <h2 className="text-2xl sm:text-3xl font-serif font-bold text-white">
              Want to see your name on the Leaderboard?
            </h2>
            <p className="text-primary-foreground/80 text-sm sm:text-base leading-relaxed">
              Every single gift empowers students and sustains Mengo Senior School. Your donation
              instantly updates your standing on the live leaderboard!
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 relative z-10 pt-2">
            <Link
              to="/donate"
              className="inline-flex items-center gap-2 bg-amber-400 hover:bg-amber-300 text-amber-950 font-bold px-6 py-3.5 rounded-full shadow-lg transition-transform hover:scale-105"
            >
              <Heart className="h-4 w-4 fill-current text-primary" />
              Make a Donation Today
            </Link>
            <Link
              to="/kits"
              className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white font-semibold px-6 py-3.5 rounded-full border border-white/20 backdrop-blur-sm transition-transform hover:scale-105"
            >
              Buy a Run Kit <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}

function PodiumCard({
  entry,
  tierTitle,
  badgeIcon,
  borderColor,
  bgGradient,
  badgeBg,
  showAmounts,
  ribbon,
  isChampion = false,
}: {
  entry: LeaderboardEntry;
  tierTitle: string;
  badgeIcon: React.ReactNode;
  borderColor: string;
  bgGradient: string;
  badgeBg: string;
  showAmounts: boolean;
  ribbon: string;
  isChampion?: boolean;
}) {
  return (
    <div
      className={`relative rounded-2xl border-2 ${borderColor} ${bgGradient} p-6 text-center shadow-xl transition-transform hover:-translate-y-1 duration-300 flex flex-col justify-between ${
        isChampion ? "min-h-[340px]" : "min-h-[300px]"
      }`}
    >
      {/* Top Ribbon Badge */}
      <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
        <span
          className={`inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-bold tracking-wide border shadow-sm ${badgeBg}`}
        >
          {ribbon}
        </span>
      </div>

      <div className="pt-3 space-y-4">
        {/* Icon & Avatar */}
        <div className="relative mx-auto w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center">
          <div className="w-full h-full rounded-full bg-card border-2 border-primary/20 text-primary font-bold text-xl sm:text-2xl flex items-center justify-center shadow-inner">
            {entry.is_anonymous ? "?" : initials(entry.donor_name)}
          </div>
          <div className="absolute -bottom-2 -right-2 p-1.5 rounded-full bg-card shadow-md border border-border">
            {badgeIcon}
          </div>
        </div>

        {/* Donor Name & Category */}
        <div className="space-y-1">
          <h3 className={`font-serif font-extrabold text-foreground tracking-tight line-clamp-1 ${isChampion ? "text-xl sm:text-2xl text-amber-600 dark:text-amber-400" : "text-lg sm:text-xl"}`}>
            {entry.donor_name}
          </h3>
          <p className="text-xs uppercase font-semibold tracking-wider text-muted-foreground">
            {tierTitle}
          </p>
        </div>
      </div>

      {/* Stats & Amounts */}
      <div className="pt-4 border-t border-border/50 space-y-1">
        {showAmounts && entry.total_amount !== null ? (
          <div className={`font-serif font-black tracking-tight text-primary ${isChampion ? "text-2xl sm:text-3xl text-primary" : "text-xl sm:text-2xl"}`}>
            {formatUGX(entry.total_amount)}
          </div>
        ) : (
          <div className="text-sm font-bold text-primary py-1">
            Top Tier Benefactor
          </div>
        )}
        <div className="text-xs text-muted-foreground font-medium">
          {entry.donations_count} {entry.donations_count === 1 ? "confirmed gift" : "confirmed gifts"}
        </div>
      </div>
    </div>
  );
}

function EmptyPodiumSlot({ rank, label, isChampion = false }: { rank: number; label: string; isChampion?: boolean }) {
  return (
    <div
      className={`rounded-2xl border-2 border-dashed border-border bg-muted/20 p-6 text-center flex flex-col items-center justify-center gap-3 ${
        isChampion ? "min-h-[340px]" : "min-h-[300px]"
      }`}
    >
      <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center font-bold text-muted-foreground text-sm">
        #{rank}
      </div>
      <p className="text-xs text-muted-foreground font-medium">{label}</p>
      <Link to="/donate" className="text-xs text-primary font-bold underline">
        Claim this spot →
      </Link>
    </div>
  );
}
