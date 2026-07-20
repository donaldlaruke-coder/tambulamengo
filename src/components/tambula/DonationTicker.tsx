import { displayDonorName, formatUGX, initials, timeAgo } from "@/lib/format";
import type { PublicTransaction } from "@/hooks/use-campaign";

const methodLabel: Record<PublicTransaction["payment_method"], string> = {
  mtn_momo: "MTN MoMo",
  airtel_money: "Airtel Money",
  bank: "Bank",
};

export function DonationTicker({ items }: { items: PublicTransaction[] }) {
  if (!items.length) {
    return (
      <div className="text-center text-muted-foreground py-8">
        Be the first to give — every gift shows here in real time.
      </div>
    );
  }
  return (
    <ul className="divide-y divide-border">
      {items.map((t) => (
        <li key={t.id} className="flex items-center gap-3 py-3">
          <div className="h-10 w-10 rounded-full bg-primary/10 text-primary font-semibold flex items-center justify-center flex-shrink-0">
            {initials(t.is_anonymous ? null : t.donor_display_name)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-baseline gap-x-2">
              <span className="font-semibold truncate">{displayDonorName(t)}</span>
              <span className="text-xs text-muted-foreground">{timeAgo(t.confirmed_at ?? t.created_at)}</span>
            </div>
            {t.message ? (
              <p className="text-sm text-muted-foreground truncate">“{t.message}”</p>
            ) : (
              <p className="text-xs text-muted-foreground">{methodLabel[t.payment_method]} · {t.type === "kit_purchase" ? "Run kit" : "Donation"}</p>
            )}
          </div>
          <div className="font-serif font-bold text-primary whitespace-nowrap">{formatUGX(t.amount)}</div>
        </li>
      ))}
    </ul>
  );
}