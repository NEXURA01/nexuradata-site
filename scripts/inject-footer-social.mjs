#!/usr/bin/env node
// Injects a "Suivez-nous / Follow us" footer block (Facebook link) into all
// site pages, idempotently. Uses literal string replacement only.

import fs from 'node:fs';
import path from 'node:path';

const SKIP_DIRS = new Set([
  'node_modules', 'release-cloudflare', '.git', 'assets', 'docs',
  'migrations', 'functions', 'scripts', 'tests', 'operations', '.github', '.agents'
]);

const FB_URL = 'https://www.facebook.com/profile.php?id=61588752816284';
const MARKER = 'data-social-fb';

const FR_ANCHOR = `        <div class="footer-block">
          <small>CONFIDENTIALITÉ</small>
          <p><a href="mailto:privacy@nexuradata.ca">privacy@nexuradata.ca</a></p>
        </div>`;

const FR_INSERT = FR_ANCHOR + `

        <div class="footer-block" ${MARKER}>
          <small>SUIVEZ-NOUS</small>
          <p><a href="${FB_URL}" target="_blank" rel="noopener" aria-label="NEXURADATA sur Facebook">Facebook</a></p>
        </div>`;

const EN_ANCHOR = `        <div class="footer-block">
          <small>PRIVACY</small>
          <p><a href="mailto:privacy@nexuradata.ca">privacy@nexuradata.ca</a></p>
        </div>`;

const EN_INSERT = EN_ANCHOR + `

        <div class="footer-block" ${MARKER}>
          <small>FOLLOW US</small>
          <p><a href="${FB_URL}" target="_blank" rel="noopener" aria-label="NEXURADATA on Facebook">Facebook</a></p>
        </div>`;

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

const files = walk('.').filter((f) => f.endsWith('.html'));
let updated = 0;
let skipped = 0;
let alreadyDone = 0;

for (const f of files) {
  const c = fs.readFileSync(f, 'utf8');
  if (c.includes(MARKER)) { alreadyDone++; continue; }

  let next = c;
  if (c.includes(FR_ANCHOR)) {
    next = c.replace(FR_ANCHOR, FR_INSERT);
  } else if (c.includes(EN_ANCHOR)) {
    next = c.replace(EN_ANCHOR, EN_INSERT);
  } else {
    skipped++;
    continue;
  }

  if (next !== c) {
    fs.writeFileSync(f, next, 'utf8');
    updated++;
  }
}

console.log(`Updated:      ${updated}`);
console.log(`Already done: ${alreadyDone}`);
console.log(`Skipped:      ${skipped}`);
