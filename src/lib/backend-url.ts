/**
 * Returns the correct backend API base URL.
 *
 * During Server-Side Rendering (SSR), the Nitro server runs inside a Docker
 * container on the same Docker network as the Django backend. Fetching the
 * public subdomain (api.tambulamengo.work.gd) from inside Docker causes a
 * "hairpin NAT" loop through Traefik which often fails or is slow.
 *
 * Instead, we use the internal Docker service hostname `backend` at port 8000
 * when running on the server, and the public HTTPS subdomain in the browser.
 *
 * INTERNAL_BACKEND_URL is a runtime env var (set in docker-compose.yml) that
 * is only visible to the Node.js process — NOT baked into the JS bundle.
 */
export function getBackendUrl(): string {
  // Server-side: use the internal Docker hostname
  if (typeof window === "undefined") {
    return (
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (typeof process !== "undefined" && (process.env as any).INTERNAL_BACKEND_URL) ||
      import.meta.env.VITE_BACKEND_URL ||
      "http://localhost:8000"
    );
  }
  // Client-side (browser): use the public HTTPS subdomain baked in at build time
  return import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";
}
