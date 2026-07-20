import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { formatUGX, generateReference } from "@/lib/format";
import { getBankTransferDetails, mockConfirmTransaction } from "@/lib/payments.functions";

const searchSchema = z.object({
  amount: z.number().optional(),
  kit: z.string().optional(),
  size: z.string().optional(),
  qty: z.number().optional(),
});

export const Route = createFileRoute("/donate")({
  validateSearch: (s) => searchSchema.parse(s),
  head: () => ({
    meta: [
      { title: "Donate — Tambula Mengo" },
      { name: "description", content: "Give in under a minute via MTN Mobile Money, Airtel Money or bank transfer." },
    ],
  }),
  component: DonatePage,
});

const QUICK = [10000, 25000, 50000, 100000, 250000];
type Method = "mtn_momo" | "airtel_money" | "bank";
type Step = "details" | "waiting" | "success" | "bank_pending";

function DonatePage() {
  const nav = useNavigate();
  const search = useSearch({ from: "/donate" });
  const isKitFlow = !!search.kit;

  const [amount, setAmount] = useState<number>(search.amount ?? 25000);
  const [customOpen, setCustomOpen] = useState(false);
  const [name, setName] = useState("");
  const [anonymous, setAnonymous] = useState(false);
  const [message, setMessage] = useState("");
  const [method, setMethod] = useState<Method>("mtn_momo");
  const [phone, setPhone] = useState("");
  const [step, setStep] = useState<Step>("details");
  const [reference, setReference] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [bankDetails, setBankDetails] = useState<{
    bank_name: string | null;
    bank_account_name: string | null;
    bank_account_number: string | null;
  } | null>(null);

  const isMobileMoney = method === "mtn_momo" || method === "airtel_money";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (amount < 500) {
      toast.error("Minimum donation is UGX 500");
      return;
    }
    if (isMobileMoney && !/^(0|\+?256)?7\d{8}$/.test(phone.replace(/\s/g, ""))) {
      toast.error("Enter a valid Uganda mobile number (e.g. 0772 123 456)");
      return;
    }
    setBusy(true);
    try {
      let donorId: string | null = null;
      if (!anonymous && (name || phone)) {
        const { data: donor, error: dErr } = await supabase
          .from("donors")
          .insert({ name: name || null, phone: phone || null })
          .select("id")
          .single();
        if (dErr) throw dErr;
        donorId = donor.id;
      }
      const ref = generateReference(isKitFlow ? "KIT" : "TM");
      const { error: tErr } = await supabase.from("transactions").insert({
        donor_id: donorId,
        type: isKitFlow ? "kit_purchase" : "donation",
        amount,
        currency: "UGX",
        payment_method: method,
        status: "pending",
        internal_reference: ref,
        message: message || null,
        is_anonymous: anonymous,
        donor_display_name: anonymous ? null : name || null,
      });
      if (tErr) throw tErr;
      setReference(ref);

      if (isKitFlow && search.kit) {
        // Fetch the transaction we just created to get its id
        const { data: created } = await supabase
          .from("transactions")
          .select("id")
          .eq("internal_reference", ref)
          .single();
        if (created) {
          await supabase.from("kit_order_items").insert({
            transaction_id: created.id,
            kit_product_id: search.kit,
            size: search.size ?? null,
            quantity: search.qty ?? 1,
            unit_price: Math.round(amount / (search.qty ?? 1)),
          });
        }
      }

      if (method === "bank") {
        try {
          const details = await getBankTransferDetails({ data: { internal_reference: ref } });
          setBankDetails({
            bank_name: details.bank_name,
            bank_account_name: details.bank_account_name,
            bank_account_number: details.bank_account_number,
          });
        } catch {
          setBankDetails(null);
        }
        setStep("bank_pending");
      } else {
        setStep("waiting");
        // MOCK: simulate mobile-money confirmation after 4s
        setTimeout(async () => {
          try {
            const res = await mockConfirmTransaction({ data: { internal_reference: ref } });
            if (res.status !== "confirmed") throw new Error("not_confirmed");
            setStep("success");
          } catch {
            toast.error("Could not confirm payment. Please try again.");
            setStep("details");
          }
        }, 4000);
      }
    } catch (err) {
      console.error(err);
      toast.error("Could not start payment. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="container-page max-w-2xl py-8 md:py-12 pb-24">
      {step === "details" && (
        <form onSubmit={submit} className="space-y-6">
          <header>
            <div className="text-xs uppercase tracking-widest text-muted-foreground">Step 1 of 2</div>
            <h1 className="text-3xl md:text-4xl font-serif font-bold text-primary mt-1">
              {isKitFlow ? "Pay for your run kit" : "Give to Mengo"}
            </h1>
            <p className="text-muted-foreground mt-1">Takes under a minute. No account needed.</p>
          </header>

          {!isKitFlow && (
            <div className="card-heritage p-5">
              <label className="block text-sm font-semibold mb-3">Choose an amount (UGX)</label>
              <div className="grid grid-cols-3 gap-2">
                {QUICK.map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => { setAmount(v); setCustomOpen(false); }}
                    className={`min-h-14 rounded-lg border-2 font-semibold text-base ${
                      amount === v && !customOpen
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background hover:border-primary/40"
                    }`}
                  >
                    {v.toLocaleString()}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setCustomOpen(true)}
                  className={`min-h-14 rounded-lg border-2 font-semibold ${
                    customOpen ? "border-primary bg-primary text-primary-foreground" : "border-border hover:border-primary/40"
                  }`}
                >
                  Custom
                </button>
              </div>
              {customOpen && (
                <input
                  type="number"
                  inputMode="numeric"
                  min={500}
                  step={500}
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value) || 0)}
                  className="mt-3 w-full rounded-lg border border-input bg-background px-4 py-3 text-lg font-semibold"
                  placeholder="Enter amount"
                />
              )}
            </div>
          )}

          {isKitFlow && (
            <div className="card-heritage p-5">
              <div className="text-sm text-muted-foreground">Amount to pay</div>
              <div className="text-3xl font-serif font-bold text-primary">{formatUGX(amount)}</div>
              <div className="text-xs text-muted-foreground mt-1">
                {search.qty ?? 1} × Tambula Mengo Run Kit{search.size ? ` (${search.size})` : ""}
              </div>
            </div>
          )}

          <div className="card-heritage p-5 space-y-4">
            <div>
              <label className="block text-sm font-semibold mb-1">Your name <span className="text-muted-foreground font-normal">(optional)</span></label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={anonymous}
                placeholder="e.g. Jane N."
                className="w-full rounded-lg border border-input bg-background px-4 py-3 disabled:opacity-50"
              />
            </div>
            {!isKitFlow && (
              <div>
                <label className="block text-sm font-semibold mb-1">Message <span className="text-muted-foreground font-normal">(optional)</span></label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  maxLength={200}
                  rows={2}
                  placeholder="Say something to Mengo…"
                  className="w-full rounded-lg border border-input bg-background px-4 py-3"
                />
              </div>
            )}
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={anonymous} onChange={(e) => setAnonymous(e.target.checked)} className="h-5 w-5 accent-[oklch(0.38_0.13_20)]" />
              <span className="text-sm">Give anonymously</span>
            </label>
          </div>

          <div className="card-heritage p-5">
            <div className="text-xs uppercase tracking-widest text-muted-foreground mb-3">Step 2 of 2 · Payment method</div>
            <div className="grid grid-cols-1 gap-2">
              <MethodOption id="mtn_momo" active={method} onSelect={setMethod} title="MTN Mobile Money" hint="Fast · confirm on your phone" />
              <MethodOption id="airtel_money" active={method} onSelect={setMethod} title="Airtel Money" hint="Fast · confirm on your phone" />
              <MethodOption id="bank" active={method} onSelect={setMethod} title="Bank transfer / deposit" hint="Manual confirmation · details shown next" />
            </div>
            {isMobileMoney && (
              <div className="mt-4">
                <label className="block text-sm font-semibold mb-1">Phone number</label>
                <input
                  type="tel"
                  inputMode="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="0772 123 456"
                  className="w-full rounded-lg border border-input bg-background px-4 py-3 text-lg"
                />
                <p className="text-xs text-muted-foreground mt-2">
                  We'll send a prompt to this phone. Enter your PIN to confirm.
                </p>
              </div>
            )}
          </div>

          <button type="submit" disabled={busy} className="btn-primary w-full text-base">
            {busy ? "Please wait…" : method === "bank" ? "Get bank details" : `Pay ${formatUGX(amount)}`}
          </button>
          <p className="text-xs text-muted-foreground text-center">
            By continuing you agree that Mengo Senior School may contact you about this gift.
          </p>
        </form>
      )}

      {step === "waiting" && (
        <div className="text-center py-10 space-y-6">
          <div className="mx-auto h-16 w-16 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
          <div>
            <h2 className="text-2xl font-serif font-bold text-primary">Check your phone</h2>
            <p className="text-muted-foreground mt-2 max-w-md mx-auto">
              Enter your {method === "mtn_momo" ? "MTN MoMo" : "Airtel Money"} PIN to confirm{" "}
              <strong className="text-foreground">{formatUGX(amount)}</strong> to Mengo Senior School.
            </p>
            <p className="text-xs text-muted-foreground mt-3">Reference: {reference}</p>
          </div>
        </div>
      )}

      {step === "bank_pending" && (
        <div className="space-y-5 py-4">
          <header>
            <h1 className="text-2xl md:text-3xl font-serif font-bold text-primary">Bank transfer details</h1>
            <p className="text-muted-foreground mt-1">Pay {formatUGX(amount)} using the details below.</p>
          </header>
          <dl className="card-heritage p-5 divide-y divide-border">
            <Row label="Bank" value={bankDetails?.bank_name ?? "—"} />
            <Row label="Account name" value={bankDetails?.bank_account_name ?? "—"} />
            <Row label="Account number" value={bankDetails?.bank_account_number ?? "—"} />
            <Row label="Amount" value={formatUGX(amount)} />
            <Row label="Reference (very important)" value={reference} highlight />
          </dl>
          <p className="text-sm text-muted-foreground">
            After paying, your gift will appear on the live board once our team confirms it (usually the same day).
          </p>
          <button onClick={() => nav({ to: "/" })} className="btn-primary w-full">Done</button>
        </div>
      )}

      {step === "success" && (
        <div className="text-center py-10 space-y-5">
          <div className="mx-auto h-20 w-20 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-4xl">✓</div>
          <h2 className="text-3xl font-serif font-bold text-primary">Thank you!</h2>
          <p className="text-lg">
            Your gift of <strong>{formatUGX(amount)}</strong> is confirmed.
          </p>
          <p className="text-sm text-muted-foreground">Reference: {reference}</p>
          <div className="flex flex-wrap justify-center gap-3 pt-2">
            <Link to="/donations" className="btn-primary">See the live board</Link>
            <Link to="/" className="btn-outline">Back to home</Link>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, value, highlight }: { label: string; value: string | null; highlight?: boolean }) {
  return (
    <div className="flex justify-between items-center py-3 gap-4">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className={`font-semibold text-right ${highlight ? "text-primary text-lg" : ""}`}>{value}</dd>
    </div>
  );
}

function MethodOption({
  id, active, onSelect, title, hint,
}: {
  id: Method; active: Method; onSelect: (m: Method) => void; title: string; hint: string;
}) {
  const isActive = active === id;
  return (
    <button
      type="button"
      onClick={() => onSelect(id)}
      className={`text-left rounded-lg border-2 p-4 flex items-center gap-3 ${
        isActive ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
      }`}
    >
      <div className={`h-5 w-5 rounded-full border-2 ${isActive ? "border-primary" : "border-muted-foreground"} flex items-center justify-center flex-shrink-0`}>
        {isActive && <div className="h-2.5 w-2.5 rounded-full bg-primary" />}
      </div>
      <div>
        <div className="font-semibold">{title}</div>
        <div className="text-xs text-muted-foreground">{hint}</div>
      </div>
    </button>
  );
}