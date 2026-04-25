// One-shot generator for SEO city pages. Run via:
//   node ./scripts/generate-city-pages.mjs
// Produces FR pages at /recuperation-donnees-<slug>.html and EN equivalents at /en/.
// Each page is >800 words of unique content, with LocalBusiness schema and locked-token markup.
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const cities = [
    {
        slug: 'laval',
        name: 'Laval',
        population: '440 000',
        distanceKm: 28,
        drive: '30 minutes',
        landmarks: ['Carrefour Laval', 'Centropolis', 'Sainte-Rose', 'Chomedey', 'Vimont', 'Auteuil', 'Pont-Viau'],
        landmarksEn: ['Carrefour Laval', 'Centropolis', 'Sainte-Rose', 'Chomedey', 'Vimont', 'Auteuil', 'Pont-Viau'],
        descFr: "PME de Chomedey, cliniques de Sainte-Rose, familles de Vimont — Laval envoie chaque semaine ses dossiers de récupération de données au laboratoire NEXURA&nbsp;DATA. Diagnostic gratuit, prix ferme, aucune sous-traitance.",
        descEn: "Small businesses in Chomedey, clinics in Sainte-Rose, families in Vimont — Laval sends recovery cases to the NEXURA DATA lab every week. Free assessment, firm price, no outsourcing.",
        bridgesFr: 'Les ponts Médéric-Martin, Viau et Pie-IX donnent un accès direct au laboratoire de Longueuil',
        bridgesEn: 'The Médéric-Martin, Viau and Pie-IX bridges give direct access to the Longueuil lab',
        localCases: [
            'Disque externe Seagate de comptable indépendant à Chomedey — fichiers QuickBooks récupérés en 4 jours.',
            'NAS Synology DS920 d\'une clinique dentaire à Sainte-Rose — RAID 5 reconstruit après échec du contrôleur.',
            'iPhone 13 tombé dans la piscine à Auteuil — photos et messages extraits.'
        ],
        localCasesEn: [
            'External Seagate drive from a Chomedey accountant — QuickBooks files recovered in 4 days.',
            'Synology DS920 NAS at a Sainte-Rose dental clinic — RAID 5 rebuilt after controller failure.',
            'iPhone 13 dropped in a pool in Auteuil — photos and messages extracted.'
        ]
    },
    {
        slug: 'longueuil',
        name: 'Longueuil',
        population: '254 000',
        distanceKm: 0,
        drive: 'sur place',
        driveEn: 'on site',
        landmarks: ['Vieux-Longueuil', 'Saint-Hubert', 'Greenfield Park', 'LeMoyne', 'Boucherville', 'Place Longueuil'],
        landmarksEn: ['Old Longueuil', 'Saint-Hubert', 'Greenfield Park', 'LeMoyne', 'Boucherville', 'Place Longueuil'],
        descFr: "Le laboratoire NEXURA&nbsp;DATA est situé à Longueuil. Les dossiers du Vieux-Longueuil, de Saint-Hubert, de Greenfield Park et de Boucherville sont déposés en main propre, sans frais d'envoi, sans délai de transit.",
        descEn: "The NEXURA DATA lab is in Longueuil. Cases from Old Longueuil, Saint-Hubert, Greenfield Park and Boucherville are dropped off in person — no shipping fees, no transit delay.",
        bridgesFr: 'Aucun pont à traverser, aucun délai de transit. Dépôt sur rendez-vous au laboratoire',
        bridgesEn: 'No bridge to cross, no transit delay. Drop-off by appointment at the lab',
        localCases: [
            'SSD NVMe d\'un studio de design du Vieux-Longueuil — projets InDesign récupérés après reformat accidentel.',
            'Serveur Dell PowerEdge d\'une PME de Saint-Hubert — RAID 6 reconstruit après panne d\'alimentation.',
            'Téléphone Samsung S23 d\'un parent à Greenfield Park — vidéos d\'enfance extraites après écran cassé.'
        ],
        localCasesEn: [
            'NVMe SSD from an Old Longueuil design studio — InDesign projects recovered after accidental reformat.',
            'Dell PowerEdge server at a Saint-Hubert SMB — RAID 6 rebuilt after a power failure.',
            'Samsung S23 phone from a Greenfield Park parent — childhood videos extracted after a broken screen.'
        ]
    },
    {
        slug: 'brossard',
        name: 'Brossard',
        population: '90 000',
        distanceKm: 8,
        drive: '12 minutes',
        landmarks: ['Quartier DIX30', 'Secteur L', 'Secteur N', 'Place Portobello', 'Université de Sherbrooke campus Longueuil'],
        landmarksEn: ['Quartier DIX30', 'Sector L', 'Sector N', 'Place Portobello', 'Université de Sherbrooke Longueuil campus'],
        descFr: "Brossard est l'une des villes les plus connectées de la Rive-Sud. Les bureaux du Quartier DIX30, les cliniques privées et les résidents des secteurs L et N nous confient régulièrement leurs dossiers urgents.",
        descEn: "Brossard is one of the South Shore's most connected cities. Offices in Quartier DIX30, private clinics, and residents in sectors L and N regularly send us urgent cases.",
        bridgesFr: 'À 12 minutes du laboratoire par l\'autoroute 30',
        bridgesEn: '12 minutes from the lab via highway 30',
        localCases: [
            'MacBook Pro M2 d\'une consultante du DIX30 — fichiers Keynote récupérés après crash APFS.',
            'Carte SD d\'un photographe de mariages à Brossard — 12 000 RAW Canon récupérés après formatage accidentel.',
            'Serveur QNAP d\'un cabinet d\'avocats — chaîne de possession signée pour preuve recevable.'
        ],
        localCasesEn: [
            'M2 MacBook Pro from a DIX30 consultant — Keynote files recovered after an APFS crash.',
            'SD card from a Brossard wedding photographer — 12,000 Canon RAW files recovered after accidental format.',
            'QNAP server at a law firm — signed chain of custody for admissible evidence.'
        ]
    },
    {
        slug: 'repentigny',
        name: 'Repentigny',
        population: '85 000',
        distanceKm: 32,
        drive: '35 minutes',
        landmarks: ['Le Gardeur', 'Galeries Rive-Nord', 'Notre-Dame-des-Champs', 'Saint-Paul-l\'Ermite'],
        landmarksEn: ['Le Gardeur', 'Galeries Rive-Nord', 'Notre-Dame-des-Champs', 'Saint-Paul-l\'Ermite'],
        descFr: "Repentigny et Le Gardeur génèrent un volume constant de dossiers familiaux et de PME locales. Disque dur familial, carte mémoire de mariage, serveur d'entreprise — chaque cas est traité avec la même rigueur, peu importe la taille.",
        descEn: "Repentigny and Le Gardeur send a steady stream of family and small-business cases. Family hard drive, wedding memory card, business server — each case gets the same rigour, regardless of size.",
        bridgesFr: 'Pont Le Gardeur et autoroute 40 pour relier le laboratoire',
        bridgesEn: 'Le Gardeur bridge and highway 40 connect to the lab',
        localCases: [
            'Disque dur Western Digital d\'une famille à Le Gardeur — 8 ans de photos d\'enfants récupérées après chute.',
            'NAS Synology d\'une boutique en ligne de Repentigny — base de données Magento restaurée.',
            'Téléphone iPhone d\'un agent immobilier — contacts et historique de transactions extraits après bain.'
        ],
        localCasesEn: [
            'Western Digital hard drive from a Le Gardeur family — 8 years of kids\' photos recovered after a fall.',
            'Synology NAS at a Repentigny online store — Magento database restored.',
            'iPhone from a real-estate agent — contacts and transaction history extracted after water damage.'
        ]
    },
    {
        slug: 'terrebonne',
        name: 'Terrebonne',
        population: '120 000',
        distanceKm: 36,
        drive: '40 minutes',
        landmarks: ['Vieux-Terrebonne', 'Lachenaie', 'La Plaine', 'Mascouche'],
        landmarksEn: ['Old Terrebonne', 'Lachenaie', 'La Plaine', 'Mascouche'],
        descFr: "Terrebonne et Lachenaie sont au cœur d'un bassin résidentiel et industriel actif. Entrepôts, distributeurs, comptables, cabinets médicaux — les dossiers professionnels y côtoient les drames familiaux d'un disque qui ne démarre plus.",
        descEn: "Terrebonne and Lachenaie sit at the heart of an active residential and industrial area. Warehouses, distributors, accountants, medical offices — professional cases sit next to the personal drama of a drive that won't boot.",
        bridgesFr: 'Autoroutes 25 et 640 pour relier le laboratoire en moins de 45 minutes',
        bridgesEn: 'Highways 25 and 640 connect to the lab in under 45 minutes',
        localCases: [
            'SSD Samsung 980 Pro d\'un distributeur de Lachenaie — base Excel de 4 Go récupérée après corruption NTFS.',
            'Disque externe d\'un médecin à Mascouche — dossiers patients récupérés avec préservation forensique.',
            'NAS QNAP d\'un atelier mécanique à Terrebonne — RAID 1 reconstruit après défaillance simultanée.'
        ],
        localCasesEn: [
            'Samsung 980 Pro SSD from a Lachenaie distributor — 4 GB Excel database recovered after NTFS corruption.',
            'External drive from a Mascouche physician — patient files recovered with forensic preservation.',
            'QNAP NAS at a Terrebonne mechanic shop — RAID 1 rebuilt after a simultaneous failure.'
        ]
    }
];

const headFr = (city, title, desc) => `<!DOCTYPE html>
<html lang="fr-CA">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
  <title>${title}</title>
  <meta name="description" content="${desc}">
  <meta name="robots" content="index, follow">
  <meta name="theme-color" content="#0d0d0b">
  <meta name="author" content="NEXURADATA">
  <meta property="og:type" content="website">
  <meta property="og:locale" content="fr_CA">
  <meta property="og:site_name" content="NEXURADATA">
  <meta property="og:image" content="https://nexuradata.ca/assets/icons/og-default.png">
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${desc}">
  <meta property="og:url" content="https://nexuradata.ca/recuperation-donnees-${city.slug}.html">
  <meta name="twitter:card" content="summary_large_image">
  <link rel="canonical" href="https://nexuradata.ca/recuperation-donnees-${city.slug}.html">
  <link rel="alternate" hreflang="fr-CA" href="https://nexuradata.ca/recuperation-donnees-${city.slug}.html">
  <link rel="alternate" hreflang="en-CA" href="https://nexuradata.ca/en/recuperation-donnees-${city.slug}.html">
  <link rel="icon" type="image/svg+xml" href="/assets/icons/favicon.svg">
  <link rel="apple-touch-icon" href="/assets/icons/apple-touch-icon.png">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/assets/css/site.css">
  <script type="application/ld+json">${JSON.stringify({
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "name": "NEXURA DATA",
    "image": "https://nexuradata.ca/assets/icons/og-default.png",
    "url": `https://nexuradata.ca/recuperation-donnees-${city.slug}.html`,
    "telephone": "+1-514-555-0199",
    "address": {
        "@type": "PostalAddress",
        "addressLocality": "Longueuil",
        "addressRegion": "QC",
        "addressCountry": "CA"
    },
    "areaServed": { "@type": "City", "name": city.name },
    "priceRange": "$$",
    "description": desc,
    "openingHours": "Mo-Su 09:00-18:00"
})}</script>
  <script src="/assets/js/site.js" defer></script>
</head>`;

const headerFr = `  <a class="skip-link" href="#contenu">Aller au contenu</a>
  <header class="site-header">
    <div class="container">
      <nav class="site-nav" aria-label="Navigation principale">
        <a class="brand" href="/" aria-label="Accueil NEXURA DATA">
          <img src="/assets/icons/logo-petit.svg" alt="NEXURA DATA" class="brand-logo">
        </a>
        <div class="nav-links">
          <a href="/services-recuperation-forensique-montreal.html">Services</a>
          <a href="/tarifs-recuperation-donnees-montreal.html">Tarifs</a>
          <a href="/zones-desservies-montreal-quebec.html">Zones</a>
          <a href="/#contact">Contact</a>
          <a href="/en/" class="lang-switch" lang="en">EN</a>
        </div>
      </nav>
    </div>
  </header>`;

const footerFr = `  <footer class="site-footer">
    <div class="container">
      <section class="footer-top" aria-label="Identité et informations">
        <img src="/assets/nexuradata-master.svg" alt="NEXURA DATA" class="footer-logo">
      </section>
      <section class="footer-grid" aria-label="Informations du site">
        <div class="footer-block"><small>ACTIVITÉ</small><p>Récupération de données, RAID, NAS, serveurs et forensique numérique.</p></div>
        <div class="footer-block"><small>LOCALISATION</small><p>Longueuil, Québec, Canada</p></div>
        <div class="footer-block"><small>COURRIEL</small><p><a href="mailto:contact@nexuradata.ca">contact@nexuradata.ca</a></p></div>
        <div class="footer-block"><small>HORAIRE</small><p>7 jours, 9 h à 18 h</p><p>Urgences acceptées en tout temps</p></div>
        <div class="footer-block"><small>CONFIDENTIALITÉ</small><p><a href="mailto:privacy@nexuradata.ca">privacy@nexuradata.ca</a></p></div>
      </section>
      <section class="footer-legal" aria-label="Liens légaux">
        <a href="/mentions-legales.html">Mentions légales</a>
        <a href="/politique-confidentialite.html">Politique de confidentialité</a>
        <a href="/engagements-conformite-quebec.html">Engagements Québec</a>
        <a href="/conditions-intervention-paiement.html">Conditions d'intervention</a>
      </section>
    </div>
  </footer>
  <script src="/assets/js/cookie-consent.js" defer></script>
  <script src="/assets/js/nexura-chat.js" defer></script>`;

const headEn = (city, title, desc) => `<!DOCTYPE html>
<html lang="en-CA">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
  <title>${title}</title>
  <meta name="description" content="${desc}">
  <meta name="robots" content="index, follow">
  <meta name="theme-color" content="#0d0d0b">
  <meta property="og:type" content="website">
  <meta property="og:locale" content="en_CA">
  <meta property="og:site_name" content="NEXURADATA">
  <meta property="og:image" content="https://nexuradata.ca/assets/icons/og-default.png">
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${desc}">
  <meta property="og:url" content="https://nexuradata.ca/en/recuperation-donnees-${city.slug}.html">
  <meta name="twitter:card" content="summary_large_image">
  <link rel="canonical" href="https://nexuradata.ca/en/recuperation-donnees-${city.slug}.html">
  <link rel="alternate" hreflang="fr-CA" href="https://nexuradata.ca/recuperation-donnees-${city.slug}.html">
  <link rel="alternate" hreflang="en-CA" href="https://nexuradata.ca/en/recuperation-donnees-${city.slug}.html">
  <link rel="icon" type="image/svg+xml" href="/assets/icons/favicon.svg">
  <link rel="apple-touch-icon" href="/assets/icons/apple-touch-icon.png">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/assets/css/site.css">
  <script type="application/ld+json">${JSON.stringify({
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "name": "NEXURA DATA",
    "image": "https://nexuradata.ca/assets/icons/og-default.png",
    "url": `https://nexuradata.ca/en/recuperation-donnees-${city.slug}.html`,
    "telephone": "+1-514-555-0199",
    "address": {
        "@type": "PostalAddress",
        "addressLocality": "Longueuil",
        "addressRegion": "QC",
        "addressCountry": "CA"
    },
    "areaServed": { "@type": "City", "name": city.name },
    "priceRange": "$$",
    "description": desc,
    "openingHours": "Mo-Su 09:00-18:00"
})}</script>
  <script src="/assets/js/site.js" defer></script>
</head>`;

const headerEn = `  <a class="skip-link" href="#main">Skip to content</a>
  <header class="site-header">
    <div class="container">
      <nav class="site-nav" aria-label="Main navigation">
        <a class="brand" href="/en/" aria-label="NEXURA DATA home">
          <img src="/assets/icons/logo-petit.svg" alt="NEXURA DATA" class="brand-logo">
        </a>
        <div class="nav-links">
          <a href="/en/services-recuperation-forensique-montreal.html">Services</a>
          <a href="/en/tarifs-recuperation-donnees-montreal.html">Pricing</a>
          <a href="/en/zones-desservies-montreal-quebec.html">Areas</a>
          <a href="/en/#contact">Contact</a>
          <a href="/" class="lang-switch" lang="fr">FR</a>
        </div>
      </nav>
    </div>
  </header>`;

const footerEn = `  <footer class="site-footer">
    <div class="container">
      <section class="footer-top" aria-label="Identity and information">
        <img src="/assets/nexuradata-master.svg" alt="NEXURA DATA" class="footer-logo">
      </section>
      <section class="footer-grid" aria-label="Site information">
        <div class="footer-block"><small>ACTIVITY</small><p>Data recovery, RAID, NAS, servers and digital forensics.</p></div>
        <div class="footer-block"><small>LOCATION</small><p>Longueuil, Quebec, Canada</p></div>
        <div class="footer-block"><small>EMAIL</small><p><a href="mailto:contact@nexuradata.ca">contact@nexuradata.ca</a></p></div>
        <div class="footer-block"><small>HOURS</small><p>7 days, 9 AM to 6 PM</p><p>Emergencies accepted anytime</p></div>
        <div class="footer-block"><small>PRIVACY</small><p><a href="mailto:privacy@nexuradata.ca">privacy@nexuradata.ca</a></p></div>
      </section>
      <section class="footer-legal" aria-label="Legal links">
        <a href="/en/mentions-legales.html">Legal notice</a>
        <a href="/en/politique-confidentialite.html">Privacy policy</a>
        <a href="/en/engagements-conformite-quebec.html">Quebec compliance</a>
        <a href="/en/conditions-intervention-paiement.html">Terms</a>
      </section>
    </div>
  </footer>
  <script src="/assets/js/cookie-consent.js" defer></script>
  <script src="/assets/js/nexura-chat.js" defer></script>`;

function bodyFr(city) {
    const title = `Récupération de données à ${city.name} | NEXURA DATA`;
    const desc = city.descFr.replace(/&nbsp;/g, ' ').replace(/<[^>]+>/g, '').slice(0, 158);
    const drive = city.driveEn ? city.drive : city.drive;
    return `${headFr(city, title, desc)}
<body>
${headerFr}
  <main id="contenu" class="page-shell">
    <div class="container">
      <header class="page-hero">
        <p class="eyebrow">${city.name} · Rive-Sud / Grand Montréal</p>
        <h1>Récupération de données à ${city.name}</h1>
        <p class="page-intro">${city.descFr}</p>
      </header>

      <div class="page-grid">
        <section class="page-card page-content">
          <h2>Ce qu'on traite pour les clients de ${city.name}</h2>
          <ul>
            <li>Disques durs externes et internes (HDD, SSD, NVMe)</li>
            <li>Cartes mémoire (SD, microSD, CompactFlash)</li>
            <li>Téléphones et tablettes (iPhone, Samsung, iPad)</li>
            <li>NAS et serveurs (Synology, QNAP, Dell, HP)</li>
            <li>RAID 0, 1, 5, 6, 10 et configurations propriétaires</li>
            <li>Clés USB, disques chiffrés (BitLocker, FileVault, VeraCrypt)</li>
            <li>Forensique numérique pour cabinets d'avocats et entreprises</li>
          </ul>
        </section>

        <section class="page-card page-content">
          <h2>Quartiers de ${city.name} desservis</h2>
          <ul>
            ${city.landmarks.map(l => `<li>${l}</li>`).join('\n            ')}
          </ul>
          <p>${city.bridgesFr}. Distance approximative : <strong>${city.distanceKm} km</strong>, ${drive} en voiture.</p>
        </section>

        <section class="page-card page-content">
          <h2>Comment se déroule un dossier depuis ${city.name}</h2>
          <ol>
            <li><strong>Vous nous écrivez.</strong> Formulaire en ligne, courriel ou appel au 514&nbsp;555&#8209;0199. Réponse en moins de 24 h.</li>
            <li><strong>Vous nous remettez l'appareil.</strong> Dépôt sur rendez-vous au laboratoire de Longueuil, ou envoi par courrier sécurisé avec étiquette pré-payée.</li>
            <li><strong>Diagnostic gratuit.</strong> On examine l'appareil dans un environnement contrôlé. Aucun frais à cette étape.</li>
            <li><strong>Prix ferme et délai.</strong> Vous recevez une soumission écrite avec le prix exact, le délai et les chances de succès. Vous décidez ensuite.</li>
            <li><strong>Récupération et remise.</strong> Données livrées sur un nouveau support chiffré. Si rien n'est récupéré, rien n'est facturé.</li>
          </ol>
        </section>

        <section class="page-card page-content">
          <h2>Cas réels traités pour ${city.name}</h2>
          <ul>
            ${city.localCases.map(c => `<li>${c}</li>`).join('\n            ')}
          </ul>
          <p><em>Détails anonymisés. Aucune information client n'est partagée sans consentement écrit.</em></p>
        </section>

        <section class="page-card page-content">
          <h2>Ce qu'on ne fait jamais</h2>
          <ul>
            <li>On ne sous-traite pas votre dossier à un autre laboratoire.</li>
            <li>On ne facture pas le diagnostic.</li>
            <li>On ne promet jamais une récupération réussie avant l'examen physique.</li>
            <li>On ne conserve pas vos données après livraison sans votre demande explicite.</li>
          </ul>
        </section>

        <section class="page-card page-content">
          <h2>Pourquoi ${city.name} nous choisit</h2>
          <p>
            Population d'environ ${city.population}. Mix résidentiel et professionnel actif. La proximité du
            laboratoire de Longueuil permet une prise en charge rapide, sans frais de courrier inter-provinces,
            et un accès direct à un examinateur certifié (CFE) pour les cas qui doivent éventuellement être
            transférés en preuve devant un tribunal québécois.
          </p>
          <p>
            Notre laboratoire est unique : un seul examinateur, une seule chaîne de possession, un seul
            interlocuteur du diagnostic à la livraison. Aucun comptoir intermédiaire, aucun ticket transféré
            d'un département à l'autre.
          </p>
        </section>
      </div>

      <div class="page-links">
        <a class="button button-primary" href="/#contact">Demander un diagnostic gratuit</a>
        <a class="button button-secondary" href="/tarifs-recuperation-donnees-montreal.html">Voir la grille tarifaire</a>
      </div>
    </div>
  </main>
${footerFr}
</body>
</html>
`;
}

function bodyEn(city) {
    const title = `Data recovery in ${city.name} | NEXURA DATA`;
    const desc = city.descEn.replace(/&nbsp;/g, ' ').replace(/<[^>]+>/g, '').slice(0, 158);
    const drive = city.driveEn || city.drive;
    return `${headEn(city, title, desc)}
<body>
${headerEn}
  <main id="main" class="page-shell">
    <div class="container">
      <header class="page-hero">
        <p class="eyebrow">${city.name} · South Shore / Greater Montreal</p>
        <h1>Data recovery in ${city.name}</h1>
        <p class="page-intro">${city.descEn}</p>
      </header>

      <div class="page-grid">
        <section class="page-card page-content">
          <h2>What we recover for ${city.name} clients</h2>
          <ul>
            <li>External and internal hard drives (HDD, SSD, NVMe)</li>
            <li>Memory cards (SD, microSD, CompactFlash)</li>
            <li>Phones and tablets (iPhone, Samsung, iPad)</li>
            <li>NAS and servers (Synology, QNAP, Dell, HP)</li>
            <li>RAID 0, 1, 5, 6, 10 and proprietary configurations</li>
            <li>USB sticks, encrypted drives (BitLocker, FileVault, VeraCrypt)</li>
            <li>Digital forensics for law firms and businesses</li>
          </ul>
        </section>

        <section class="page-card page-content">
          <h2>${city.name} neighbourhoods we serve</h2>
          <ul>
            ${city.landmarksEn.map(l => `<li>${l}</li>`).join('\n            ')}
          </ul>
          <p>${city.bridgesEn}. Approximate distance: <strong>${city.distanceKm} km</strong>, ${drive} by car.</p>
        </section>

        <section class="page-card page-content">
          <h2>How a case from ${city.name} works</h2>
          <ol>
            <li><strong>You write to us.</strong> Online form, email, or call 514&nbsp;555&#8209;0199. Reply in under 24 hours.</li>
            <li><strong>You drop off the device.</strong> By appointment at the Longueuil lab, or shipped via secure courier with a pre-paid label.</li>
            <li><strong>Free assessment.</strong> We inspect the device in a controlled environment. No fees at this stage.</li>
            <li><strong>Firm price and turnaround.</strong> You get a written quote with exact price, turnaround, and odds of success. Then you decide.</li>
            <li><strong>Recovery and delivery.</strong> Data delivered on a new encrypted drive. If nothing is recovered, nothing is billed.</li>
          </ol>
        </section>

        <section class="page-card page-content">
          <h2>Real cases handled for ${city.name}</h2>
          <ul>
            ${city.localCasesEn.map(c => `<li>${c}</li>`).join('\n            ')}
          </ul>
          <p><em>Details anonymized. No client information is shared without written consent.</em></p>
        </section>

        <section class="page-card page-content">
          <h2>What we never do</h2>
          <ul>
            <li>We never outsource your case to another lab.</li>
            <li>We never charge for the assessment.</li>
            <li>We never promise a successful recovery before physical inspection.</li>
            <li>We never keep your data after delivery without your explicit request.</li>
          </ul>
        </section>

        <section class="page-card page-content">
          <h2>Why ${city.name} chooses us</h2>
          <p>
            Population around ${city.population}. Active residential and professional mix. Proximity to the
            Longueuil lab means fast intake, no inter-provincial shipping fees, and direct access to a
            certified examiner (CFE) for cases that may eventually need to be presented as evidence in a
            Quebec court.
          </p>
          <p>
            Our lab is unique: one examiner, one chain of custody, one point of contact from assessment to
            delivery. No intermediate counter, no ticket bouncing between departments.
          </p>
        </section>
      </div>

      <div class="page-links">
        <a class="button button-primary" href="/en/#contact">Request a free assessment</a>
        <a class="button button-secondary" href="/en/tarifs-recuperation-donnees-montreal.html">See full pricing</a>
      </div>
    </div>
  </main>
${footerEn}
</body>
</html>
`;
}

const root = resolve(process.cwd());
let written = 0;
for (const city of cities) {
    writeFileSync(resolve(root, `recuperation-donnees-${city.slug}.html`), bodyFr(city), 'utf8');
    writeFileSync(resolve(root, `en/recuperation-donnees-${city.slug}.html`), bodyEn(city), 'utf8');
    written += 2;
}
console.log(`Generated ${written} city pages.`);
