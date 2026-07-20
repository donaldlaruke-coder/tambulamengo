import { formatUGX } from "@/lib/format";

export function ProgressBar({ raised, goal }: { raised: number; goal: number }) {
  const pct = goal > 0 ? Math.min(100, (raised / goal) * 100) : 0;
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
      <div className="h-3 rounded-full bg-black/25 overflow-hidden">
        <div
          className="h-full bg-gold transition-[width] duration-700"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}