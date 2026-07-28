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
    <div className="container-page py-4 sm:py-10 md:py-16 space-y-4 sm:space-y-8 max-w-4xl min-h-[calc(100vh-100px)] flex flex-col justify-center">
      {/* Compact Hero Header */}
      <div className="text-center space-y-2 sm:space-y-3">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium text-[11px] sm:text-xs border border-primary/20">
          <Sparkles className="h-3 w-3 text-gold" />
          <span>Mengo Senior School — 130 Years</span>
        </div>
        
        <div className="flex justify-center">
          <img
            src="/mengo-badge.jpg"
            alt="Mengo Senior School Logo"
            className="h-12 w-12 sm:h-16 sm:w-16 object-contain rounded-xl shadow-md border border-gold/30"
          />
        </div>

        <h1 className="text-xl sm:text-3xl md:text-4xl font-serif font-bold text-foreground tracking-tight">
          How would you like to support <span className="text-primary">Tambula Mengo</span>?
        </h1>
        <p className="text-muted-foreground text-xs sm:text-base max-w-xl mx-auto leading-normal">
          Select an option below to make a direct donation or purchase an official marathon run kit.
        </p>
      </div>

      {/* Choice Cards Grid (Fit for Mobile Screen) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-6 pt-1 sm:pt-4">
        {/* Option 1: Make a Donation */}
        <div className="card-heritage p-4 sm:p-6 flex flex-col justify-between hover:shadow-xl transition-all duration-300 group border-2 hover:border-primary/50 relative overflow-hidden bg-gradient-to-b from-card to-background">
          <div>
            <div className="flex items-center justify-between mb-2.5 sm:mb-4">
              <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20 group-hover:scale-105 group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300">
                <Heart className="h-5 w-5 sm:h-6 sm:w-6" />
              </div>
              <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                Option 1
              </span>
            </div>

            <h2 className="text-lg sm:text-2xl font-serif font-bold text-foreground mb-1 sm:mb-2 group-hover:text-primary transition-colors">
              Make a Donation
            </h2>

            <p className="text-muted-foreground text-xs sm:text-sm leading-relaxed mb-3 sm:mb-5">
              Support the 130th Anniversary legacy projects and student development initiatives at Mengo.
            </p>

            <ul className="space-y-1.5 mb-4 sm:mb-6 text-[11px] sm:text-xs text-muted-foreground hidden sm:block">
              <li className="flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>MTN MoMo, Airtel Money & Cards</span>
              </li>
              <li className="flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>Any custom amount from UGX 500</span>
              </li>
            </ul>
          </div>

          <Link
            to="/donate"
            className="btn-primary w-full py-2.5 sm:py-3.5 text-sm sm:text-base font-semibold flex items-center justify-center gap-2 shadow-sm"
          >
            <span>Make a Donation</span>
            <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        {/* Option 2: Buy a Run Kit */}
        <div className="card-heritage p-4 sm:p-6 flex flex-col justify-between hover:shadow-xl transition-all duration-300 group border-2 hover:border-gold/50 relative overflow-hidden bg-gradient-to-b from-card to-background">
          <div>
            <div className="flex items-center justify-between mb-2.5 sm:mb-4">
              <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-500/20 group-hover:scale-105 group-hover:bg-amber-500 group-hover:text-white transition-all duration-300">
                <ShoppingBag className="h-5 w-5 sm:h-6 sm:w-6" />
              </div>
              <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                Option 2
              </span>
            </div>

            <h2 className="text-lg sm:text-2xl font-serif font-bold text-foreground mb-1 sm:mb-2 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
              Buy a Run Kit
            </h2>

            <p className="text-muted-foreground text-xs sm:text-sm leading-relaxed mb-3 sm:mb-5">
              Order your official Marathon Kit (T-Shirt, Water Bottle & Runner Bib) with pickup at Mengo.
            </p>

            <ul className="space-y-1.5 mb-4 sm:mb-6 text-[11px] sm:text-xs text-muted-foreground hidden sm:block">
              <li className="flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>All sizes available (S, M, L, XL, XXL)</span>
              </li>
              <li className="flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>Includes digital QR pickup voucher</span>
              </li>
            </ul>
          </div>

          <Link
            to="/kits"
            className="btn-outline w-full py-2.5 sm:py-3.5 text-sm sm:text-base font-semibold flex items-center justify-center gap-2 hover:bg-amber-500 hover:text-white hover:border-amber-500 transition-all shadow-sm"
          >
            <span>Buy a Run Kit</span>
            <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </div>

      {/* Footer Note */}
      <div className="text-center text-[11px] text-muted-foreground pt-1 border-t border-border/40 max-w-md mx-auto">
        <p className="flex items-center justify-center gap-1">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>Payments secured via MTN MoMo, Airtel Money & Cards.</span>
        </p>
      </div>
    </div>
  );
}
