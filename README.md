# NEXURA DATA — Montréal

**Laboratoire indépendant de récupération de données et de forensique numérique à Montréal.**  
Longueuil · 1 station de métro de Montréal · Bilingue FR/EN · Certifié CFE · Ouvert 7 jours sur 7
**Laboratoire indépendant de récupération de données et de forensique numérique.**  
Basé à Longueuil, à une station de métro de Montréal.  
Bilingue FR/EN · Certifié CFE · Ouvert 7 jours sur 7.

Récupération de données sur disques durs, SSD, RAID, NAS, téléphones et médias critiques.  
Forensique numérique certifiée pour incidents, litiges et mandats légaux.  
Rapports structurés admissibles devant les tribunaux fédéraux et provinciaux du Québec.

[![Site web](https://img.shields.io/badge/nexuradata.ca-en%20ligne-black?style=flat-square)](https://nexuradata.ca)
[![Cloudflare Pages](https://img.shields.io/badge/Cloudflare-Pages-orange?style=flat-square&logo=cloudflare)](https://pages.cloudflare.com)
[![Tests](https://img.shields.io/badge/tests-vitest-green?style=flat-square)](https://vitest.dev)

---

## À propos

NEXURA DATA est un laboratoire spécialisé en **récupération de données** et **forensique numérique**, établi à Longueuil, à une station de métro du centre-ville de Montréal. Le laboratoire dessert Montréal, Laval, la Rive-Sud et l'ensemble du Grand Québec.

- 🔬 Certifié **CFE** (Certified Forensic Examiner)
- 🗣️ Service bilingue **français / anglais**
- 📅 Disponible **7 jours sur 7**, urgences incluses
- ⚖️ Rapports structurés admissibles devant les tribunaux fédéraux et provinciaux
- 🔒 Chaîne de custody rigoureuse pour mandats légaux et litiges

Ce dépôt couvre l'intégralité de la plateforme : site public bilingue, portail client, console opérateur interne, API Cloudflare Functions, base de données D1, intégration Stripe et Resend.

---

## Services

| Catégorie | Services |
|-----------|----------|
| 💾 Récupération de données | Disques durs (HDD), SSD, RAID, NAS, clés USB, cartes mémoire |
| 📱 Récupération mobile | Téléphones iOS et Android, données supprimées |
| 🔍 Forensique numérique | Analyse d'appareils, récupération de preuves numériques |
| ⚖️ Mandats légaux | Expertise judiciaire, rapport admissible en cour, chaîne de custody |
| 🏢 Entreprises | Plans de résilience, urgences RAID/NAS, mandats corporatifs |
| 📍 Zones desservies | Montréal, Longueuil, Laval, Brossard, Repentigny, Terrebonne |

---

## Stack technique

| Composant | Technologie |
|-----------|-------------|
| Hébergement | [Cloudflare Pages](https://pages.cloudflare.com) |
| Backend / API | Cloudflare Pages Functions (JavaScript ESM) |
| Base de données | Cloudflare D1 (SQLite géré) |
| Paiements | [Stripe](https://stripe.com) — Checkout + Webhook |
| Emails transactionnels | [Resend](https://resend.com) |
| Tests | [Vitest](https://vitest.dev) |
| Configuration | `wrangler.jsonc` — source de vérité unique |

---

## Structure du dépôt

```
nexuradata-site/
├── index.html                        # Page d'accueil FR
├── 404.html                          # Page d'erreur personnalisée
├── en/index.html                     # Page d'accueil EN
│
├── pages/
│   ├── services/                     # 19 pages services (FR)
│   │   ├── recuperation-donnees-montreal.html
│   │   ├── recuperation-raid-ssd-montreal.html
│   │   ├── recuperation-telephone-montreal.html
│   │   ├── forensique-numerique-montreal.html
│   │   ├── mandats-entreprise.html
│   │   ├── tarifs-recuperation-donnees-montreal.html
│   │   └── ...
│   ├── zones/                        # 5 pages villes (FR)
│   │   ├── recuperation-donnees-longueuil.html
│   │   ├── recuperation-donnees-laval.html
│   │   ├── recuperation-donnees-brossard.html
│   │   └── ...
│   ├── legal/                        # 3 pages légales (FR)
│   │   ├── mentions-legales.html
│   │   ├── politique-confidentialite.html
│   │   └── conditions-intervention-paiement.html
│   └── paiement/                     # 2 pages paiement (FR)
│       ├── paiement-reussi.html
│       └── paiement-annule.html
│
├── en/pages/                         # Miroir EN de toutes les pages FR
│
├── dossier/                          # Portail client — suivi de dossier
├── operations/                       # Console interne opérateur (protégée)
│
├── functions/api/
│   ├── intake.js                     # Ouverture de dossier client
│   ├── status.js                     # Suivi dossier (numéro + code)
│   ├── chat.js                       # Chat en direct
│   ├── newsletter.js                 # Inscription à l'infolettre
│   ├── track.js                      # Tracking analytique interne
│   ├── stripe-webhook.js             # Webhook Stripe (paiements)
│   ├── checkout/                     # Sessions de paiement Stripe
│   ├── appointments/                 # Réservation de créneaux
│   ├── btc/                          # Paiement Bitcoin
│   ├── leads/                        # Gestion des leads entrants
│   └── ops/                          # Actions opérateur internes
│       ├── cases.js                  # Recherche et gestion de dossiers
│       └── ...
│
├── functions/_lib/                   # Logique partagée (D1, email, auth)
│
├── assets/
│   ├── css/site.css                  # Styles partagés
│   └── js/site.js                    # Interactions publiques
│
├── migrations/                       # Migrations schéma D1
│   ├── 0001_launch.sql
│   ├── 0002_case_payments.sql
│   ├── 0003_ops_expansion.sql
│   └── ...
│
├── tests/                            # Suite de tests Vitest
├── sitemap.xml                       # Sitemap SEO
├── _redirects                        # 58+ redirections 301 SEO
├── _headers                          # En-têtes sécurité Cloudflare
├── wrangler.jsonc                    # Config Cloudflare Pages/Functions
└── .dev.vars.example                 # Variables locales (à copier en .dev.vars)
```

> ⚠️ **Ne jamais modifier `release-cloudflare/` directement** — ce dossier est régénéré automatiquement à chaque `npm run build`. Toujours éditer les fichiers sources à la racine.

---

## Prérequis de lancement

1. **D1** — Remplacer les IDs placeholder dans `wrangler.jsonc` avec les vrais IDs de base Cloudflare D1.
2. **Secrets** — Créer un secret fort `ACCESS_CODE_SECRET` via `wrangler secret put`.
3. **Email Routing** — Configurer les alias `contact@`, `urgence@`, `dossiers@` dans Cloudflare Email Routing.
4. **Resend** — Vérifier le domaine d'envoi et fournir `RESEND_API_KEY` comme secret Cloudflare.
5. **Stripe** — Configurer `STRIPE_SECRET_KEY` et `STRIPE_WEBHOOK_SECRET` comme secrets Cloudflare.
6. **Cloudflare Access** — Protéger `/operations/*` et `/api/ops/*` avec une politique Zero Trust.

📋 Le runbook complet est dans [`LAUNCH-RUNBOOK.md`](./LAUNCH-RUNBOOK.md).  
🚀 Déploiement rapide : voir [`DEPLOY-FAST.md`](./DEPLOY-FAST.md).

---

## Commandes

| Commande | Description |
|----------|-------------|
| `npm install` | Installer les dépendances |
| `npm run build` | Régénérer `release-cloudflare/` (assets statiques) |
| `npm test` | Lancer la suite de tests Vitest |
| `npm run cf:dev` | Serveur local avec Pages Functions et D1 |
| `npm run cf:whoami` | Vérifier l'authentification Wrangler |
| `npm run cf:check` | Build + vérification Cloudflare Pages |
| `npm run cf:d1:migrate:local` | Appliquer les migrations D1 en local |
| `npm run cf:d1:migrate:remote` | Appliquer les migrations D1 en production |
| `npm run cf:deploy` | Déployer en production |
| `npm run cf:deploy:staging` | Déployer en staging (preview) |

---

## Déploiement Cloudflare Pages

1. Connecter ce dépôt GitHub à un projet Cloudflare Pages.
2. Définir le **répertoire racine** sur `.` (racine du dépôt).
3. Définir la **commande de build** sur `npm run build`.
4. Définir le **répertoire de sortie** sur `release-cloudflare`.
5. Laisser `main` comme branche de production.
6. Utiliser une branche `staging` pour les déploiements de prévisualisation.
7. Ajouter tous les secrets (`STRIPE_SECRET_KEY`, `RESEND_API_KEY`, etc.) dans les paramètres du projet Cloudflare Pages.
8. Une fois `wrangler.jsonc` configuré avec les vrais bindings D1, ce fichier fait office de **source de vérité unique**.

---

## Liens utiles

| Ressource | URL |
|-----------|-----|
| 🌐 Site web | [nexuradata.ca](https://nexuradata.ca) |
| 📧 Contact | [contact@nexuradata.ca](mailto:contact@nexuradata.ca) |
| 🆘 Urgence | [urgence@nexuradata.ca](mailto:urgence@nexuradata.ca) |
| 📋 Runbook de lancement | [`LAUNCH-RUNBOOK.md`](./LAUNCH-RUNBOOK.md) |
| ✅ Checklist de lancement | [`LAUNCH-CHECKLIST.md`](./LAUNCH-CHECKLIST.md) |
| 🔒 Politique de sécurité | [`SECURITY.md`](./SECURITY.md) |
