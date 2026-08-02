import fs from "node:fs";
import path from "node:path";

// 1. Patch nitro/dist/vite.mjs for Vite 6 `this` undefined in config hook
const nitroVitePath = path.resolve("node_modules/nitro/dist/vite.mjs");
if (fs.existsSync(nitroVitePath)) {
  let content = fs.readFileSync(nitroVitePath, "utf8");
  if (content.includes("this.meta.rolldownVersion")) {
    content = content.replace("this.meta.rolldownVersion", "this?.meta?.rolldownVersion");
    fs.writeFileSync(nitroVitePath, content, "utf8");
    console.log("[patch] Patched nitro/dist/vite.mjs for Vite 6 compatibility");
  }
}

// 2. Patch unplugin/dist/index.mjs for Node 18 import.meta.dirname compatibility
const unpluginPath = path.resolve("node_modules/unplugin/dist/index.mjs");
if (fs.existsSync(unpluginPath)) {
  let content = fs.readFileSync(unpluginPath, "utf8");
  if (content.includes("resolve(import.meta.dirname,")) {
    content = content.replace(
      /resolve\(import\.meta\.dirname,/g,
      "resolve(import.meta.dirname || path.dirname(new URL(import.meta.url).pathname),"
    );
    fs.writeFileSync(unpluginPath, content, "utf8");
    console.log("[patch] Patched unplugin/dist/index.mjs for Node 18 compatibility");
  }
}
