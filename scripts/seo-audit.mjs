#!/usr/bin/env node
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

const files = walk('.').filter((f) => f.endsWith('.html') && !f.endsWith('404.html'));

const descMap = new Map();
const titleMap = new Map();
const issues = {
    missingDesc: [],
    missingCanonical: [],
    missingHreflang: [],
    missingOg: [],
    missingLocalBusiness: [],
    duplicateDesc: [],
    duplicateTitle: [],
    longTitle: [],
    shortDesc: [],
    longDesc: [],
};

for (const f of files) {
    const c = fs.readFileSync(f, 'utf8');
// Match content with either double or single quotes; capture lazily up to closing quote.
  const desc = c.match(/<meta\s+name=["']description["']\s+content="([^"]+)"|<meta\s+name=["']description["']\s+content='([^']+)'/i);
  const descText = desc ? (desc[1] || desc[2]) : null;
    const title = c.match(/<title>([^<]+)<\/title>/i);

    if (!descText) issues.missingDesc.push(f);
    else {
        const d = descText.replace(/\s+/g, ' ').trim();
        if (d.length < 80) issues.shortDesc.push([f, d.length]);
        if (d.length > 165) issues.longDesc.push([f, d.length]);
        if (descMap.has(d)) issues.duplicateDesc.push([f, descMap.get(d)]);
        else descMap.set(d, f);
    }

    if (title) {
        const t = title[1].trim();
        if (t.length > 65) issues.longTitle.push([f, t.length, t]);
        if (titleMap.has(t)) issues.duplicateTitle.push([f, titleMap.get(t)]);
        else titleMap.set(t, f);
    }

    const isNoindex = /<meta\s+name=["']robots["']\s+content=["'][^"']*noindex/i.test(c);

    if (!/rel=["']canonical["']/i.test(c)) issues.missingCanonical.push(f);
    // hreflang is only meaningful on pages we want indexed in multiple locales.
    if (!isNoindex && !/rel=["']alternate["'][^>]*hreflang/i.test(c)) issues.missingHreflang.push(f);
    if (!/property=["']og:title["']/i.test(c)) issues.missingOg.push(f);
    // Match either string form ("@type": "LocalBusiness") or array form
    // ("@type": ["ProfessionalService", "LocalBusiness"]).
    const hasBusiness = /"@type"\s*:\s*("(?:LocalBusiness|ProfessionalService|Organization)"|\[[^\]]*"(?:LocalBusiness|ProfessionalService|Organization)"[^\]]*\])/i.test(c);
    if (!hasBusiness) issues.missingLocalBusiness.push(f);
}

const norm = (s) => s.split(path.sep).join('/');
console.log(`Total HTML pages scanned: ${files.length}\n`);

const report = (label, list, fmt = (x) => norm(x)) => {
    if (!list.length) {
        console.log(`✅ ${label}: 0`);
        return;
    }
    console.log(`⚠️  ${label}: ${list.length}`);
    for (const item of list.slice(0, 10)) console.log(`   - ${fmt(item)}`);
    if (list.length > 10) console.log(`   ... +${list.length - 10} more`);
};

report('Missing meta description', issues.missingDesc);
report('Duplicate meta description', issues.duplicateDesc, ([a, b]) => `${norm(a)} == ${norm(b)}`);
report('Description too short (<80)', issues.shortDesc, ([a, n]) => `${norm(a)} (${n} chars)`);
report('Description too long (>165)', issues.longDesc, ([a, n]) => `${norm(a)} (${n} chars)`);
report('Duplicate <title>', issues.duplicateTitle, ([a, b]) => `${norm(a)} == ${norm(b)}`);
report('Title too long (>65)', issues.longTitle, ([a, n]) => `${norm(a)} (${n} chars)`);
report('Missing canonical', issues.missingCanonical);
report('Missing hreflang', issues.missingHreflang);
report('Missing og:title', issues.missingOg);
report('Missing LocalBusiness/Organization JSON-LD', issues.missingLocalBusiness);

const totalIssues =
    issues.missingDesc.length +
    issues.duplicateDesc.length +
    issues.shortDesc.length +
    issues.longDesc.length +
    issues.duplicateTitle.length +
    issues.longTitle.length +
    issues.missingCanonical.length +
    issues.missingHreflang.length +
    issues.missingOg.length +
    issues.missingLocalBusiness.length;

console.log(`\nTotal flagged: ${totalIssues}`);
process.exit(totalIssues > 0 ? 1 : 0);
