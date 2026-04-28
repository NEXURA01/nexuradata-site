// Injects a BreadcrumbList JSON-LD block into customer-facing FR + EN pages.
// Idempotent: skips files that already have a BreadcrumbList.
// Usage: node scripts/inject-breadcrumbs.mjs
import { readFile, writeFile } from "node:fs/promises";

const ORIGIN = "https://nexuradata.ca";

// page filename → [FR label, EN label]
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
    "tarifs-recuperation-donnees-montreal.html": ["Tarifs", "Pricing"],
};

function buildBreadcrumb(isFr, slug, label) {
    const homeName = isFr ? "Accueil" : "Home";
    const homeUrl = isFr ? `${ORIGIN}/` : `${ORIGIN}/en/`;
    const pageUrl = isFr ? `${ORIGIN}/${slug}` : `${ORIGIN}/en/${slug}`;
    const data = {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
            { "@type": "ListItem", position: 1, name: homeName, item: homeUrl },
            { "@type": "ListItem", position: 2, name: label, item: pageUrl },
        ],
    };
    return `  <script type="application/ld+json">\n${JSON.stringify(data, null, 2)
        .split("\n")
        .map((l) => "    " + l)
        .join("\n")}\n  </script>\n`;
}

let updated = 0;
let skipped = 0;

for (const [slug, [frLabel, enLabel]] of Object.entries(PAGES)) {
    for (const isFr of [true, false]) {
        const path = isFr ? slug : `en/${slug}`;
        let html;
        try {
            html = await readFile(path, "utf8");
        } catch {
            console.warn(`[skip] missing: ${path}`);
            continue;
        }
        if (html.includes('"@type": "BreadcrumbList"') || html.includes('"@type":"BreadcrumbList"')) {
            skipped++;
            continue;
        }
        const block = buildBreadcrumb(isFr, slug, isFr ? frLabel : enLabel);
        // Insert just before </head>
        const idx = html.indexOf("</head>");
        if (idx === -1) {
            console.warn(`[skip] no </head>: ${path}`);
            continue;
        }
        const next = html.slice(0, idx) + block + html.slice(idx);
        await writeFile(path, next, "utf8");
        updated++;
        console.log(`[updated] ${path}`);
    }
}

console.log(`\nDone. Updated: ${updated}, Skipped (already had breadcrumb): ${skipped}`);
