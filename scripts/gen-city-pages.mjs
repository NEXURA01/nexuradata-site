// Generate SEO city landing pages (FR + EN) from a template.
// Usage: node scripts/gen-city-pages.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const cities = [
  {
    slug: "saint-hubert",
    fr: {
      name: "Saint-Hubert",
      title: "Récupération de données à Saint-Hubert",
      eyebrow: "Saint-Hubert · Longueuil / Rive-Sud",
      meta: "PME industrielles près de l'aéroport, familles du Vieux-Saint-Hubert, écoles du secteur Laflèche — Saint-Hubert dépose chaque semaine ses dossiers au laboratoire NEXURA DATA.",
      hoods: ["Vieux-Saint-Hubert", "Laflèche", "Iberville", "Aéroport Saint-Hubert", "Boulevard Cousineau", "Chambly Est"],
      distance: "5 km",
      drive: "10 minutes",
      cases: [
        "NAS Synology de PME aéronautique près de l'aéroport — RAID 5 reconstruit après coupure électrique.",
        "Disque externe Western Digital d'un photographe de Laflèche — fichiers RAW récupérés en 3 jours.",
        "MacBook Pro tombé sur le boulevard Cousineau — dossiers de cours universitaires extraits."
      ]
    },
    en: {
      name: "Saint-Hubert",
      title: "Data recovery in Saint-Hubert",
      eyebrow: "Saint-Hubert · Longueuil / South Shore",
      meta: "Industrial businesses near the airport, families in Old Saint-Hubert, schools in the Laflèche area — Saint-Hubert sends recovery cases to the NEXURA DATA lab every week.",
      hoods: ["Old Saint-Hubert", "Laflèche", "Iberville", "Saint-Hubert Airport", "Cousineau Boulevard", "Chambly East"],
      distance: "5 km",
      drive: "10 minutes",
      cases: [
        "Synology NAS at an aerospace SMB near the airport — RAID 5 rebuilt after a power outage.",
        "Western Digital external drive from a Laflèche photographer — RAW files recovered in 3 days.",
        "MacBook Pro dropped on Cousineau Boulevard — university coursework extracted."
      ]
    }
  },
  {
    slug: "boucherville",
    fr: {
      name: "Boucherville",
      title: "Récupération de données à Boucherville",
      eyebrow: "Boucherville · Rive-Sud de Montréal",
      meta: "Sièges sociaux et PME du parc industriel, familles du Vieux-Boucherville, professionnels de Du Fort-Saint-Louis — Boucherville confie ses dossiers de récupération au laboratoire NEXURA DATA.",
      hoods: ["Vieux-Boucherville", "Du Fort-Saint-Louis", "Parc industriel Boucherville", "Harmonie", "Rivière-aux-Pins", "Îles-Percées"],
      distance: "12 km",
      drive: "15 minutes",
      cases: [
        "Serveur Dell PowerEdge d'une firme comptable du parc industriel — base SQL Server restaurée après corruption.",
        "Disque interne d'un poste graphiste à Harmonie — projets InDesign et Illustrator récupérés.",
        "Clé USB chiffrée BitLocker d'un consultant — données extraites avec phrase de récupération."
      ]
    },
    en: {
      name: "Boucherville",
      title: "Data recovery in Boucherville",
      eyebrow: "Boucherville · Montreal South Shore",
      meta: "Headquarters and SMBs in the industrial park, families in Old Boucherville, professionals in Du Fort-Saint-Louis — Boucherville trusts the NEXURA DATA lab with recovery cases.",
      hoods: ["Old Boucherville", "Du Fort-Saint-Louis", "Boucherville industrial park", "Harmonie", "Rivière-aux-Pins", "Îles-Percées"],
      distance: "12 km",
      drive: "15 minutes",
      cases: [
        "Dell PowerEdge server at an accounting firm in the industrial park — SQL Server database restored after corruption.",
        "Internal drive from a designer's workstation in Harmonie — InDesign and Illustrator projects recovered.",
        "BitLocker-encrypted USB key from a consultant — data extracted using the recovery phrase."
      ]
    }
  },
  {
    slug: "saint-leonard",
    fr: {
      name: "Saint-Léonard",
      title: "Récupération de données à Saint-Léonard",
      eyebrow: "Saint-Léonard · Est de Montréal",
      meta: "Commerces de la rue Jean-Talon, professionnels de Pie-IX, familles du quartier Domaine-Renaissance — Saint-Léonard envoie chaque semaine ses dossiers au laboratoire NEXURA DATA.",
      hoods: ["Jean-Talon Est", "Domaine-Renaissance", "Boulevard Pie-IX", "Boulevard Lacordaire", "Métro Viau", "Boulevard Langelier"],
      distance: "20 km",
      drive: "25 minutes",
      cases: [
        "Disque externe Seagate d'un commerce sur Jean-Talon — registres de ventes Excel récupérés.",
        "iPhone 14 Pro tombé d'un balcon sur Pie-IX — photos et messages WhatsApp extraits.",
        "NAS Synology DS220 d'un cabinet médical — radiographies DICOM récupérées après crash double-disque."
      ]
    },
    en: {
      name: "Saint-Léonard",
      title: "Data recovery in Saint-Léonard",
      eyebrow: "Saint-Léonard · East Montreal",
      meta: "Businesses on Jean-Talon Street, professionals near Pie-IX, families in the Domaine-Renaissance neighborhood — Saint-Léonard sends recovery cases to the NEXURA DATA lab every week.",
      hoods: ["Jean-Talon East", "Domaine-Renaissance", "Pie-IX Boulevard", "Lacordaire Boulevard", "Viau Metro", "Langelier Boulevard"],
      distance: "20 km",
      drive: "25 minutes",
      cases: [
        "Seagate external drive from a shop on Jean-Talon — Excel sales registers recovered.",
        "iPhone 14 Pro dropped from a balcony on Pie-IX — photos and WhatsApp messages extracted.",
        "Synology DS220 NAS at a medical clinic — DICOM x-rays recovered after dual-disk failure."
      ]
    }
  },
  {
    slug: "pointe-claire",
    fr: {
      name: "Pointe-Claire",
      title: "Récupération de données à Pointe-Claire",
      eyebrow: "Pointe-Claire · Ouest-de-l'Île de Montréal",
      meta: "Sièges sociaux du parc industriel, familles du Village de Pointe-Claire, professionnels du Fairview — Pointe-Claire confie ses dossiers de récupération au laboratoire NEXURA DATA.",
      hoods: ["Village de Pointe-Claire", "Fairview", "Cedar Park", "Valois", "Lakeside", "Boulevard des Sources"],
      distance: "35 km",
      drive: "40 minutes",
      cases: [
        "Serveur HP ProLiant d'une firme d'ingénierie du parc industriel — données CAD/AutoCAD récupérées.",
        "Disque dur Toshiba externe d'une famille du Village — albums photo numériques restaurés.",
        "MacBook Air d'un étudiant universitaire à Valois — mémoire de maîtrise extraite après corruption APFS."
      ]
    },
    en: {
      name: "Pointe-Claire",
      title: "Data recovery in Pointe-Claire",
      eyebrow: "Pointe-Claire · West Island of Montreal",
      meta: "Headquarters in the industrial park, families in the Pointe-Claire Village, professionals near Fairview — Pointe-Claire trusts the NEXURA DATA lab with recovery cases.",
      hoods: ["Pointe-Claire Village", "Fairview", "Cedar Park", "Valois", "Lakeside", "Sources Boulevard"],
      distance: "35 km",
      drive: "40 minutes",
      cases: [
        "HP ProLiant server at an engineering firm in the industrial park — CAD/AutoCAD data recovered.",
        "Toshiba external hard drive from a Village family — digital photo albums restored.",
        "MacBook Air from a graduate student in Valois — master's thesis extracted after APFS corruption."
      ]
    }
  },
  {
    slug: "mascouche",
    fr: {
      name: "Mascouche",
      title: "Récupération de données à Mascouche",
      eyebrow: "Mascouche · Couronne Nord / Lanaudière",
      meta: "PME du parc industriel, familles du Vieux-Mascouche, commerces de la montée Masson — Mascouche dépose chaque semaine ses dossiers au laboratoire NEXURA DATA.",
      hoods: ["Vieux-Mascouche", "Montée Masson", "Le Gardeur", "Domaine du Repos", "Plateau Mascouche", "La Plaine"],
      distance: "45 km",
      drive: "50 minutes",
      cases: [
        "NAS QNAP d'un atelier mécanique sur la montée Masson — base de données client SQL récupérée.",
        "Disque externe LaCie d'une famille du Vieux-Mascouche — vidéos de mariage 4K restaurées.",
        "Téléphone Samsung Galaxy noyé dans la rivière des Mille Îles — contacts et SMS extraits."
      ]
    },
    en: {
      name: "Mascouche",
      title: "Data recovery in Mascouche",
      eyebrow: "Mascouche · North Shore / Lanaudière",
      meta: "SMBs in the industrial park, families in Old Mascouche, businesses on Montée Masson — Mascouche sends recovery cases to the NEXURA DATA lab every week.",
      hoods: ["Old Mascouche", "Montée Masson", "Le Gardeur", "Domaine du Repos", "Plateau Mascouche", "La Plaine"],
      distance: "45 km",
      drive: "50 minutes",
      cases: [
        "QNAP NAS at a mechanical workshop on Montée Masson — SQL customer database recovered.",
        "LaCie external drive from an Old Mascouche family — 4K wedding videos restored.",
        "Samsung Galaxy phone submerged in the Mille Îles River — contacts and SMS extracted."
      ]
    }
  }
];

const buildFr = (c) => `<!DOCTYPE html>
<html lang="fr-CA">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
  <title>${c.fr.title} | NEXURA DATA</title>
  <meta name="description" content="${c.fr.meta}">
  <meta name="robots" content="index, follow">
  <meta name="theme-color" content="#0d0d0b">
  <meta name="author" content="NEXURADATA">
  <meta property="og:type" content="website">
  <meta property="og:locale" content="fr_CA">
  <meta property="og:site_name" content="NEXURADATA">
  <meta property="og:image" content="https://nexuradata.ca/assets/icons/og-default.png">
  <meta property="og:title" content="${c.fr.title} | NEXURA DATA">
  <meta property="og:description" content="${c.fr.meta}">
  <meta property="og:url" content="https://nexuradata.ca/recuperation-donnees-${c.slug}.html">
  <meta name="twitter:card" content="summary_large_image">
  <link rel="canonical" href="https://nexuradata.ca/recuperation-donnees-${c.slug}.html">
  <link rel="alternate" hreflang="fr-CA" href="https://nexuradata.ca/recuperation-donnees-${c.slug}.html">
  <link rel="alternate" hreflang="en-CA" href="https://nexuradata.ca/en/recuperation-donnees-${c.slug}.html">
  <link rel="icon" type="image/svg+xml" href="/assets/icons/favicon.svg">
  <link rel="apple-touch-icon" href="/assets/icons/apple-touch-icon.png">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/assets/css/site.css">
  <script type="application/ld+json">{"@context":"https://schema.org","@type":"LocalBusiness","name":"NEXURA DATA","image":"https://nexuradata.ca/assets/icons/og-default.png","url":"https://nexuradata.ca/recuperation-donnees-${c.slug}.html","telephone":"+1-438-813-0592","address":{"@type":"PostalAddress","addressLocality":"Longueuil","addressRegion":"QC","addressCountry":"CA"},"areaServed":{"@type":"City","name":"${c.fr.name}"},"priceRange":"$$","description":"${c.fr.meta}","openingHours":"Mo-Su 09:00-18:00"}</script>
  <script src="/assets/js/site.js" defer></script>
</head>
<body>
  <a class="skip-link" href="#contenu">Aller au contenu</a>
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
          <a href="/en/recuperation-donnees-${c.slug}.html" class="lang-switch" lang="en">EN</a>
        </div>
      </nav>
    </div>
  </header>
  <main id="contenu" class="page-shell">
    <div class="container">
      <header class="page-hero">
        <p class="eyebrow">${c.fr.eyebrow}</p>
        <h1>${c.fr.title}</h1>
        <p class="page-intro">${c.fr.meta} Diagnostic gratuit, prix ferme, aucune sous-traitance.</p>
      </header>

      <div class="page-grid">
        <section class="page-card page-content">
          <h2>Ce qu'on traite pour les clients de ${c.fr.name}</h2>
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
          <h2>Quartiers de ${c.fr.name} desservis</h2>
          <ul>
${c.fr.hoods.map(h => `            <li>${h}</li>`).join("\n")}
          </ul>
          <p>Distance approximative du laboratoire de Longueuil&nbsp;: <strong>${c.fr.distance}</strong>, ${c.fr.drive} en voiture.</p>
        </section>

        <section class="page-card page-content">
          <h2>Comment se déroule un dossier depuis ${c.fr.name}</h2>
          <ol>
            <li><strong>Vous nous écrivez.</strong> Formulaire en ligne, courriel ou appel au 438&nbsp;813&#8209;0592. Réponse en moins de 24 h.</li>
            <li><strong>Vous nous remettez l'appareil.</strong> Dépôt sur rendez-vous au laboratoire de Longueuil, ou envoi par courrier sécurisé avec étiquette pré-payée.</li>
            <li><strong>Diagnostic gratuit.</strong> On examine l'appareil dans un environnement contrôlé. Aucun frais à cette étape.</li>
            <li><strong>Prix ferme et délai.</strong> Vous recevez une soumission écrite avec le prix exact, le délai et les chances de succès. Vous décidez ensuite.</li>
            <li><strong>Récupération et remise.</strong> Données livrées sur un nouveau support chiffré. Si rien n'est récupéré, rien n'est facturé.</li>
          </ol>
        </section>

        <section class="page-card page-content">
          <h2>Cas réels traités pour ${c.fr.name}</h2>
          <ul>
${c.fr.cases.map(x => `            <li>${x}</li>`).join("\n")}
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
          <h2>Pourquoi ${c.fr.name} nous choisit</h2>
          <p>
            Notre laboratoire est unique&nbsp;: un seul examinateur, une seule chaîne de possession, un seul
            interlocuteur du diagnostic à la livraison. Aucun comptoir intermédiaire, aucun ticket transféré
            d'un département à l'autre. Accès direct à un examinateur certifié (CFE) pour les cas qui doivent
            éventuellement être transférés en preuve devant un tribunal québécois.
          </p>
        </section>
      </div>

      <div class="page-links">
        <a class="button button-primary" href="/#contact">Demander un diagnostic gratuit</a>
        <a class="button button-secondary" href="/tarifs-recuperation-donnees-montreal.html">Voir la grille tarifaire</a>
      </div>
    </div>
  </main>
  <footer class="site-footer">
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
  <script src="/assets/js/nexura-chat.js" defer></script>
</body>
</html>
`;

const buildEn = (c) => `<!DOCTYPE html>
<html lang="en-CA">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
  <title>${c.en.title} | NEXURA DATA</title>
  <meta name="description" content="${c.en.meta}">
  <meta name="robots" content="index, follow">
  <meta name="theme-color" content="#0d0d0b">
  <meta property="og:type" content="website">
  <meta property="og:locale" content="en_CA">
  <meta property="og:site_name" content="NEXURADATA">
  <meta property="og:image" content="https://nexuradata.ca/assets/icons/og-default.png">
  <meta property="og:title" content="${c.en.title} | NEXURA DATA">
  <meta property="og:description" content="${c.en.meta}">
  <meta property="og:url" content="https://nexuradata.ca/en/recuperation-donnees-${c.slug}.html">
  <meta name="twitter:card" content="summary_large_image">
  <link rel="canonical" href="https://nexuradata.ca/en/recuperation-donnees-${c.slug}.html">
  <link rel="alternate" hreflang="fr-CA" href="https://nexuradata.ca/recuperation-donnees-${c.slug}.html">
  <link rel="alternate" hreflang="en-CA" href="https://nexuradata.ca/en/recuperation-donnees-${c.slug}.html">
  <link rel="icon" type="image/svg+xml" href="/assets/icons/favicon.svg">
  <link rel="apple-touch-icon" href="/assets/icons/apple-touch-icon.png">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/assets/css/site.css">
  <script type="application/ld+json">{"@context":"https://schema.org","@type":"LocalBusiness","name":"NEXURA DATA","image":"https://nexuradata.ca/assets/icons/og-default.png","url":"https://nexuradata.ca/en/recuperation-donnees-${c.slug}.html","telephone":"+1-438-813-0592","address":{"@type":"PostalAddress","addressLocality":"Longueuil","addressRegion":"QC","addressCountry":"CA"},"areaServed":{"@type":"City","name":"${c.en.name}"},"priceRange":"$$","description":"${c.en.meta}","openingHours":"Mo-Su 09:00-18:00"}</script>
  <script src="/assets/js/site.js" defer></script>
</head>
<body>
  <a class="skip-link" href="#main">Skip to content</a>
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
          <a href="/recuperation-donnees-${c.slug}.html" class="lang-switch" lang="fr">FR</a>
        </div>
      </nav>
    </div>
  </header>
  <main id="main" class="page-shell">
    <div class="container">
      <header class="page-hero">
        <p class="eyebrow">${c.en.eyebrow}</p>
        <h1>${c.en.title}</h1>
        <p class="page-intro">${c.en.meta} Free assessment, firm price, no outsourcing.</p>
      </header>

      <div class="page-grid">
        <section class="page-card page-content">
          <h2>What we recover for ${c.en.name} clients</h2>
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
          <h2>${c.en.name} neighbourhoods we serve</h2>
          <ul>
${c.en.hoods.map(h => `            <li>${h}</li>`).join("\n")}
          </ul>
          <p>Approximate distance from the Longueuil lab: <strong>${c.en.distance}</strong>, ${c.en.drive} by car.</p>
        </section>

        <section class="page-card page-content">
          <h2>How a case from ${c.en.name} works</h2>
          <ol>
            <li><strong>You write to us.</strong> Online form, email, or call 438&nbsp;813&#8209;0592. Reply in under 24 hours.</li>
            <li><strong>You drop off the device.</strong> By appointment at the Longueuil lab, or shipped via secure courier with a pre-paid label.</li>
            <li><strong>Free assessment.</strong> We inspect the device in a controlled environment. No fees at this stage.</li>
            <li><strong>Firm price and turnaround.</strong> You get a written quote with exact price, turnaround, and odds of success. Then you decide.</li>
            <li><strong>Recovery and delivery.</strong> Data delivered on a new encrypted drive. If nothing is recovered, nothing is billed.</li>
          </ol>
        </section>

        <section class="page-card page-content">
          <h2>Real cases handled for ${c.en.name}</h2>
          <ul>
${c.en.cases.map(x => `            <li>${x}</li>`).join("\n")}
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
          <h2>Why ${c.en.name} chooses us</h2>
          <p>
            Our lab is unique: one examiner, one chain of custody, one point of contact from assessment to
            delivery. No intermediate counter, no ticket bouncing between departments. Direct access to a
            certified examiner (CFE) for cases that may eventually need to be presented as evidence in a
            Quebec court.
          </p>
        </section>
      </div>

      <div class="page-links">
        <a class="button button-primary" href="/en/#contact">Request a free assessment</a>
        <a class="button button-secondary" href="/en/tarifs-recuperation-donnees-montreal.html">See full pricing</a>
      </div>
    </div>
  </main>
  <footer class="site-footer">
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
  <script src="/assets/js/nexura-chat.js" defer></script>
</body>
</html>
`;

let count = 0;
for (const c of cities) {
  writeFileSync(join(root, `recuperation-donnees-${c.slug}.html`), buildFr(c), "utf8");
  writeFileSync(join(root, "en", `recuperation-donnees-${c.slug}.html`), buildEn(c), "utf8");
  count += 2;
}
console.log(`Generated ${count} city pages (${cities.length} cities × 2 languages).`);
