import { createFileRoute, Link } from "@tanstack/react-router";
import { Heart, ShoppingBag, ArrowRight, ShieldCheck, Sparkles } from "lucide-react";

export const Route = createFileRoute("/choose")({
  head: () => ({
    meta: [
      { title: "Choose Support Option — Tambula Mengo" },
      { name: "description", content: "Choose to either make a donation or buy an official run kit to support Mengo Senior School." },
      { property: "og:title", content: "Support Mengo Senior School — Tambula Mengo" },
      { property: "og:description", content: "Choose to make a donation or purchase your official 130 Years Marathon Run Kit." },
    ],
  }),
  component: ChoosePage,
});

function ChoosePage() {
  return (
    <div className="container-page py-12 md:py-20 space-y-10 max-w-4xl">
      {/* Hero Header */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary font-medium text-xs border border-primary/20">
          <Sparkles className="h-3.5 w-3.5 text-gold" />
          <span>Mengo Senior School — 130 Years</span>
        </div>
        
        <div className="flex justify-center">
          <img
            src="/mengo-badge.jpg"
            alt="Mengo Senior School Logo"
            className="h-20 w-20 object-contain rounded-2xl shadow-lg border-2 border-gold/30"
          />
        </div>

        <h1 className="text-3xl md:text-5xl font-serif font-bold text-foreground tracking-tight">
          How would you like to support <span className="text-primary">Tambula Mengo</span>?
        </h1>
        <p className="text-muted-foreground text-base md:text-lg max-w-2xl mx-auto leading-relaxed">
          Join thousands of alumni, parents, students, and friends celebrating 130 years of excellence. Choose your option below to get started.
        </p>
      </div>

      {/* Choice Cards Grid */}
      <div className="grid md:grid-cols-2 gap-6 md:gap-8 pt-4">
        {/* Option 1: Make a Donation */}
        <div className="card-heritage p-6 md:p-8 flex flex-col justify-between hover:shadow-2xl transition-all duration-300 group border-2 hover:border-primary/50 relative overflow-hidden bg-gradient-to-b from-card to-background">
          <div className="absolute -top-12 -right-12 w-32 h-32 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-all" />
          <div>
            <div className="flex items-center justify-between mb-6">
              <div className="h-14 w-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20 group-hover:scale-110 group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300">
                <Heart className="h-7 w-7" />
              </div>
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground bg-muted px-2.5 py-1 rounded-full">
                Option 1
              </span>
            </div>

            <h2 className="text-2xl font-serif font-bold text-foreground mb-3 group-hover:text-primary transition-colors">
              Make a Donation
            </h2>

            <p className="text-muted-foreground text-sm leading-relaxed mb-6">
              Give directly to support the 130th Anniversary legacy projects and development initiatives at Mengo Senior School.
            </p>

            <ul className="space-y-2 mb-8 text-xs text-muted-foreground">
              <li className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>MTN Mobile Money & Airtel Money supported</span>
              </li>
              <li className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>Give any custom amount from UGX 500</span>
              </li>
              <li className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>Instant official digital receipt generated</span>
              </li>
            </ul>
          </div>

          <Link
            to="/donate"
            className="btn-primary w-full py-4 text-base font-semibold flex items-center justify-center gap-2 group-hover:translate-x-0.5 transition-all shadow-md hover:shadow-lg"
          >
            <span>Make a Donation</span>
            <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        {/* Option 2: Buy a Run Kit */}
        <div className="card-heritage p-6 md:p-8 flex flex-col justify-between hover:shadow-2xl transition-all duration-300 group border-2 hover:border-gold/50 relative overflow-hidden bg-gradient-to-b from-card to-background">
          <div className="absolute -top-12 -right-12 w-32 h-32 bg-gold/5 rounded-full blur-2xl group-hover:bg-gold/10 transition-all" />
          <div>
            <div className="flex items-center justify-between mb-6">
              <div className="h-14 w-14 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-500/20 group-hover:scale-110 group-hover:bg-amber-500 group-hover:text-white transition-all duration-300">
                <ShoppingBag className="h-7 w-7" />
              </div>
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground bg-muted px-2.5 py-1 rounded-full">
                Option 2
              </span>
            </div>

            <h2 className="text-2xl font-serif font-bold text-foreground mb-3 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
              Buy a Run Kit
            </h2>

            <p className="text-muted-foreground text-sm leading-relaxed mb-6">
              Order your official Tambula Mengo Marathon Run Kit. Each kit includes a customized T-Shirt, Water Bottle & Runner Bib.
            </p>

            <ul className="space-y-2 mb-8 text-xs text-muted-foreground">
              <li className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>Multiple size options available (S, M, L, XL, XXL)</span>
              </li>
              <li className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>Includes unique QR code collection voucher</span>
              </li>
              <li className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>Pick up at Mengo Senior School campus</span>
              </li>
            </ul>
          </div>

          <Link
            to="/kits"
            className="btn-outline w-full py-4 text-base font-semibold flex items-center justify-center gap-2 hover:bg-amber-500 hover:text-white hover:border-amber-500 transition-all shadow-sm hover:shadow-md"
          >
            <span>Buy a Run Kit</span>
            <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </div>

      {/* Footer Assurance */}
      <div className="text-center text-xs text-muted-foreground pt-4 border-t border-border/50 max-w-lg mx-auto">
        <p className="flex items-center justify-center gap-1.5 font-medium">
          <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          <span>All payments are securely processed via MTN MoMo, Airtel Money, Visa & Mastercard.</span>
        </p>
      </div>
    </div>
  );
}
