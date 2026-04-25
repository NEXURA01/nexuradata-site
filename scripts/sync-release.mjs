import { cp, mkdir, readdir, rm, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const releaseDir = path.join(projectRoot, "release-cloudflare");
const excludedHtmlFiles = new Set(["index2.html"]);

const rootFiles = new Set([
  "_headers",
  "_redirects",
  ".nojekyll",
  "pgp.txt",
  "robots.txt",
  "site.webmanifest",
  "sitemap.xml"
]);

const shouldCopyRootEntry = (entry) => {
  if (entry === "assets") {
    return true;
  }

  if (entry === "en") {
    return true;
  }

  if (entry === "operations") {
    return true;
  }

  if (entry === "functions") {
    return true;
  }

  if (entry === ".well-known") {
    return true;
  }

  if (rootFiles.has(entry)) {
    return true;
  }

  if (path.extname(entry).toLowerCase() === ".html") {
    return !excludedHtmlFiles.has(entry);
  }

  return false;
};

await rm(releaseDir, { recursive: true, force: true });
await mkdir(releaseDir, { recursive: true });

const entries = await readdir(projectRoot, { withFileTypes: true });

for (const entry of entries) {
  if (!shouldCopyRootEntry(entry.name)) {
    continue;
  }

  const source = path.join(projectRoot, entry.name);
  const destination = path.join(releaseDir, entry.name);

  await cp(source, destination, { recursive: true });
}

// Cache-bust via filename hashing: copy each versioned asset to a hashed
// filename (e.g. site.<hash>.js) and rewrite HTML references to point to it.
// Cloudflare ignores query strings by default, so a different *path* is the
// only reliable way to force the edge to re-fetch from origin on every deploy.
import { copyFile } from "node:fs/promises";

const versionedAssets = [
  "assets/js/site.js",
  "assets/js/cookie-consent.js",
  "assets/js/appointments.js",
  "assets/js/forensics.js",
  "assets/css/site.css"
];

const hashedNames = new Map(); // basename -> hashed basename (e.g. site.js -> site.1bd231d257.js)
for (const rel of versionedAssets) {
  const filePath = path.join(releaseDir, rel);
  try {
    const buf = await readFile(filePath);
    const hash = createHash("sha256").update(buf).digest("hex").slice(0, 10);
    const ext = path.extname(rel);
    const stem = path.basename(rel, ext);
    const hashedBase = `${stem}.${hash}${ext}`;
    const hashedPath = path.join(path.dirname(filePath), hashedBase);
    await copyFile(filePath, hashedPath);
    hashedNames.set(path.basename(rel), hashedBase);
  } catch {
    // asset missing in release output; skip silently
  }
}

async function* walk(dir) {
  const dirents = await readdir(dir, { withFileTypes: true });
  for (const d of dirents) {
    const full = path.join(dir, d.name);
    if (d.isDirectory()) {
      yield* walk(full);
    } else {
      yield full;
    }
  }
}

let rewritten = 0;
for await (const file of walk(releaseDir)) {
  if (path.extname(file).toLowerCase() !== ".html") continue;
  let html = await readFile(file, "utf8");
  let changed = false;
  for (const [base, hashedBase] of hashedNames) {
    // Replace any href/src ending in the original basename (without query) with the hashed basename.
    const escaped = base.replace(/\./g, "\\.");
    const re = new RegExp(`((?:href|src)=["'][^"']*?\\/?)${escaped}(["'])`, "g");
    const next = html.replace(re, (_m, p1, p2) => `${p1}${hashedBase}${p2}`);
    if (next !== html) {
      html = next;
      changed = true;
    }
  }
  if (changed) {
    await writeFile(file, html);
    rewritten++;
  }
}

console.log(`Generated release-cloudflare/ from the tracked site source. Cache-busted ${rewritten} HTML file(s).`);
