import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

function findFiles(dir, matchPattern) {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  try {
    const list = fs.readdirSync(dir);
    for (const file of list) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      if (stat && stat.isDirectory()) {
        results = results.concat(findFiles(filePath, matchPattern));
      } else if (matchPattern.test(file)) {
        results.push(filePath);
      }
    }
  } catch (err) {
    console.error(`[run-server] Error reading dir ${dir}:`, err);
  }
  return results;
}

const root = process.cwd();
console.log(`[run-server] Current Working Directory: ${root}`);

// Search in .output and dist
const candidates = [
  ...findFiles(path.resolve(root, ".output"), /\.(mjs|js)$/),
  ...findFiles(path.resolve(root, "dist"), /\.(mjs|js)$/),
];

console.log(`[run-server] Found ${candidates.length} candidate JS files in .output/dist:`, candidates);

// Prefer primary server entry files
const serverEntry =
  candidates.find(
    (p) =>
      p.endsWith("/server/index.mjs") ||
      p.endsWith("/server/server.js") ||
      p.endsWith("/server/index.js") ||
      p.endsWith("/server.js") ||
      p.includes("/server/")
  ) || candidates[0];

if (!serverEntry) {
  console.error("[run-server] Error: No server JS build files found in .output or dist");
  // Print top level files in root for debugging
  try {
    console.error("[run-server] Files in root directory:", fs.readdirSync(root));
  } catch {}
  process.exit(1);
}

console.log(`[run-server] Launching SSR server entry: ${serverEntry}`);
import(pathToFileURL(serverEntry).href);
