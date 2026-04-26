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

const businessBlockFR = `  <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": ["ProfessionalService", "LocalBusiness"],
      "@id": "https://nexuradata.ca/#business",
      "name": "NEXURADATA",
      "url": "https://nexuradata.ca/",
      "telephone": "+1-438-813-0592",
      "email": "contact@nexuradata.ca",
      "image": "https://nexuradata.ca/assets/icons/og-default.png",
      "logo": "https://nexuradata.ca/assets/nexuradata-master.svg",
      "priceRange": "$$",
      "currenciesAccepted": "CAD",
      "paymentAccepted": "Credit Card, Interac, Bank Transfer",
      "address": {
        "@type": "PostalAddress",
        "addressLocality": "Longueuil",
        "addressRegion": "QC",
        "addressCountry": "CA"
      },
      "areaServed": ["Montréal", "Laval", "Longueuil", "Rive-Sud", "Rive-Nord", "Québec", "Canada"],
      "availableLanguage": ["fr-CA", "en-CA"]
    }
  </script>
`;

const businessBlockEN = `  <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": ["ProfessionalService", "LocalBusiness"],
      "@id": "https://nexuradata.ca/#business",
      "name": "NEXURADATA",
      "url": "https://nexuradata.ca/en/",
      "telephone": "+1-438-813-0592",
      "email": "contact@nexuradata.ca",
      "image": "https://nexuradata.ca/assets/icons/og-default.png",
      "logo": "https://nexuradata.ca/assets/nexuradata-master.svg",
      "priceRange": "$$",
      "currenciesAccepted": "CAD",
      "paymentAccepted": "Credit Card, Interac, Bank Transfer",
      "address": {
        "@type": "PostalAddress",
        "addressLocality": "Longueuil",
        "addressRegion": "QC",
        "addressCountry": "CA"
      },
      "areaServed": ["Montreal", "Laval", "Longueuil", "South Shore", "North Shore", "Quebec", "Canada"],
      "availableLanguage": ["en-CA", "fr-CA"]
    }
  </script>
`;

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
