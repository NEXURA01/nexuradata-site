#!/usr/bin/env node
// Injects a LocalBusiness JSON-LD reference block into every HTML page that is
// missing one. The block uses @id="https://nexuradata.ca/#business" so search
// engines consolidate signals with the rich entity declared on the home page.

import fs from 'node:fs';
import path from 'node:path';

const SKIP_DIRS = new Set([
  'node_modules', 'release-cloudflare', '.git', 'assets', 'docs',
  'migrations', 'functions', 'scripts', 'tests', 'operations',
  '.github', '.agents'
]);

function walk(d) {
  return fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(d, e.name);
    if (e.isDirectory()) {
      if (SKIP_DIRS.has(e.name)) return [];
      return walk(p);
    }
    return [p];
  });
}

// Single source of truth for the business JSON-LD blocks.
const business = JSON.parse(fs.readFileSync('assets/data/business.json', 'utf8'));
const renderBlock = (data) =>
  `  <script type="application/ld+json">\n${JSON.stringify(data, null, 4).replace(/^/gm, '    ').replace(/^    /, '    ')}\n  </script>\n`;
const businessBlockFR = renderBlock(business.fr);
const businessBlockEN = renderBlock(business.en);

const norm = (s) => s.split(path.sep).join('/');
const files = walk('.').filter((f) => f.endsWith('.html') && !f.endsWith('404.html'));

let injected = 0;
let skipped = 0;
const touched = [];

for (const f of files) {
  const c = fs.readFileSync(f, 'utf8');
  const hasBusiness = /"@type"\s*:\s*"(LocalBusiness|ProfessionalService|Organization)"|"@type"\s*:\s*\[[^\]]*"(LocalBusiness|ProfessionalService|Organization)"/i.test(c);
  if (hasBusiness) { skipped++; continue; }

  const isEN = norm(f).startsWith('en/') || /<html[^>]+lang=["']en/i.test(c);
  const block = isEN ? businessBlockEN : businessBlockFR;

  // Insert before </head>
  const idx = c.search(/<\/head>/i);
  if (idx === -1) {
    console.warn(`[skip: no </head>] ${norm(f)}`);
    skipped++;
    continue;
  }
  const updated = c.slice(0, idx) + block + c.slice(idx);
  fs.writeFileSync(f, updated);
  touched.push(norm(f));
  injected++;
}

console.log(`Injected: ${injected}`);
console.log(`Already had business JSON-LD (skipped): ${skipped}`);
if (touched.length) {
  console.log('\nFiles updated:');
  for (const t of touched) console.log('  ' + t);
}
