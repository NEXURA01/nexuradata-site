# NEXURADATA — Registration kit (annuaires & profils publics)

> Dossier prêt-à-coller pour inscrire NEXURADATA dans les 15 plateformes
> prioritaires pour la récupération de données à Montréal / Rive-Sud.
>
> ⚠️ **À compléter avant inscription :**
>
> - ✅ **Holding (entité légale propriétaire) : `Groupe Investissements B&C inc.`**
> - ✅ **Marque commerciale exploitée par le holding : `NEXURADATA`**
> - ✅ **NEQ (du holding) : `1172436702`** — NEXURADATA opère sous ce NEQ comme nom commercial / DBA
> - ✅ **Forme juridique du holding :** Société par actions (QC, _Loi sur les sociétés par actions_)
> - ✅ **Date de constitution :** 2017-01-10
> - ✅ **Adresse légale du holding (REQ) :** 50 ch. Rabastalière Est, app. 214, Saint-Bruno-de-Montarville (Québec) J3V 2A5, Canada
>
> 🚨 **Divergence NAP à résoudre avant les inscriptions :** le site et le JSON-LD
> (`assets/data/business.json`, footer, mentions légales) indiquent **Longueuil**.
> L'adresse légale au REQ est **Saint-Bruno-de-Montarville**. Choisir une seule
> ville et l'utiliser partout (site + annuaires + Google Business). Voir § 9.
>
> 🚨 **Vérifier au REQ que `NEXURADATA` est déclaré comme « autre nom utilisé au
> Québec » sous le NEQ 1172436702.** Au Québec, exploiter une entreprise sous un
> nom autre que sa raison sociale exige une déclaration au REQ (frais ~36 $).
> Sans cette déclaration, facturer ou contracter sous « NEXURADATA » est
> techniquement non conforme. À faire via Mon bureau au Registraire des
> entreprises avant de signer tout contrat ou ouvrir un compte Stripe.

---

## 1. NAP canonique — copier-coller à l'identique partout

Cohérence NAP (Name / Address / Phone) = facteur SEO local n°1. Toujours
utiliser ces formats exacts :

| Champ | Valeur |
|---|---|
| Holding (entité légale) | **Groupe Investissements B&C inc.** |
| Marque commerciale (DBA) | **NEXURADATA** |
| NEQ (du holding) | **1172436702** |
| Forme juridique | Société par actions (QC) — constituée 2017-01-10 |
| Catégorie principale | Récupération de données / Data recovery service |
| Catégories secondaires | Forensique numérique, Service informatique, Sécurité informatique |
| Adresse légale (REQ) | 50 ch. Rabastalière Est, app. 214, Saint-Bruno-de-Montarville (QC) J3V 2A5 |
| Adresse publique (établissement) | **5184, boul. Cousineau, Longueuil (QC) J3Y 7G5** — UPS Store #447 |
| Téléphone | **+1 438-813-0592** |
| Courriel public | **<contact@nexuradata.ca>** |
| Site web | **<https://nexuradata.ca/>** |
| Site EN | **<https://nexuradata.ca/en/>** |
| Logo (PNG) | <https://nexuradata.ca/assets/icons/og-default.png> |
| Logo (SVG) | <https://nexuradata.ca/assets/nexuradata-master.svg> |
| Heures | _(à confirmer — suggéré : Lun–Ven 9h–17h, urgences 24/7)_ |
| Zone desservie | Montréal, Laval, Longueuil, Rive-Sud, Rive-Nord, Québec |
| Langues | Français, Anglais |
| Paiements | Visa, Mastercard, Interac, virement bancaire |
| Devise | CAD |
| Fourchette de prix | $$ |

> **Règle nom légal vs nom commercial :**
>
> - Champs **public-facing** (nom affiché, profil, marketing, logo) → utiliser **NEXURADATA**.
> - Champs **légaux / facturation / fiscaux / vérification / banques / Stripe / contrats** → utiliser **Groupe Investissements B&C inc.** + NEQ **1172436702**.
> - Si le formulaire offre un champ séparé « DBA » / « Doing business as » / « nom commercial », mettre **NEXURADATA** dans ce champ et **Groupe Investissements B&C inc.** dans « Legal entity name ».
> - Stripe Connect / paiements : compte ouvert au nom du **holding** (KYC sur le NEQ), `statement_descriptor: "NEXURADATA"` pour ce que les clients voient sur leur relevé.
> - Marque de commerce : si tu veux protéger NEXURADATA, déposer au **CIPO** (Office de la propriété intellectuelle du Canada) au nom du holding.

---

## 2. Descriptions prêtes-à-coller

### FR — court (160 caractères, pour Twitter/X bio, Instagram, Facebook tagline)
>
> Récupération de données et forensique numérique à Montréal et Rive-Sud. Disques durs, SSD, RAID, téléphones. Diagnostic gratuit. 438-813-0592.

### FR — moyen (300 caractères, pour Google Business, Yelp)
>
> NEXURADATA est un laboratoire de récupération de données et de forensique numérique basé à Longueuil, au service du Grand Montréal. Disques durs, SSD, RAID, téléphones, ransomware. Diagnostic gratuit, devis avant intervention, tarification transparente. Service bilingue FR/EN.

### FR — long (750 caractères, pour Pages Jaunes, annuaires détaillés)
>
> NEXURADATA est un laboratoire montréalais spécialisé en récupération de données et en forensique numérique. Notre équipe intervient sur disques durs mécaniques, SSD, NVMe, configurations RAID/NAS, téléphones intelligents, et incidents de chiffrement (ransomware). Nous offrons un diagnostic gratuit, un devis ferme avant toute intervention, une chaîne de possession documentée pour les dossiers légaux et corporatifs, et un service bilingue (français / anglais). Zones desservies : Montréal, Laval, Longueuil, Rive-Sud, Rive-Nord, Québec. Réception sécurisée à Longueuil. Conformité Loi 25 du Québec. Téléphone : 438-813-0592.

### EN — court
>
> Data recovery and digital forensics in Montreal and the South Shore. Hard drives, SSDs, RAID, phones. Free diagnostic. 438-813-0592.

### EN — medium
>
> NEXURADATA is a data recovery and digital forensics lab based in Longueuil, serving Greater Montreal. Hard drives, SSDs, RAID, smartphones, ransomware response. Free diagnostic, firm quote before any intervention, transparent pricing. Bilingual EN/FR service.

### EN — long
>
> NEXURADATA is a Montreal-area data recovery and digital forensics lab. We work on mechanical hard drives, SSDs, NVMe, RAID and NAS configurations, smartphones, and ransomware incidents. We provide a free diagnostic, a firm quote before any intervention, documented chain of custody for legal and corporate cases, and full bilingual service (English / French). Service areas: Montreal, Laval, Longueuil, South Shore, North Shore, Quebec City. Secure intake at our Longueuil location. Quebec Law 25 compliant. Phone: 438-813-0592.

---

## 3. Top 15 plateformes prioritaires — ordre d'exécution

### 🥇 Tier 1 — impact SEO local immédiat (faire en premier)

| # | Plateforme | URL inscription | Notes |
|---|---|---|---|
| 1 | **Google Business Profile** | <https://business.google.com/> | ✅ Déjà créé. Vérifier : photos, posts hebdo, FAQ, services, zones desservies. Activer messagerie. |
| 2 | **Bing Places for Business** | <https://www.bingplaces.com/> | Importer depuis Google Business (1 clic). 5 % du trafic recherche. |
| 3 | **Apple Business Connect** | <https://businessconnect.apple.com/> | Apparaît dans Apple Maps, Siri, Spotlight. Gratuit. |
| 4 | **Pages Jaunes Canada** | <https://www.pagesjaunes.ca/ajouter-une-entreprise> | Référence forte au Québec. Profil gratuit. |
| 5 | **Yelp Canada** | <https://biz.yelp.ca/> | Important pour avis. Catégorie : « IT Services & Computer Repair ». |

### 🥈 Tier 2 — couverture annuaires généralistes (semaine 2)

| # | Plateforme | URL inscription | Notes |
|---|---|---|---|
| 6 | **411.ca** | <https://411.ca/business/add> | Annuaire canadien historique. |
| 7 | **Cylex Canada** | <https://www.cylex-canada.ca/> | Bon backlink, indexé. |
| 8 | **Yellow Pages (yellowpages.ca)** | <https://www.yellowpages.ca/sign-up> | Distinct de pagesjaunes.ca. |
| 9 | **Foursquare for Business** | <https://business.foursquare.com/> | Alimente Uber, Snapchat, Twitter, etc. |
| 10 | **Better Business Bureau (BBB)** | <https://www.bbb.org/ca/get-accredited> | Crédibilité B2B. Compte gratuit, accréditation payante (à évaluer plus tard). |

### 🥉 Tier 3 — verticales tech / spécialisées (semaine 3-4)

| # | Plateforme | URL inscription | Notes |
|---|---|---|---|
| 11 | **Clutch.co** | <https://clutch.co/get-listed> | Profil B2B services tech. Demande études de cas. |
| 12 | **Goodfirms** | <https://www.goodfirms.co/get-listed> | Similaire à Clutch. |
| 13 | **TrustPilot** | <https://business.trustpilot.com/signup> | Avis clients indépendants. |
| 14 | **LinkedIn Company Page** | <https://www.linkedin.com/company/setup/new/> | Crédibilité B2B + recrutement. Lier le profil perso d'Olivier. |
| 15 | **Registre des entreprises du Québec — vérifier que le profil public est à jour** | <https://www.registreentreprises.gouv.qc.ca/> | Pas une « inscription » mais à vérifier annuellement (NEQ, dirigeants, adresse). |

### Bonus utiles (si temps)

- **Chambre de commerce de la Rive-Sud** (membership payant, networking) — <https://www.cclrs.ca/>
- **Reddit /r/montreal** (poste honnête présentation, pas de spam) — pas une inscription mais bon pour découverte
- **Annuaires sectoriels forensique** : pas vraiment de directory pertinent au Québec, LinkedIn fait le job

---

## 4. Catégories à sélectionner (cohérence cross-platform)

| Plateforme | Catégorie principale | Catégories secondaires |
|---|---|---|
| Google Business | **Service de récupération de données** | Service informatique, Réparation d'ordinateurs |
| Yelp | **IT Services & Computer Repair** | Data Recovery, Computer Repair |
| Pages Jaunes | **Récupération de données informatiques** | Services informatiques, Sécurité informatique |
| Bing Places | **Computer Service & Repair** | Data Recovery |
| Apple Business Connect | **Computer Repair** | (limité) |
| Cylex | **Récupération de données** | Informatique, Sécurité |

---

## 5. Photos / médias à téléverser (préparer avant inscription)

Suggéré pour chaque profil acceptant photos :

- [ ] Logo carré (512×512 PNG) — `assets/icons/og-default.png` _(si dispo en carré)_
- [ ] Logo bannière (1200×630) — `assets/icons/og-default.png`
- [ ] 1 photo "lab" (poste de travail, environnement contrôlé)
- [ ] 1 photo "réception sécurisée" (vue extérieure ou comptoir, neutre)
- [ ] 1 photo équipement (écran avec outil de récupération)
- [ ] 1 photo Olivier en blouse / uniforme (humanise la marque)

**Action séparée à faire** : préparer un dossier `marketing/registration-photos/` avec ces 5-6 photos en haute résolution.

---

## 6. Sécurité & cohérence

- **Email d'inscription** : utilise `admin@nexuradata.ca` (pas `contact@`) pour gérer les comptes — sépare admin / public.
- **2FA** : active sur Google Business, LinkedIn, Trustpilot, BBB en priorité.
- **Mot de passe** : un par site, gestionnaire (1Password, Bitwarden, ou KeePass).
- **Vérification téléphone** : la plupart envoient un appel/SMS au 438-813-0592 — assure-toi de pouvoir répondre lors de l'inscription.
- **Vérification adresse** : Google Business et BBB envoient une carte postale (5-14 jours). À planifier.

---

## 7. Suivi — cocher au fur et à mesure

```
[x] Google Business Profile (déjà fait — à auditer)
[ ] Bing Places for Business
[ ] Apple Business Connect
[ ] Pages Jaunes
[ ] Yelp Canada
[ ] 411.ca
[ ] Cylex Canada
[ ] Yellow Pages (yellowpages.ca)
[ ] Foursquare
[ ] BBB Canada
[ ] Clutch.co
[ ] Goodfirms
[ ] TrustPilot
[ ] LinkedIn Company Page
[ ] Registre des entreprises du Québec — audit annuel
```

---

## 8. Après inscription — gagner du jus SEO

1. **Demander des avis** : envoyer aux 5-10 premiers clients un lien direct vers Google + Yelp pour avis. Cible : 10 avis Google avant fin du trimestre.
2. **Backlinks naturels** : annoncer sur LinkedIn perso, partager sur réseaux pros, demander aux fournisseurs (Geek Squad partenaires, etc.) un lien.
3. **Schema.org** : déjà en place sur le site (`assets/data/business.json`). ✅
4. **Cohérence NAP** : si tu changes téléphone/adresse, **mets à jour partout simultanément** (1-2 jours max). Désynchronisation = pénalité Google.

---

## 9. Stratégie d'adresse — DÉCISION : Bureau virtuel / case postale à Longueuil

**Décision arrêtée (Option B) :** louer un bureau virtuel ou une case postale
commerciale à **Longueuil**, l'utiliser comme adresse publique unique partout
(site, annuaires, Google Business, REQ, WHOIS), et **ne plus exposer** le
214-50 ch. Rabastalière (résidence privée).

### Rationale

- Garde le positionnement marketing « Rive-Sud / Grand Montréal » déjà déployé
  dans tout le site et le JSON-LD.
- Une seule adresse partout = NAP cohérent (facteur SEO local n°1).
- Protège la vie privée du dirigeant.
- Coût modeste (30-90 $/mois) déductible 100 % comme dépense d'affaires.

### Fournisseurs recommandés à Longueuil (à comparer)

| Fournisseur | Type | Coût indicatif/mois | Notes |
|---|---|---|---|
| **Regus — Place Longueuil** | Bureau virtuel + adresse + courrier | ~75-150 $ | Adresse prestigieuse, salles réunion à la carte |
| **Stallion Workspace (Brossard)** | Bureau virtuel + réception courrier | ~50-90 $ | Rive-Sud, plus abordable |
| **Bureau virtuel Quebec / iWorld** | Adresse + courrier scanné | ~30-60 $ | Le moins cher, suffit pour annuaires |
| **UPS Store (succursale Longueuil)** | Case postale commerciale (pas une C.P. Postes Canada) | ~25-40 $ | Adresse de rue (pas « C.P. xxx »), accepte colis privés (UPS, FedEx, Purolator) |
| **Postes Canada — Case postale Longueuil** | C.P. classique | ~15-25 $ | ⚠️ Format `C.P. 1234, Longueuil` — Google Business **refuse** les C.P. Postes Canada |

**🥇 Recommandation : UPS Store Longueuil.** Adresse de rue valide pour Google
Business, accepte **tous les transporteurs** (critique pour réception de
disques durs envoyés par clients), coût bas, signature à la livraison
disponible.

### Checklist d'exécution (à faire après ouverture du bureau virtuel)

```
[ ] 1. Souscrire au service, obtenir l'adresse exacte (numéro, rue, suite, code postal)
[ ] 2. Mettre à jour assets/data/business.json (FR + EN) — addressLocality: "Longueuil" déjà OK, mettre streetAddress, postalCode
[ ] 3. Vérifier mentions-legales.html (FR + EN) — adresse de l'établissement
[ ] 4. Vérifier politique-confidentialite.html (FR + EN) — adresse responsable Loi 25
[ ] 5. Vérifier footer / page de contact si adresse y figure
[ ] 6. Mettre à jour conditions-intervention-paiement.html si adresse de réception y figure
[ ] 7. npm run build + deploy Cloudflare Pages
[ ] 8. Déclaration de mise à jour au REQ (changer le domicile vers la nouvelle adresse) — frais ~37 $
[ ] 9. Google Business Profile — édition adresse + (re)vérification carte postale
[ ] 10. Bing Places, Apple Business Connect — édition adresse
[ ] 11. WHOIS / registrar du domaine nexuradata.ca — adresse contact
[ ] 12. Stripe Dashboard — adresse business
[ ] 13. Compte bancaire d'affaires — mise à jour adresse de correspondance
[ ] 14. Toutes les inscriptions Tier 2/3 du § 7 utilisent directement la nouvelle adresse
```

### Format NAP final (à utiliser partout après décision)

```
NEXURADATA
5184, boulevard Cousineau
Longueuil (Québec)  J3Y 7G5
Canada

Tél : +1 438-813-0592
Courriel : contact@nexuradata.ca
Site : https://nexuradata.ca/
```

> ⚠️ **PMB / numéro de boîte UPS Store à obtenir lors de la souscription.**
> Une fois attribué, format final : `5184, boul. Cousineau, PMB [###], Longueuil (Québec) J3Y 7G5`.
> Re-propager partout (script `scripts/update-address.mjs` réutilisable).

**UPS Store contact (succursale 447) :** (450) 812-7877 · <store447@theupsstore.ca>
