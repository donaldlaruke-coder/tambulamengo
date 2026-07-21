import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { Toaster } from "sonner";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import crest from "../assets/mengo-badge.jpg.asset.json";

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
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
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
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
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
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/1aed7c99-3b3d-46f9-8551-407f4f2055de/id-preview-8d4347c5--f24d6fd1-94d5-4ac9-be10-0a81e3e1c5fd.lovable.app-1784656922259.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/1aed7c99-3b3d-46f9-8551-407f4f2055de/id-preview-8d4347c5--f24d6fd1-94d5-4ac9-be10-0a81e3e1c5fd.lovable.app-1784656922259.png" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "icon", href: "/favicon.png", type: "image/png" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Lora:wght@500;600;700&display=swap",
      },
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

function SiteHeader() {
  return (
    <header className="border-b border-border bg-background/90 backdrop-blur sticky top-0 z-40">
      <div className="container-page flex items-center justify-between py-3">
        <Link to="/" className="flex items-center gap-3">
          <img src={crest.url} alt="Mengo Senior School crest" width={40} height={40} className="h-10 w-10 rounded-full object-cover" />
          <div className="leading-tight">
            <div className="font-serif text-lg font-bold text-primary">Tambula Mengo</div>
            <div className="text-[11px] uppercase tracking-widest text-muted-foreground">Mengo Senior School</div>
          </div>
        </Link>
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
          <Link to="/" className="hover:text-primary" activeProps={{ className: "text-primary" }}>Home</Link>
          <Link to="/donations" className="hover:text-primary" activeProps={{ className: "text-primary" }}>Live donations</Link>
          <Link to="/kits" className="hover:text-primary" activeProps={{ className: "text-primary" }}>Get a kit</Link>
          <Link to="/donate" className="btn-primary !min-h-0 !py-2 !px-4 text-sm">Donate</Link>
        </nav>
        <Link to="/donate" className="md:hidden btn-primary !min-h-0 !py-2 !px-4 text-sm">Donate</Link>
      </div>
    </header>
  );
}

function SiteFooter() {
  return (
    <footer className="border-t border-border bg-cream mt-16">
      <div className="container-page py-10 grid gap-6 md:grid-cols-3 text-sm">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <img src={crest.url} alt="" width={28} height={28} className="h-7 w-7 rounded-full object-cover" />
            <span className="font-serif font-bold text-primary">Mengo Senior School</span>
          </div>
          <p className="text-muted-foreground italic">Akwana Akira Ayomba — Make friends and never foes.</p>
          <p className="text-muted-foreground mt-2">Namirembe Diocese, Church of Uganda · Kampala</p>
        </div>
        <div>
          <div className="font-semibold mb-2">Support</div>
          <ul className="space-y-1 text-muted-foreground">
            <li><Link to="/donate" className="hover:text-primary">Make a donation</Link></li>
            <li><Link to="/kits" className="hover:text-primary">Buy a run kit</Link></li>
            <li><Link to="/donations" className="hover:text-primary">See live donations</Link></li>
          </ul>
        </div>
        <div>
          <div className="font-semibold mb-2">Staff</div>
          <ul className="space-y-1 text-muted-foreground">
            <li><Link to="/auth" className="hover:text-primary">Admin sign in</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border">
        <div className="container-page py-4 text-xs text-muted-foreground text-center">
          © {new Date().getFullYear()} Mengo Senior School. All donations processed via MTN MoMo, Airtel Money and Stanbic Bank.
        </div>
      </div>
    </footer>
  );
}
