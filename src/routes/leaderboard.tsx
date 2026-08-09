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
    <div className="min-h-screen bg-background text-foreground py-6 sm:py-10 px-3 sm:px-6 lg:px-8 pb-20 sm:pb-12">
      <div className="max-w-5xl mx-auto space-y-6 sm:space-y-10">
        {/* Header Banner */}
        <header className="text-center space-y-3 sm:space-y-4 pt-2 sm:pt-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 sm:px-4 sm:py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-[11px] sm:text-xs font-bold uppercase tracking-wider animate-pulse">
            <Flame className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-amber-500" />
            Live Honor Roll · Real-Time Rankings
          </div>
          <h1 className="text-2xl sm:text-4xl md:text-5xl font-serif font-extrabold tracking-tight text-foreground">
            Donor Leaderboard
          </h1>
          <p className="max-w-2xl mx-auto text-sm sm:text-base md:text-lg text-muted-foreground leading-relaxed px-2">
            Honoring our most generous alumni, parents, well-wishers, and friends propelling{" "}
            <strong className="text-primary font-semibold">Mengo Senior School</strong> forward.
          </p>
          <div className="flex flex-wrap justify-center items-center gap-2 sm:gap-4 text-[11px] sm:text-xs font-medium text-muted-foreground pt-1">
            <span className="flex items-center gap-1.5 bg-muted/50 px-2.5 py-1 rounded-full border border-border/50">
              <Sparkles className="h-3.5 w-3.5 text-amber-500" />
              <span>Grouped per phone number</span>
            </span>
            <span className="flex items-center gap-1.5 bg-muted/50 px-2.5 py-1 rounded-full border border-border/50">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
              <span>{totalDonors} {totalDonors === 1 ? "Contributor" : "Total Contributors"}</span>
            </span>
          </div>
        </header>

        {/* Loading State */}
        {isLoading && (
          <div className="py-16 sm:py-20 text-center space-y-3">
            <div className="h-9 w-9 sm:h-10 sm:w-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-muted-foreground text-xs sm:text-sm font-medium">Loading live donor standings…</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-5 text-center text-xs sm:text-sm text-destructive">
            Failed to load leaderboard. Please refresh or try again shortly.
          </div>
        )}

        {!isLoading && leaderboard.length === 0 && (
          <div className="card-heritage p-8 sm:p-12 text-center space-y-4 max-w-md mx-auto">
            <div className="h-14 w-14 sm:h-16 sm:w-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto text-2xl">
              🏆
            </div>
            <h3 className="text-lg sm:text-xl font-bold font-serif">Be the First on the Leaderboard!</h3>
            <p className="text-xs sm:text-sm text-muted-foreground">
              No confirmed gifts recorded yet. Make a donation today and claim the Gold 🥇 spot!
            </p>
            <div className="pt-2">
              <Link to="/donate" className="btn-primary w-full inline-flex items-center justify-center gap-2 text-sm sm:text-base py-3">
                <Heart className="h-4 w-4 fill-current" /> Make a Donation
              </Link>
            </div>
          </div>
        )}

        {!isLoading && leaderboard.length > 0 && (
          <>
            {/* Top 3 Podium Cards */}
            <section aria-label="Top 3 Donors Podium" className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 items-end pt-2 sm:pt-4">
              {/* Silver (Rank 2) */}
              <div className="order-2 md:order-1">
                {top2 ? (
                  <PodiumCard
                    entry={top2}
                    tierTitle="Silver Plated"
                    badgeIcon={<Medal className="h-5 w-5 sm:h-6 sm:w-6 text-slate-300" />}
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
                    badgeIcon={<Crown className="h-6 w-6 sm:h-8 sm:w-8 text-amber-500 animate-bounce" />}
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
                    badgeIcon={<Award className="h-5 w-5 sm:h-6 sm:w-6 text-amber-700 dark:text-amber-400" />}
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
              <section className="space-y-3 sm:space-y-4 pt-4 sm:pt-6">
                <div className="flex items-center justify-between border-b border-border pb-2.5 sm:pb-3 px-1">
                  <h2 className="text-lg sm:text-xl font-serif font-bold text-foreground flex items-center gap-2">
                    <Trophy className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
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
                      className="flex items-center justify-between gap-2.5 sm:gap-4 p-3 sm:p-4 hover:bg-muted/40 transition-colors"
                    >
                      <div className="flex items-center gap-2.5 sm:gap-4 min-w-0 flex-1">
                        {/* Rank Pill */}
                        <div className="flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-muted border border-border text-foreground font-bold text-xs flex items-center justify-center">
                          #{donor.rank}
                        </div>

                        {/* Avatar / Initials */}
                        <div className="flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-xs sm:text-sm border border-primary/20">
                          {donor.is_anonymous ? "?" : initials(donor.donor_name)}
                        </div>

                        {/* Name & details */}
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-foreground truncate text-xs sm:text-base">
                            {donor.donor_name}
                          </p>
                          <p className="text-[11px] sm:text-xs text-muted-foreground truncate">
                            {donor.donations_count} {donor.donations_count === 1 ? "gift" : "gifts"} ·{" "}
                            {timeAgo(donor.last_donated_at)}
                          </p>
                        </div>
                      </div>

                      {/* Amount or Contributor Badge */}
                      <div className="text-right flex-shrink-0 pl-1">
                        {showAmounts && donor.total_amount !== null ? (
                          <div className="font-serif font-bold text-primary text-xs sm:text-lg whitespace-nowrap">
                            {formatUGX(donor.total_amount)}
                          </div>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-semibold bg-primary/10 text-primary border border-primary/20 whitespace-nowrap">
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
        <section className="rounded-2xl sm:rounded-3xl bg-gradient-to-r from-primary via-primary/95 to-amber-950 text-primary-foreground p-5 sm:p-10 shadow-2xl relative overflow-hidden text-center space-y-4 sm:space-y-6">
          <div className="absolute top-0 right-0 -mr-12 -mt-12 w-48 h-48 rounded-full bg-amber-400/10 blur-2xl pointer-events-none" />
          <div className="max-w-2xl mx-auto space-y-2 sm:space-y-3 relative z-10">
            <h2 className="text-xl sm:text-3xl font-serif font-bold text-white">
              Want to see your name on the Leaderboard?
            </h2>
            <p className="text-primary-foreground/80 text-xs sm:text-base leading-relaxed">
              Every single gift empowers students and sustains Mengo Senior School. Your donation
              instantly updates your standing on the live leaderboard!
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 relative z-10 pt-1 sm:pt-2">
            <Link
              to="/donate"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-amber-400 hover:bg-amber-300 text-amber-950 font-bold px-6 py-3 rounded-full shadow-lg transition-transform hover:scale-105 text-sm sm:text-base"
            >
              <Heart className="h-4 w-4 fill-current text-primary" />
              Make a Donation Today
            </Link>
            <Link
              to="/kits"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white font-semibold px-6 py-3 rounded-full border border-white/20 backdrop-blur-sm transition-transform hover:scale-105 text-sm sm:text-base"
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
      className={`relative rounded-2xl border-2 ${borderColor} ${bgGradient} p-4 sm:p-6 text-center shadow-xl transition-transform hover:-translate-y-1 duration-300 flex flex-col justify-between ${
        isChampion ? "min-h-[280px] sm:min-h-[340px]" : "min-h-[250px] sm:min-h-[300px]"
      }`}
    >
      {/* Top Ribbon Badge */}
      <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 whitespace-nowrap">
        <span
          className={`inline-flex items-center gap-1 sm:gap-1.5 px-2.5 py-0.5 sm:px-3.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-bold tracking-wide border shadow-sm ${badgeBg}`}
        >
          {ribbon}
        </span>
      </div>

      <div className="pt-2 sm:pt-3 space-y-2 sm:space-y-4">
        {/* Icon & Avatar */}
        <div className="relative mx-auto w-14 h-14 sm:w-20 sm:h-20 flex items-center justify-center">
          <div className="w-full h-full rounded-full bg-card border-2 border-primary/20 text-primary font-bold text-lg sm:text-2xl flex items-center justify-center shadow-inner">
            {entry.is_anonymous ? "?" : initials(entry.donor_name)}
          </div>
          <div className="absolute -bottom-1.5 -right-1.5 sm:-bottom-2 sm:-right-2 p-1 sm:p-1.5 rounded-full bg-card shadow-md border border-border">
            {badgeIcon}
          </div>
        </div>

        {/* Donor Name & Category */}
        <div className="space-y-0.5 sm:space-y-1">
          <h3 className={`font-serif font-extrabold text-foreground tracking-tight line-clamp-1 ${isChampion ? "text-base sm:text-2xl text-amber-600 dark:text-amber-400" : "text-sm sm:text-xl"}`}>
            {entry.donor_name}
          </h3>
          <p className="text-[10px] sm:text-xs uppercase font-semibold tracking-wider text-muted-foreground">
            {tierTitle}
          </p>
        </div>
      </div>

      {/* Stats & Amounts */}
      <div className="pt-3 sm:pt-4 border-t border-border/50 space-y-0.5 sm:space-y-1">
        {showAmounts && entry.total_amount !== null ? (
          <div className={`font-serif font-black tracking-tight text-primary ${isChampion ? "text-xl sm:text-3xl text-primary" : "text-base sm:text-2xl"}`}>
            {formatUGX(entry.total_amount)}
          </div>
        ) : (
          <div className="text-xs sm:text-sm font-bold text-primary py-0.5 sm:py-1">
            Top Tier Benefactor
          </div>
        )}
        <div className="text-[11px] sm:text-xs text-muted-foreground font-medium">
          {entry.donations_count} {entry.donations_count === 1 ? "confirmed gift" : "confirmed gifts"}
        </div>
      </div>
    </div>
  );
}

function EmptyPodiumSlot({ rank, label, isChampion = false }: { rank: number; label: string; isChampion?: boolean }) {
  return (
    <div
      className={`rounded-2xl border-2 border-dashed border-border bg-muted/20 p-4 sm:p-6 text-center flex flex-col items-center justify-center gap-2 sm:gap-3 ${
        isChampion ? "min-h-[280px] sm:min-h-[340px]" : "min-h-[250px] sm:min-h-[300px]"
      }`}
    >
      <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-muted flex items-center justify-center font-bold text-muted-foreground text-xs sm:text-sm">
        #{rank}
      </div>
      <p className="text-[11px] sm:text-xs text-muted-foreground font-medium">{label}</p>
      <Link to="/donate" className="text-[11px] sm:text-xs text-primary font-bold underline">
        Claim this spot →
      </Link>
    </div>
  );
}
