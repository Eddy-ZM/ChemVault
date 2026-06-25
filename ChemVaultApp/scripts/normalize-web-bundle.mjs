#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = process.argv[2];
if (!root) {
  console.error("Usage: normalize-web-bundle.mjs <bundle-root>");
  process.exit(1);
}

const absoluteRoot = path.resolve(root);
if (!fs.existsSync(absoluteRoot)) {
  console.error(`Bundle root does not exist: ${absoluteRoot}`);
  process.exit(1);
}

const textExtensions = new Set([
  ".html",
  ".css",
  ".js",
  ".mjs",
  ".json",
  ".webmanifest",
  ".svg"
]);

const localPrefixes = [
  "assets/",
  "scripts/",
  "data/",
  "pages/",
  "favicon.ico",
  "site.webmanifest",
  "apple-touch-icon",
  "manifest.webmanifest"
];

let changed = 0;
for (const file of walk(absoluteRoot)) {
  if (!textExtensions.has(path.extname(file))) continue;
  const original = fs.readFileSync(file, "utf8");
  const relativeDir = path.relative(absoluteRoot, path.dirname(file));
  const depth = relativeDir ? relativeDir.split(path.sep).length : 0;
  const prefix = depth === 0 ? "" : "../".repeat(depth);
  let next = original;

  for (const localPrefix of localPrefixes) {
    const escaped = escapeRegExp(localPrefix);
    next = next.replace(new RegExp(`(["'(=:\\s])/${escaped}`, "g"), `$1${prefix}${localPrefix}`);
  }

  if (next !== original) {
    fs.writeFileSync(file, next);
    changed += 1;
  }
}

console.log(JSON.stringify({ bundle: absoluteRoot, changedFiles: changed }, null, 2));

function* walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      if (["node_modules", ".git", ".wrangler"].includes(entry.name)) continue;
      yield* walk(fullPath);
    } else if (entry.isFile()) {
      yield fullPath;
    }
  }
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
