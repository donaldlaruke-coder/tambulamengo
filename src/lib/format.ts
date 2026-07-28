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

// Normalize a Uganda mobile number to the local 0XXXXXXXXX format.
// Handles +256, 256, leading 0, or missing leading 0 (9 digits).
export function normalizeUgPhone(raw: string): string | null {
  if (!raw) return null;
  const digits = raw.replace(/[^\d]/g, "");
  let local = digits;

  if (digits.startsWith("256")) {
    local = "0" + digits.slice(3);
  } else if (digits.startsWith("0")) {
    local = digits;
  } else if (digits.length === 9 && (digits.startsWith("7") || digits.startsWith("3"))) {
    local = "0" + digits;
  }

  // Accepts any 10-digit Uganda mobile number (starting with 07 or 03 or 0)
  if (!/^0[37]\d{8}$/.test(local)) {
    if (/^0\d{9}$/.test(local)) {
      return local;
    }
    return null;
  }
  return local;
}

// Comprehensive Uganda mobile network detection for MTN MoMo and Airtel Money.
// MTN: 077, 078, 076, 079, 039, 031
// Airtel: 070, 075, 074, 072, 073, 071
export function detectUgNetwork(raw: string): "mtn_momo" | "airtel_money" | null {
  const local = normalizeUgPhone(raw);
  if (!local) return null;
  const p = local.slice(0, 3);

  if (["077", "078", "076", "079", "039", "031"].includes(p)) {
    return "mtn_momo";
  }
  if (["070", "075", "074", "072", "073", "071"].includes(p)) {
    return "airtel_money";
  }

  // Fallback for any other 10-digit 07X or 03X number
  if (local.startsWith("07") || local.startsWith("03")) {
    return "mtn_momo";
  }

  return null;
}