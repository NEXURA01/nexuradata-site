// One-shot script to inject streetAddress + postalCode into JSON-LD blocks
// that currently only have addressLocality/addressRegion/addressCountry.
// Run once after the lab address is locked, then can be deleted.
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const SKIP = new Set([
  'node_modules', 'release-cloudflare', '.git', 'dist', 'build',
  '.wrangler', 'migrations', 'functions', 'operations', 'docs',
  'tests', 'scripts'
]);

function walk(dir) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP.has(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(p));
    else if (e.name.endsWith('.html')) out.push(p);
  }
  return out;
}

// Match a PostalAddress that has Longueuil/QC/CA but no streetAddress yet.
// Whitespace-tolerant. Compact form (one line) and pretty form (multi-line).
const PATTERNS = [
  // Compact (e.g. inline LocalBusiness blobs)
  /"address"\s*:\s*\{\s*"@type"\s*:\s*"PostalAddress"\s*,\s*"addressLocality"\s*:\s*"Longueuil"\s*,\s*"addressRegion"\s*:\s*"QC"\s*,\s*"addressCountry"\s*:\s*"CA"\s*\}/g,
];

const REPLACEMENT = '"address":{"@type":"PostalAddress","streetAddress":"5184 boulevard Cousineau","addressLocality":"Longueuil","addressRegion":"QC","postalCode":"J3Y 7G5","addressCountry":"CA"}';

const files = walk(ROOT);
let n = 0;
for (const f of files) {
  const orig = fs.readFileSync(f, 'utf8');
  let s = orig;
  for (const re of PATTERNS) s = s.replace(re, REPLACEMENT);
  if (s !== orig) {
    fs.writeFileSync(f, s);
    n++;
    console.log('updated', path.relative(ROOT, f));
  }
}
console.log('Total updated:', n);
