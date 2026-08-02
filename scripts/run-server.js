import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const candidates = [
  path.resolve(".output/server/index.mjs"),
  path.resolve(".output/server/index.js"),
  path.resolve("dist/server/server.js"),
  path.resolve("dist/server/index.mjs"),
  path.resolve("dist/server/index.js"),
];

const entry = candidates.find((p) => fs.existsSync(p));

if (!entry) {
  console.error("[run-server] Error: Could not locate server entry file in .output/server/ or dist/server/");
  process.exit(1);
}

console.log(`[run-server] Launching SSR server entry: ${entry}`);
import(pathToFileURL(entry).href);
