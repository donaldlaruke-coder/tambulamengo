import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { QRCodeSVG } from "qrcode.react";
import { Smartphone, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  detectUgNetwork,
  formatUGX,
  generateReference,
  normalizeUgPhone,
} from "@/lib/format";
import { getBackendUrl } from "@/lib/backend-url";
import { getBankTransferDetails, mockConfirmTransaction } from "@/lib/payments.functions";

const searchSchema = z.object({
  amount: z.number().optional(),
  kit: z.string().optional(),
  size: z.string().optional(),
  qty: z.number().optional(),
  status: z.string().optional(),
  reference: z.string().optional(),
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
type Method = "mtn_momo" | "airtel_money" | "bank" | "card";
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
  const [paymentMode, setPaymentMode] = useState<"mobile" | "card">("mobile");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [step, setStep] = useState<Step>(search.status === "success" ? "success" : "details");
  const [reference, setReference] = useState<string>(search.reference ?? "");
  const [busy, setBusy] = useState(false);
  const [txDetails, setTxDetails] = useState<any>(null);
  const [bankDetails, setBankDetails] = useState<any>(null);
  const [pendingYoPayment, setPendingYoPayment] = useState(false);

  useEffect(() => {
    if (!pendingYoPayment || !reference) return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${getBackendUrl()}/api/payments/verify/?reference=${reference}`);
        if (!res.ok) return;
        const text = await res.text();
        let data: any = null;
        try {
          data = JSON.parse(text);
        } catch {
          return; // Ignore non-JSON responses during polling
        }
        if (data && data.status === "confirmed") {
          clearInterval(interval);
          setPendingYoPayment(false);
          setTxDetails(data);
          setStep("success");
          setBusy(false);
          toast.success("Payment confirmed! Thank you!");
        } else if (data && data.status === "failed") {
          clearInterval(interval);
          setPendingYoPayment(false);
          setBusy(false);
          toast.error("Payment was declined or failed. Please try again.");
        }
      } catch (err) {
        console.error("Polling error:", err);
      }
    }, 4000);
    return () => clearInterval(interval);
  }, [pendingYoPayment, reference]);

  useEffect(() => {
    if (!pendingYoPayment) return;
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "A USSD payment prompt has been sent to your phone! Please complete PIN entry before leaving or refreshing this page.";
      return e.returnValue;
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [pendingYoPayment]);

  const network = useMemo(() => detectUgNetwork(phone), [phone]);
  const normalized = useMemo(() => normalizeUgPhone(phone), [phone]);

  // If a mobile number is entered, automatically force Mobile Money mode
  useEffect(() => {
    if (network) {
      setPaymentMode("mobile");
    }
  }, [network]);

  const method = paymentMode === "card" ? "card" : (network ?? "mtn_momo");
  const isMobileMoney = paymentMode === "mobile";

  function downloadPassImage() {
    try {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      canvas.width = 600;
      canvas.height = 800;

      // Background
      const grad = ctx.createLinearGradient(0, 0, 0, 800);
      grad.addColorStop(0, "#0F172A");
      grad.addColorStop(1, "#1E293B");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 600, 800);

      // Header Banner
      ctx.fillStyle = "#8B0000";
      ctx.fillRect(0, 0, 600, 100);

      // Header text
      ctx.fillStyle = "#FFFFFF";
      ctx.font = "bold 24px Georgia, serif";
      ctx.textAlign = "center";
      ctx.fillText("MENGO SENIOR SCHOOL", 300, 45);
      ctx.font = "14px sans-serif";
      ctx.fillStyle = "#FDE047";
      ctx.fillText("Tambula Mengo Run — Official Digital Pass", 300, 75);

      // Card Body
      ctx.fillStyle = "#FFFFFF";
      if (typeof ctx.roundRect === "function") {
        ctx.roundRect(30, 120, 540, 640, 16);
        ctx.fill();
      } else {
        ctx.fillRect(30, 120, 540, 640);
      }

      ctx.textAlign = "left";
      ctx.fillStyle = "#64748B";
      ctx.font = "bold 12px sans-serif";
      ctx.fillText("DIGITAL KIT TICKET PASS", 60, 160);

      ctx.fillStyle = "#0F172A";
      ctx.font = "bold 22px Georgia, serif";
      ctx.fillText(txDetails?.donor_name || name || "Valued Supporter", 60, 195);

      ctx.fillStyle = "#334155";
      ctx.font = "14px sans-serif";
      ctx.fillText(`Phone: ${txDetails?.donor_phone || phone || "N/A"}`, 60, 225);
      ctx.fillText(`Amount Paid: ${txDetails?.amount ? formatUGX(txDetails.amount) : formatUGX(amount)}`, 60, 250);
      ctx.fillText(`Reference: ${reference}`, 60, 275);
      ctx.fillText(`Date: ${txDetails?.confirmed_at ? new Date(txDetails.confirmed_at).toLocaleString() : new Date().toLocaleString()}`, 60, 300);

      // Render QR code from SVG
      const svgElement = document.querySelector("#qr-pass-svg") as SVGElement;
      if (svgElement) {
        const xml = new XMLSerializer().serializeToString(svgElement);
        const svg64 = btoa(xml);
        const image = new Image();
        image.onload = () => {
          ctx.drawImage(image, 175, 340, 250, 250);

          ctx.fillStyle = "#0F172A";
          ctx.font = "bold 16px monospace";
          ctx.textAlign = "center";
          ctx.fillText(reference, 300, 620);

          ctx.fillStyle = "#DC2626";
          ctx.font = "bold 13px sans-serif";
          ctx.fillText("⚠️ Present this QR Pass at Pavilion for Kit Pickup", 300, 660);
          ctx.fillStyle = "#64748B";
          ctx.font = "11px sans-serif";
          ctx.fillText("Valid for 1-time kit collection. Marked as used upon scanning.", 300, 685);

          const link = document.createElement("a");
          link.download = `TambulaMengo_KitPass_${reference}.png`;
          link.href = canvas.toDataURL("image/png");
          link.click();
          toast.success("Pass downloaded successfully!");
        };
        image.src = "data:image/svg+xml;base64," + svg64;
      } else {
        toast.error("Could not capture QR code. Please take a screenshot instead.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to generate download. Please take a screenshot.");
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (isKitFlow && !name.trim()) {
      toast.error("Please enter your name to complete your kit purchase.");
      return;
    }
    if (amount < 500) {
      toast.error("Minimum donation is UGX 500");
      return;
    }
    if (paymentMode === "mobile") {
      if (!normalized) {
        toast.error("Enter a valid Uganda mobile number (e.g. 0772 123 456)");
        return;
      }
      if (!network) {
        toast.error("This number isn't MTN or Airtel. Pay by bank instead?");
        return;
      }
    } else if (paymentMode === "card") {
      if (!email.trim() || !email.includes("@")) {
        toast.error("Please enter a valid email address.");
        return;
      }
      if (!phone.trim()) {
        toast.error("Please enter a contact phone number.");
        return;
      }
    }
    setBusy(true);
    try {
      if (import.meta.env.VITE_USE_DJANGO !== "false") {
        const response = await fetch(`${getBackendUrl()}/api/payments/initiate/`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount,
            name: name || "Anonymous",
            phone: normalized || phone,
            email: email || null,
            payment_mode: paymentMode === "mobile" ? (network === "Airtel" ? "airtel_money" : "mtn_momo") : paymentMode,
            kit_id: isKitFlow ? search.kit : null,
            size: isKitFlow ? search.size : null,
            qty: isKitFlow ? search.qty : null,
            message: message || null
          })
        });
        const resText = await response.text();
        let resData: any = {};
        try {
          resData = JSON.parse(resText);
        } catch {
          throw new Error(
            response.status === 404
              ? "Backend API endpoint not found (404). Please check server configuration."
              : `Server returned non-JSON response (${response.status}): ${resText.slice(0, 100)}`
          );
        }
        if (!response.ok) throw new Error(resData.detail || resData.error || "Initiation failed");
        
        setReference(resData.reference);
        if (resData.redirect_url) {
          window.location.href = resData.redirect_url;
        } else if (resData.gateway === "yo") {
          setPendingYoPayment(true);
          toast.success(resData.message || "A USSD prompt has been sent to your phone.");
        } else if (resData.bank_name) {
          setBankDetails(resData);
          setStep("bank_pending");
        } else {
          throw new Error(resData.detail || "Unable to initiate payment.");
        }
        return;
      }
      const actualAnonymous = isKitFlow ? false : anonymous;
      let donorId: string | null = null;
      if (!actualAnonymous && (name || normalized)) {
        const { data: donor, error: dErr } = await supabase
          .from("donors")
          .insert({ name: name || null, phone: normalized || null })
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
        payment_method: (method === "card" ? "bank" : method) as "mtn_momo" | "airtel_money" | "bank",
        status: "pending",
        internal_reference: ref,
        message: message || null,
        is_anonymous: actualAnonymous,
        donor_display_name: actualAnonymous ? null : name || null,
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

      if (!isMobileMoney) {
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
    } catch (err: any) {
      console.error("Payment initiation error:", err);
      toast.error(err?.message || "Could not start payment. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="container-page max-w-2xl py-8 md:py-12 pb-24">
      {step === "details" && (
        <form onSubmit={submit} className="space-y-5">
          <header>
            <h1 className="text-3xl md:text-4xl font-serif font-bold text-primary mt-1">
              {isKitFlow ? "Pay for your run kit" : "Give in seconds"}
            </h1>
            <p className="text-muted-foreground mt-1">
              Enter your phone, pick an amount, tap Pay. We'll send an MTN or Airtel prompt to your phone.
            </p>
          </header>

          {isKitFlow ? (
            <div className="space-y-3">
              <div className="card-heritage p-5">
                <div className="text-sm text-muted-foreground">Amount to pay</div>
                <div className="text-3xl font-serif font-bold text-primary">{formatUGX(amount)}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {search.qty ?? 1} × Tambula Mengo Run Kit{search.size ? ` (${search.size})` : ""}
                </div>
              </div>
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 space-y-2 text-xs text-amber-950 dark:text-amber-100">
                <div className="font-bold text-amber-900 dark:text-amber-200 text-sm flex items-center gap-1.5">
                  🔒 Representative Pickup & Size Notice
                </div>
                <div>• <strong>Pickup Location:</strong> Mengo Senior School <strong>Main Gate</strong>.</div>
                <div>• <strong>Representative / Student Pickup:</strong> Anyone presenting your reference code can collect your kit on your behalf — <strong>do NOT share your code with unauthorized persons.</strong></div>
                <div>• <strong>Flexible Sizes:</strong> T-shirt sizes are fully adjustable and can be exchanged directly at the pickup station upon collection.</div>
              </div>
            </div>
          ) : (
            <div className="card-heritage p-5">
              <label className="block text-sm font-semibold mb-3">Amount (UGX)</label>
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

          <div className="card-heritage p-5">
            <label className="block text-sm font-semibold mb-3">Mobile Money Payment (MTN & Airtel)</label>
            <div className="space-y-2">
              <label htmlFor="phone" className="block text-sm font-semibold mb-2">
                Your mobile money number
              </label>
              <div className="relative">
                <input
                  id="phone"
                  type="tel"
                  autoComplete="tel"
                  inputMode="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="0772 123 456"
                  className="w-full rounded-lg border-2 border-input bg-background px-4 py-4 text-xl font-semibold tracking-wide focus:border-primary outline-none"
                  required
                />
                {network && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold uppercase tracking-widest bg-primary text-primary-foreground rounded-full px-3 py-1">
                    {network === "mtn_momo" ? "MTN MoMo" : "Airtel Money"}
                  </span>
                )}
              </div>
              <div className="mt-2 min-h-5 text-xs text-muted-foreground">
                {phone && !normalized ? (
                  <span className="text-destructive">Doesn't look like a Uganda number yet.</span>
                ) : network ? (
                  <span className="text-primary font-semibold">
                    {network === "mtn_momo" ? "MTN MoMo" : "Airtel Money"} detected. A USSD PIN prompt will be sent directly to your phone.
                  </span>
                ) : (
                  <span>MTN or Airtel — enter your number to auto-detect.</span>
                )}
              </div>
            </div>
          </div>

          <div className="card-heritage p-5 space-y-4">
            <div>
              <label className="block text-sm font-semibold mb-1">
                Your name{" "}
                {isKitFlow ? (
                  <span className="text-destructive font-semibold">(required)</span>
                ) : (
                  <span className="text-muted-foreground font-normal">(optional)</span>
                )}
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={!isKitFlow && anonymous}
                placeholder="e.g. Jane N."
                className="w-full rounded-lg border border-input bg-background px-4 py-3 disabled:opacity-50"
                required={isKitFlow}
              />
            </div>
            {!isKitFlow && (
              <>
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
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={anonymous} onChange={(e) => setAnonymous(e.target.checked)} className="h-5 w-5 accent-[oklch(0.38_0.13_20)]" />
                  <span className="text-sm">Give anonymously</span>
                </label>
              </>
            )}
          </div>

          <button type="submit" disabled={busy} className="btn-primary w-full text-lg py-4">
            {busy ? "Please wait…" : `Pay ${formatUGX(amount)}`}
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
              Enter your {network === "airtel_money" ? "Airtel Money" : "MTN MoMo"} PIN to confirm{" "}
              <strong className="text-foreground">{formatUGX(amount)}</strong> to Mengo Senior School.
            </p>
            <p className="text-xs text-muted-foreground mt-3">Reference: {reference}</p>
          </div>
        </div>
      )}

      {step === "success" && (
        <div className="text-center py-8 space-y-6 max-w-xl mx-auto">
          <div className="mx-auto h-20 w-20 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-4xl shadow-md">✓</div>

          {isKitFlow ? (
            /* 🎽 KIT PURCHASE SUCCESS VIEW (WITH QR CODE PASS) */
            <>
              <h2 className="text-3xl font-serif font-bold text-primary">
                Kit Payment Confirmed!
              </h2>
              <p className="text-lg">
                Your kit order of{" "}
                <strong>{txDetails?.amount ? formatUGX(txDetails.amount) : formatUGX(amount)}</strong> has been received.
              </p>

              <div className="card-heritage p-6 space-y-4 text-left">
                <div className="text-xs uppercase tracking-widest text-muted-foreground text-center mb-1">
                  Official Digital Receipt & QR Pass
                </div>

                <div className="flex justify-center bg-white p-4 rounded-xl border border-border shadow-inner">
                  <QRCodeSVG id="qr-pass-svg" value={`https://tambulamengo.work.gd/admin?ref=${reference}`} size={220} level="M" />
                </div>

                <dl className="divide-y divide-border text-sm pt-2">
                  <Row label="Payer Name" value={txDetails?.donor_name || name || "Anonymous"} />
                  <Row label="Phone Number" value={txDetails?.donor_phone || phone || "N/A"} />
                  <Row label="Category" value="🎽 Kit Purchase" />
                  <Row label="Amount Paid" value={txDetails?.amount ? formatUGX(txDetails.amount) : formatUGX(amount)} highlight />
                  <Row label="Reference (Ref)" value={reference} />
                  <Row label="Transaction Code" value={txDetails?.provider_reference || txDetails?.confirmation_code || "Yo! Payments Confirmed"} />
                  <Row 
                    label="Date & Time" 
                    value={txDetails?.confirmed_at ? new Date(txDetails.confirmed_at).toLocaleString() : new Date().toLocaleString()} 
                  />
                </dl>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={downloadPassImage}
                    className="btn-primary w-full flex items-center justify-center gap-2 py-3 shadow-md text-base"
                  >
                    📥 Download Official Pass & QR Code (PNG)
                  </button>
                </div>

                <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-2 text-xs text-foreground mt-3">
                  <div className="font-bold text-primary text-sm flex items-center gap-1.5">
                    📍 Kit Collection & Security Guidelines
                  </div>
                  <div>• <strong>Pickup Location:</strong> Mengo Senior School <strong>Main Gate</strong></div>
                  <div>• <strong>Representative / Student Pickup:</strong> Anyone presenting this reference code (<strong className="font-mono text-primary">{reference}</strong>) can collect your kit — <strong>do NOT share your code with unauthorized persons.</strong></div>
                  <div>• <strong>Flexible Size Adjustments:</strong> T-shirt sizes are fully adjustable and can be exchanged directly at the pickup station.</div>
                  <div className="pt-2 border-t border-primary/10 flex flex-wrap gap-2 items-center">
                    <span className="font-semibold text-primary">Helplines:</span>
                    <a href="tel:+256783279346" className="text-primary underline font-bold">+256 783 279 346</a>
                    <span>·</span>
                    <a href="tel:+256784455449" className="text-primary underline font-bold">+256 784 455 449</a>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground text-center pt-1">
                  Download or screenshot this pass to present at Mengo Senior School pavilion for kit pickup.
                </p>
              </div>
            </>
          ) : (
            /* 🎁 REGULAR DONATION SUCCESS VIEW (WARM THANK YOU — NO QR CODE) */
            <>
              <h2 className="text-3xl font-serif font-bold text-primary">
                Thank You for Your Generous Support! 💖
              </h2>
              
              <div className="card-heritage p-6 space-y-4 text-left border-primary/30 bg-cream/40">
                <div className="text-center pb-2 border-b border-border">
                  <span className="text-xs uppercase tracking-widest font-semibold text-primary">
                    Mengo Senior School — Heritage & Legacy
                  </span>
                  <div className="text-sm font-serif italic text-muted-foreground mt-0.5">
                    "Akwana Akira Ayomba — Make friends and never foes."
                  </div>
                </div>

                <p className="text-base leading-relaxed text-foreground">
                  Dear <strong>{txDetails?.donor_name || name || "Valued Supporter"}</strong>,
                </p>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  On behalf of <strong>Mengo Senior School</strong>, our Board of Governors, teachers, and students, we express our deepest and most heartfelt gratitude for your generous gift of{" "}
                  <strong className="text-primary font-semibold">{txDetails?.amount ? formatUGX(txDetails.amount) : formatUGX(amount)}</strong>.
                </p>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Your kindness directly powers our mission to preserve our 130-year legacy of academic excellence, empower young minds, and build a brighter future for the entire Mengo community. May you be abundantly blessed!
                </p>

                <div className="pt-3">
                  <div className="text-xs uppercase tracking-widest text-muted-foreground mb-2">
                    Official Payment Receipt
                  </div>
                  <dl className="divide-y divide-border text-sm bg-background p-4 rounded-xl border border-border">
                    <Row label="Donor Name" value={txDetails?.donor_name || name || "Anonymous"} />
                    <Row label="Category" value="🎁 Donation" />
                    <Row label="Amount Gifted" value={txDetails?.amount ? formatUGX(txDetails.amount) : formatUGX(amount)} highlight />
                    <Row label="Reference (Ref)" value={reference} />
                    <Row label="Transaction Code" value={txDetails?.provider_reference || txDetails?.confirmation_code || "Pesapal Confirmed"} />
                    <Row 
                      label="Date & Time" 
                      value={txDetails?.confirmed_at ? new Date(txDetails.confirmed_at).toLocaleString() : new Date().toLocaleString()} 
                    />
                    </dl>
                </div>
              </div>
            </>
          )}

          <div className="flex flex-wrap justify-center gap-3 pt-2">
            <Link to="/donations" className="btn-primary">See live donations board</Link>
            <Link to="/" className="btn-outline">Back to Home</Link>
          </div>
        </div>
      )}

      {pendingYoPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
          <div className="w-full max-w-md rounded-2xl bg-card p-6 shadow-2xl border border-primary/30 text-center animate-in fade-in zoom-in duration-300">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary animate-bounce">
              <Smartphone className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-xl font-bold text-foreground">USSD Prompt Sent!</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              A payment request of{" "}
              <strong className="text-primary font-bold">{formatUGX(amount)}</strong> has been sent to{" "}
              <span className="font-mono text-foreground font-semibold">{phone}</span>.
            </p>
            <div className="mt-4 rounded-xl bg-amber-500/10 border border-amber-500/20 p-4 text-left text-xs text-amber-700 dark:text-amber-300 space-y-2">
              <p className="font-bold flex items-center gap-1.5 text-amber-800 dark:text-amber-200">
                📲 Check your mobile phone screen:
              </p>
              <ol className="list-decimal list-inside space-y-1 text-muted-foreground leading-relaxed">
                <li>Enter your <strong>MTN MoMo or Airtel Money PIN</strong> on the prompt screen.</li>
                <li>Approve the payment to <strong>Yo! Uganda Ltd</strong>.</li>
                <li>This screen will automatically update once approved.</li>
              </ol>
              <p className="text-[11px] text-amber-800/90 dark:text-amber-200/90 pt-1.5 border-t border-amber-500/20 font-medium">
                <em>Note: Additional taxes or network charges may apply.</em>
              </p>
            </div>
            <div className="mt-6 flex items-center justify-center gap-2 text-xs font-medium text-muted-foreground bg-muted/50 py-2.5 px-4 rounded-full border border-border">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              Waiting for Mobile Money PIN confirmation...
            </div>
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
