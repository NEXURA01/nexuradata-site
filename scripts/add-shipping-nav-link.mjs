// One-shot script: insert "Envoi & dépôt" / "Shipping & drop-off" nav link
// in all HTML files (FR root + en/) right before the Confidentialité/Privacy link.
// Idempotent: skips files that already contain the link.
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const SKIP_DIRS = new Set([
    'node_modules', 'release-cloudflare', '.git', '.wrangler',
    'dist', 'build', 'migrations', 'functions', 'operations',
    'docs', 'tests', 'scripts', 'assets', '.github', '.vscode'
]);

const FR_LINK = '<a href="/comment-nous-envoyer-vos-donnees.html">Envoi &amp; dépôt</a>';
const EN_LINK = '<a href="/en/comment-nous-envoyer-vos-donnees.html">Shipping &amp; drop-off</a>';

const FR_PATTERNS = [
    /(\s+)(<a href="\/politique-confidentialite\.html">Confidentialité<\/a>)/,
    /(\s+)(<a href="\/politique-confidentialite\.html">Privacy<\/a>)/ // EN files in root by mistake
];
const EN_PATTERNS = [
    /(\s+)(<a href="\/en\/politique-confidentialite\.html">Privacy<\/a>)/,
    /(\s+)(<a href="\/en\/politique-confidentialite\.html">Confidentialité<\/a>)/
];

function walk(dir, files = []) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (SKIP_DIRS.has(entry.name)) continue;
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full, files);
        else if (entry.isFile() && entry.name.endsWith('.html')) files.push(full);
    }
    return files;
}

let updated = 0;
let skipped = 0;
for (const file of walk(ROOT)) {
    let html = fs.readFileSync(file, 'utf8');
    const isEnFile = file.includes(`${path.sep}en${path.sep}`);
    const link = isEnFile ? EN_LINK : FR_LINK;
    const patterns = isEnFile ? EN_PATTERNS : FR_PATTERNS;

    // Skip if link already present
    if (html.includes('comment-nous-envoyer-vos-donnees.html') &&
        (html.includes('Envoi &amp; dépôt') || html.includes('Shipping &amp; drop-off'))) {
        skipped++;
        continue;
    }

    let matched = false;
    for (const re of patterns) {
        const m = html.match(re);
        if (m) {
            html = html.replace(re, `$1${link}$1$2`);
            matched = true;
            break;
        }
    }
    if (matched) {
        fs.writeFileSync(file, html, 'utf8');
        updated++;
        console.log(`  + ${path.relative(ROOT, file)}`);
    }
}
console.log(`\n${updated} fichier(s) mis à jour, ${skipped} déjà à jour.`);
