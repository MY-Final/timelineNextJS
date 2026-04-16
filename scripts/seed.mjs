#!/usr/bin/env node
/**
 * Seed script: imports events.json into D1 via wrangler CLI
 * Usage: node scripts/seed.mjs
 */

import { execSync } from "child_process";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const events = JSON.parse(readFileSync(join(__dirname, "../data/events.json"), "utf-8"));

function sql(str) {
  // Escape single quotes
  return str.replace(/'/g, "''");
}

for (const event of events) {
  const tags = JSON.stringify(event.tags ?? []);
  const statement = `INSERT INTO posts (id, date, title, description, location, tags) VALUES (${event.id}, '${sql(event.date)}', '${sql(event.title)}', '${sql(event.description)}', '${sql(event.location ?? "")}', '${sql(tags)}');`;
  console.log(`Inserting post ${event.id}: ${event.title}`);
  execSync(`npx wrangler d1 execute timeline-db --remote --command="${statement.replace(/"/g, '\\"')}"`, {
    stdio: "inherit",
    cwd: join(__dirname, ".."),
  });
}

console.log("Seed complete!");
