import { formatUGX } from "@/lib/format";
import type { PublicTransaction } from "@/hooks/use-campaign";

interface ProgressBarProps {
  raised: number;
  goal: number;
  donations?: PublicTransaction[];
}

export function ProgressBar({ raised, goal, donations = [] }: ProgressBarProps) {
  const pct = goal > 0 ? Math.min(100, (raised / goal) * 100) : 0;

  // Compute momentum: total confirmed amount in last 24 h
  const now = Date.now();
  const h24 = 24 * 60 * 60 * 1000;
  const momentum24h = donations
    .filter((d) => {
      const ts = d.confirmed_at ?? d.created_at;
      return ts && now - new Date(ts).getTime() < h24;
    })
    .reduce((sum, d) => sum + d.amount, 0);

  const hasMomentum = momentum24h > 0;

  // Categorise momentum intensity
  const intensity =
    momentum24h >= 5_000_000 ? "high" :
    momentum24h >= 500_000  ? "mid"  : "low";

  const flameEmoji  = intensity === "high" ? "🔥🔥" : intensity === "mid" ? "🔥" : "✨";
  const barGlowClass =
    intensity === "high"
      ? "shadow-[0_0_12px_4px_rgba(255,180,0,0.55)] animate-pulse"
      : intensity === "mid"
      ? "shadow-[0_0_8px_2px_rgba(255,180,0,0.35)]"
      : "";

  return (
    <div>
      <div className="flex items-baseline justify-between mb-2">
        <div>
          <div className="text-3xl md:text-4xl font-serif font-bold">{formatUGX(raised)}</div>
          <div className="text-sm opacity-80">raised of {formatUGX(goal)} goal</div>
        </div>
        <div className="text-right">
          <div className="text-2xl md:text-3xl font-serif font-bold text-gold">{pct.toFixed(1)}%</div>
          <div className="text-xs opacity-80">of goal</div>
        </div>
      </div>

      {/* Bar */}
      <div className="relative h-4 rounded-full bg-black/25 overflow-hidden">
        <div
          className={`h-full rounded-full bg-gold transition-[width] duration-700 ${barGlowClass}`}
          style={{ width: `${pct}%` }}
        />
        {/* Shimmer sweep when high momentum */}
        {intensity === "high" && pct > 2 && (
          <div
            className="absolute inset-0 rounded-full overflow-hidden pointer-events-none"
            style={{ width: `${pct}%` }}
          >
            <div
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.35) 50%, transparent 100%)",
                animation: "shimmer 1.6s infinite",
              }}
            />
          </div>
        )}
      </div>

      {/* Momentum badge */}
      {hasMomentum && (
        <div className="flex items-center gap-1.5 mt-2.5">
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold tracking-wide
              ${intensity === "high"
                ? "bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-400/40"
                : intensity === "mid"
                ? "bg-amber-400/15 text-amber-600 dark:text-amber-400 border border-amber-400/30"
                : "bg-amber-300/10 text-amber-600 dark:text-amber-400 border border-amber-300/20"
              }`}
          >
            {flameEmoji} {formatUGX(momentum24h)} raised today
          </span>
        </div>
      )}
    </div>
  );
}