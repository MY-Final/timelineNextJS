/**
 * Prepares .open-next for Cloudflare Pages deployment:
 * 1. Copies worker.js → _worker.js (Pages advanced mode requires this name)
 * 2. Copies assets/* to root so static files are served correctly
 */

import { cpSync, copyFileSync, existsSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const openNext = join(root, ".open-next");
const assets = join(openNext, "assets");

// 1. Copy worker.js → _worker.js
const workerSrc = join(openNext, "worker.js");
const workerDest = join(openNext, "_worker.js");
if (existsSync(workerSrc)) {
  copyFileSync(workerSrc, workerDest);
  console.log("✓ worker.js → _worker.js");
} else {
  console.error("✗ worker.js not found, run build first");
  process.exit(1);
}

// 2. Copy assets/* → .open-next/* (so Pages serves them as static files)
if (existsSync(assets)) {
  cpSync(assets, openNext, { recursive: true, force: true });
  console.log("✓ assets/* copied to .open-next/");
} else {
  console.warn("⚠ assets/ directory not found, skipping");
}

console.log("\nReady to deploy:");
console.log("  npx wrangler pages deploy .open-next --project-name=timeline --commit-dirty=true");
