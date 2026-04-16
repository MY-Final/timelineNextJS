import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";

const rootDir = process.cwd();
const imagesDir = path.join(rootDir, "public", "images");
const dataDir = path.join(rootDir, "data");
const outputFile = path.join(dataDir, "image-manifest.json");

function toPosix(value) {
  return value.replace(/\\/g, "/");
}

function createManifest() {
  if (!existsSync(imagesDir)) {
    return {};
  }

  const manifest = {};

  for (const entry of readdirSync(imagesDir).sort()) {
    const fullDir = path.join(imagesDir, entry);
    if (!statSync(fullDir).isDirectory()) {
      continue;
    }

    const files = readdirSync(fullDir)
      .filter((file) => statSync(path.join(fullDir, file)).isFile())
      .sort((a, b) => a.localeCompare(b));

    manifest[entry] = files.map((file) => toPosix(`/images/${entry}/${file}`));
  }

  return manifest;
}

const content = `${JSON.stringify(createManifest(), null, 2)}\n`;

if (!existsSync(dataDir)) {
  mkdirSync(dataDir, { recursive: true });
}

const currentContent = existsSync(outputFile) ? readFileSync(outputFile, "utf8") : "";

if (currentContent !== content) {
  writeFileSync(outputFile, content, "utf8");
}
