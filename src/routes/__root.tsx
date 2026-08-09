import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
  useRouterState,
} from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { Toaster } from "sonner";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import crest from "../assets/mengo-badge.jpg";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link to="/" className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90">
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => { router.invalidate(); reset(); }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a href="/" className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent">
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Tambula Mengo — Walk & Run for Mengo Senior School" },
      { name: "description", content: "Support Mengo Senior School's 130-year legacy. Donate live via MTN MoMo, Airtel Money or bank, and get your Tambula Mengo run kit." },
      { name: "author", content: "Mengo Senior School" },
      { name: "theme-color", content: "#7A1E2B" },
      { property: "og:title", content: "Tambula Mengo — Walk & Run for Mengo Senior School" },
      { property: "og:description", content: "Support Mengo Senior School's 130-year legacy. Donate live via MTN MoMo, Airtel Money or bank, and get your Tambula Mengo run kit." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Tambula Mengo — Walk & Run for Mengo Senior School" },
      { name: "twitter:description", content: "Support Mengo Senior School's 130-year legacy. Donate live via MTN MoMo, Airtel Money or bank, and get your Tambula Mengo run kit." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/f3806cba-a506-407a-9255-84233c83a6e1/id-preview-eb73cb96--f24d6fd1-94d5-4ac9-be10-0a81e3e1c5fd.lovable.app-1784657421219.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/f3806cba-a506-407a-9255-84233c83a6e1/id-preview-eb73cb96--f24d6fd1-94d5-4ac9-be10-0a81e3e1c5fd.lovable.app-1784657421219.png" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Lora:ital,wght@0,500;0,600;0,700;1,500;1,600;1,700&display=swap" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen flex flex-col bg-background text-foreground">
        <SiteHeader />
        <main className="flex-1">
          <Outlet />
        </main>
        <SiteFooter />
      </div>
      <Toaster position="top-center" richColors closeButton />
    </QueryClientProvider>
  );
}

/* ─── Nav link helper ─── */
function NavLink({ to, children }: { to: string; children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const active = to === "/" ? pathname === "/" : pathname.startsWith(to);
  return (
    <Link to={to} className={`nav-link${active ? " nav-link--active" : ""}`}>
      {children}
    </Link>
  );
}

function SiteHeader() {
  const [open, setOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  // Close mobile menu on route change
  useEffect(() => { setOpen(false); }, [pathname]);

  return (
    <header className="site-header">
      <div className="site-header__inner container-page">
        {/* Wordmark */}
        <Link to="/" className="site-header__brand">
          <img src={crest} alt="Mengo Senior School crest" className="site-header__crest" />
          <div className="site-header__brand-text">
            <span className="site-header__brand-name">Tambula Mengo</span>
            <span className="site-header__brand-sub">Mengo Senior School</span>
          </div>
        </Link>

        {/* Desktop nav */}
        <nav className="site-header__nav" aria-label="Primary navigation">
          <NavLink to="/">Home</NavLink>
          <NavLink to="/leaderboard">Leaderboard</NavLink>
          <NavLink to="/kits">Run kits</NavLink>
          <NavLink to="/donate">Donate</NavLink>
        </nav>

        {/* Desktop CTA */}
        <Link to="/donate" className="site-header__cta" aria-label="Donate now">
          Give now
        </Link>

        {/* Mobile hamburger */}
        <button
          className="site-header__burger"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          <span className={`burger-bar burger-bar--top${open ? " burger-bar--open-top" : ""}`} />
          <span className={`burger-bar burger-bar--mid${open ? " burger-bar--open-mid" : ""}`} />
          <span className={`burger-bar burger-bar--bot${open ? " burger-bar--open-bot" : ""}`} />
        </button>
      </div>

      {/* Mobile drawer */}
      <div className={`site-header__drawer${open ? " site-header__drawer--open" : ""}`} aria-hidden={!open}>
        <nav className="site-header__drawer-nav">
          <Link to="/" className="drawer-link">Home</Link>
          <Link to="/leaderboard" className="drawer-link">🏆 Leaderboard</Link>
          <Link to="/kits" className="drawer-link">Run kits</Link>
          <Link to="/donate" className="drawer-link drawer-link--cta">Give now →</Link>
        </nav>
      </div>
    </header>
  );
}

function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="container-page site-footer__grid">
        <div className="site-footer__brand">
          <div className="site-footer__brand-row">
            <img src={crest} alt="" className="site-footer__crest" />
            <span className="site-footer__brand-name">Mengo Senior School</span>
          </div>
          <p className="site-footer__tagline">Akwana Akira Ayomba — Make friends and never foes.</p>
          <p className="site-footer__address">Namirembe Diocese, Church of Uganda · Kampala</p>
        </div>
        <div>
          <div className="site-footer__col-title">Get involved</div>
          <ul className="site-footer__links">
            <li><Link to="/leaderboard" className="site-footer__link">Donor Leaderboard</Link></li>
            <li><Link to="/donate" className="site-footer__link">Make a donation</Link></li>
            <li><Link to="/kits" className="site-footer__link">Buy a run kit</Link></li>
          </ul>
        </div>
      </div>
      <div className="site-footer__bottom">
        <div className="container-page site-footer__copy">
          © {new Date().getFullYear()} Mengo Senior School. All payments processed securely via MTN MoMo, Airtel Money, Visa &amp; Mastercard.
        </div>
      </div>
    </footer>
  );
}
