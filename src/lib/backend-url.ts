/**
 * Returns the correct backend API base URL.
 *
 * During Server-Side Rendering (SSR), the Nitro server runs inside a Docker
 * container on the same Docker network as the Django backend. Fetching the
 * public subdomain (api.tambulamengo.work.gd) from inside Docker causes a
 * "hairpin NAT" loop through Traefik which often fails or is slow.
 *
 * Instead, we use the internal Docker service hostname `http://backend:8000`
 * when running on the server during SSR, and the public HTTPS subdomain in the browser.
 */
export function getBackendUrl(): string {
  // Server-side (SSR): use internal Docker hostname if available
  if (typeof window === "undefined") {
    return (
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (typeof process !== "undefined" && (process.env as any).INTERNAL_BACKEND_URL) ||
      import.meta.env.VITE_BACKEND_URL ||
      "http://backend:8000"
    );
  }
  // Client-side (browser): use VITE_BACKEND_URL if explicitly set, else default to live server https://api.tambulamengo.work.gd
  return import.meta.env.VITE_BACKEND_URL || "https://api.tambulamengo.work.gd";
}
