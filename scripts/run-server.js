import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const PORT = Number(process.env.PORT) || 3000;
const root = process.cwd();

// Find server entry file (dist/server/server.js or .output/server/index.mjs)
function findServerEntry() {
  const primaryCandidates = [
    path.resolve(root, "dist/server/server.js"),
    path.resolve(root, "dist/server/index.js"),
    path.resolve(root, "dist/server/index.mjs"),
    path.resolve(root, ".output/server/index.mjs"),
    path.resolve(root, ".output/server/index.js"),
  ];

  for (const candidate of primaryCandidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

const serverEntryPath = findServerEntry();

if (!serverEntryPath) {
  console.error("[run-server] Error: Could not find valid SSR server entry point in dist/server/ or .output/server/.");
  console.error("[run-server] Please run 'npm run build' before starting the server.");
  process.exit(1);
}

console.log(`[run-server] Launching SSR server entry point: ${serverEntryPath}`);

const clientDir = path.resolve(root, "dist/client");
const publicDir = path.resolve(root, "public");

const serverModule = await import(pathToFileURL(serverEntryPath).href);
const ssrHandler = serverModule.default || serverModule;

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
};

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
    const safePath = path.normalize(url.pathname).replace(/^(\.\.[\/\\])+/, "");

    // 1. Check dist/client static assets first
    let staticFilePath = path.join(clientDir, safePath);
    if (!fs.existsSync(staticFilePath) || !fs.statSync(staticFilePath).isFile()) {
      // 2. Check public directory static assets
      staticFilePath = path.join(publicDir, safePath);
    }

    if (
      (staticFilePath.startsWith(clientDir) || staticFilePath.startsWith(publicDir)) &&
      fs.existsSync(staticFilePath) &&
      fs.statSync(staticFilePath).isFile()
    ) {
      const ext = path.extname(staticFilePath).toLowerCase();
      const contentType = MIME_TYPES[ext] || "application/octet-stream";
      res.writeHead(200, {
        "Content-Type": contentType,
        "Cache-Control": ext === ".html" ? "no-cache" : "public, max-age=31536000, immutable",
      });
      fs.createReadStream(staticFilePath).pipe(res);
      return;
    }

    // 3. SSR Request handling
    const fullUrl = `http://${req.headers.host || "localhost:" + PORT}${req.url}`;
    const headers = new Headers();
    for (const [key, val] of Object.entries(req.headers)) {
      if (Array.isArray(val)) {
        for (const v of val) headers.append(key, v);
      } else if (val !== undefined) {
        headers.set(key, val);
      }
    }

    const init = {
      method: req.method,
      headers,
    };

    if (req.method !== "GET" && req.method !== "HEAD") {
      init.body = req;
      init.duplex = "half";
    }

    const webReq = new Request(fullUrl, init);
    const webRes = await ssrHandler.fetch(webReq);

    res.statusCode = webRes.status;
    webRes.headers.forEach((value, key) => {
      res.setHeader(key, value);
    });

    if (webRes.body) {
      const reader = webRes.body.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(value);
      }
    }
    res.end();
  } catch (err) {
    console.error("[run-server] Error handling request:", err);
    if (!res.headersSent) {
      res.writeHead(500, { "Content-Type": "text/plain" });
    }
    res.end("Internal Server Error");
  }
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`[run-server] Server running on http://0.0.0.0:${PORT}`);
});
