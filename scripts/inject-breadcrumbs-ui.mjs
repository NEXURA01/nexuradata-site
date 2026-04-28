// Inserts a visible breadcrumb nav (above the page-hero) on customer pages.
// Pairs with the JSON-LD BreadcrumbList already injected.
// Idempotent: skips files that already have class="breadcrumbs".
import { readFile, writeFile } from "node:fs/promises";

const PAGES = {
    "tarifs-recuperation-donnees-montreal.html": ["Tarifs", "Pricing"],
    "services-recuperation-forensique-montreal.html": ["Services", "Services"],
    "forensique-numerique-montreal.html": ["Forensique numérique", "Digital forensics"],
    "le-laboratoire.html": ["Le laboratoire", "The lab"],
    "recuperation-donnees-montreal.html": ["Récupération de données", "Data recovery"],
    "recuperation-raid-ssd-montreal.html": ["RAID & SSD", "RAID & SSD"],
    "recuperation-telephone-montreal.html": ["Récupération téléphone", "Phone recovery"],
    "mandats-entreprise.html": ["Mandats entreprise", "Enterprise mandates"],
    "comment-nous-envoyer-vos-donnees.html": ["Envoi & dépôt", "Shipping & drop-off"],
    "engagements-conformite-quebec.html": ["Conformité Québec", "Quebec compliance"],
    "processus-recuperation-donnees-montreal.html": ["Processus", "Process"],
    "prevention-perte-donnees-montreal.html": ["Prévention", "Prevention"],
    "problemes-courants-recuperation-montreal.html": ["Problèmes courants", "Common issues"],
    "sauvegarde-vs-recuperation-donnees-montreal.html": ["Sauvegarde vs récupération", "Backup vs recovery"],
    "resilience-donnees-entreprise-montreal.html": ["Résilience entreprise", "Enterprise resilience"],
    "zones-desservies-montreal-quebec.html": ["Zones desservies", "Service area"],
    "reception-securisee-donnees-montreal.html": ["Réception sécurisée", "Secure reception"],
    "comment-choisir-recuperation-donnees-montreal.html": ["Comment choisir", "How to choose"],
    "recuperation-donnees-brossard.html": ["Brossard", "Brossard"],
    "recuperation-donnees-laval.html": ["Laval", "Laval"],
    "recuperation-donnees-longueuil.html": ["Longueuil", "Longueuil"],
    "recuperation-donnees-repentigny.html": ["Repentigny", "Repentigny"],
    "recuperation-donnees-terrebonne.html": ["Terrebonne", "Terrebonne"],
    "reserver-creneau-laboratoire.html": ["Réserver un créneau", "Book a slot"],
    "suivi-dossier-client-montreal.html": ["Suivi de dossier", "Case tracking"],
};

let updated = 0;
let skipped = 0;

for (const [slug, [frLabel, enLabel]] of Object.entries(PAGES)) {
    for (const isFr of [true, false]) {
        const path = isFr ? slug : `en/${slug}`;
        let html;
        try {
            html = await readFile(path, "utf8");
        } catch {
            continue;
        }
        if (html.includes('class="breadcrumbs"')) {
            skipped++;
            continue;
        }
        const homeUrl = isFr ? "/" : "/en/";
        const homeName = isFr ? "Accueil" : "Home";
        const ariaLabel = isFr ? "Fil d'Ariane" : "Breadcrumb";
        const label = isFr ? frLabel : enLabel;
        const crumb =
            `      <nav class="breadcrumbs" aria-label="${ariaLabel}">\n` +
            `        <a href="${homeUrl}">${homeName}</a>\n` +
            `        <span class="breadcrumbs-sep" aria-hidden="true">/</span>\n` +
            `        <span aria-current="page">${label}</span>\n` +
            `      </nav>\n`;

        // Insert before <header class="page-hero">
        const marker = '<header class="page-hero">';
        const idx = html.indexOf(marker);
        if (idx === -1) {
            console.warn(`[skip] no page-hero marker: ${path}`);
            continue;
        }
        // Find indent of the marker (count leading spaces on its line).
        const lineStart = html.lastIndexOf("\n", idx) + 1;
        const indent = html.slice(lineStart, idx);
        const next =
            html.slice(0, lineStart) +
            crumb.replace(/^      /gm, indent) +
            html.slice(lineStart);
        await writeFile(path, next, "utf8");
        updated++;
        console.log(`[updated] ${path}`);
    }
}

console.log(`\nDone. Updated: ${updated}, Skipped (already had breadcrumbs): ${skipped}`);
