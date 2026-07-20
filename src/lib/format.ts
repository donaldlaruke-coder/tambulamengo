export function formatUGX(amount: number | bigint | null | undefined): string {
  const n = Number(amount ?? 0);
  return "UGX " + n.toLocaleString("en-UG");
}

export function timeAgo(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso).getTime();
  const s = Math.max(1, Math.floor((Date.now() - d) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  return `${days}d ago`;
}

export function daysUntil(dateISO: string): number {
  const target = new Date(dateISO + "T00:00:00").getTime();
  const now = Date.now();
  return Math.max(0, Math.ceil((target - now) / (1000 * 60 * 60 * 24)));
}

export function initials(name: string | null | undefined): string {
  if (!name) return "A";
  return name
    .split(/\s+/)
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function displayDonorName(t: { donor_display_name: string | null; is_anonymous: boolean }): string {
  if (t.is_anonymous) return "Anonymous friend";
  return t.donor_display_name?.trim() || "A well-wisher";
}

export function generateReference(prefix: string): string {
  const stamp = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${prefix}-${stamp}-${rand}`;
}