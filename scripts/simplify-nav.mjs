#!/usr/bin/env node
// Simplify the header nav across every HTML file (FR + EN).
// Goal: 7 links -> 4 links + tel + lang-switch.
// Preserves the existing lang-switch <a> (per-page href) and nav-tel <a>.
//
// Run: node scripts/simplify-nav.mjs
//
// Safe to re-run (idempotent): once the block matches the simplified pattern,
// re-running yields no diff.

import { readFile, writeFile, readdir, stat } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));

const FR_LINKS = `
          <a href="/services-recuperation-forensique-montreal.html">Services</a>
          <a href="/tarifs-recuperation-donnees-montreal.html">Tarifs</a>
          <a href="/comment-nous-envoyer-vos-donnees.html">Envoi &amp; dépôt</a>
          <a href="/#contact">Contact</a>`;

const EN_LINKS = `
          <a href="/en/forensique-numerique-montreal.html">Services</a>
          <a href="/en/tarifs-recuperation-donnees-montreal.html">Pricing</a>
          <a href="/en/comment-nous-envoyer-vos-donnees.html">Shipping &amp; drop-off</a>
          <a href="/en/#contact">Contact</a>`;

const NAV_LINKS_RE = /<div class="nav-links">([\s\S]*?)<\/div>/;

function extractAnchor(inner, className) {
  const re = new RegExp(`<a[^>]*class="[^"]*\\b${className}\\b[^"]*"[^>]*>[\\s\\S]*?<\\/a>`, 'i');
  const match = inner.match(re);
  return match ? match[0].replace(/\s+/g, ' ').trim() : null;
}

async function* walkHtml(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      // skip build output, deps, ops scratch, scripts
      if (['node_modules', 'release-cloudflare', '.git', '.wrangler', 'operations'].includes(entry.name)) continue;
      yield* walkHtml(full);
    } else if (entry.isFile() && entry.name.endsWith('.html')) {
      yield full;
    }
  }
}

let touched = 0;
let skipped = 0;
let errors = [];

for await (const file of walkHtml(ROOT)) {
  const rel = relative(ROOT, file).split(sep).join('/');
  let html;
  try {
    html = await readFile(file, 'utf8');
  } catch (err) {
    errors.push(`${rel}: ${err.message}`);
    continue;
  }

  if (!NAV_LINKS_RE.test(html)) {
    skipped++;
    continue;
  }

  const isEn = rel.startsWith('en/') || rel === 'en';
  const links = isEn ? EN_LINKS : FR_LINKS;

  const DEFAULT_TEL = `<a class="nav-tel" href="tel:+14388130592" data-track="call-header" aria-label="Appeler le laboratoire">438 813-0592</a>`;
  const next = html.replace(NAV_LINKS_RE, (_, inner) => {
    const tel = extractAnchor(inner, 'nav-tel') || DEFAULT_TEL;
    const lang = extractAnchor(inner, 'lang-switch');
    if (!lang) {
      errors.push(`${rel}: missing lang-switch in nav-links`);
      return _;
    }
    return `<div class="nav-links">${links}
          ${tel}
          ${lang}
        </div>`;
  });

  if (next !== html) {
    await writeFile(file, next, 'utf8');
    touched++;
    console.log(`✓ ${rel}`);
  } else {
    skipped++;
  }
}

console.log(`\nDone. Touched ${touched} file(s), skipped ${skipped}.`);
if (errors.length) {
  console.log(`\nErrors (${errors.length}):`);
  for (const e of errors) console.log(`  ! ${e}`);
  process.exit(1);
}
