# Google — Activation complète (Search Console, Business Profile, Analytics, Ads)

> Olivier ne peut pas faire ces étapes via un agent IA — Google exige une connexion humaine OAuth + 2FA.
> Ce dossier liste les actions exactes à faire toi-même, dans l'ordre, en moins de 60 minutes au total.

---

## 1. Google Search Console (10 min)

**But :** Que Google indexe le site rapidement et te montre les requêtes qui amènent les visiteurs.

### Étapes
1. Va à https://search.google.com/search-console
2. Connecte-toi avec **olivier@nexuradata.ca** (ou ton compte Google principal — tu pourras ajouter olivier@ comme propriétaire ensuite)
3. Clique **Ajouter une propriété** → choisis **Préfixe d'URL** → entre `https://nexuradata.ca/`
4. Méthode de validation recommandée : **Fichier HTML**
   - Google te donne un fichier nommé `google[HASH].html` (ex: `google1234abcd5678.html`)
   - **Télécharge-le et envoie-le à l'agent**, ou place-le toi-même à la racine du repo
   - L'agent fera : `git add google*.html` puis re-deploy
5. Clique **Vérifier** dans Search Console → ✅ vérifié
6. Soumets le sitemap : Sidebar → **Sitemaps** → entre `sitemap.xml` → **Soumettre**
7. Demande l'indexation manuelle des 5 pages prioritaires :
   - `/`
   - `/comment-nous-envoyer-vos-donnees.html`
   - `/tarifs-recuperation-donnees-montreal.html`
   - `/recuperation-donnees-montreal.html`
   - `/forensique-numerique-montreal.html`

### Alternative : validation par DNS TXT (plus permanente)
Si tu préfères ne pas avoir de fichier HTML traînant à la racine :
1. Choisis **Domaine** au lieu de **Préfixe d'URL**
2. Google te donne un enregistrement TXT du genre `google-site-verification=XXXXXXXX`
3. Va dans le panneau DNS de Cloudflare → **DNS** → **Add record**
4. Type : `TXT`, Name : `@`, Value : `google-site-verification=XXXXXXXX`
5. Clique **Vérifier** dans Search Console

---

## 2. Google Business Profile / GBP (15 min)

**But :** Apparaître dans Google Maps + Local Pack quand quelqu'un cherche « récupération données Montréal ».

### Choix d'adresse
- **Adresse de service :** UPS Store #447 (Longueuil J3Y 7G5) — ✅ déjà documentée dans `assets/data/business.json`
- ⚠️ **Risque :** Google peut refuser une adresse de UPS Store car c'est un PO Box virtuel. Si refus → tu devras inscrire ton **adresse résidentielle masquée** (catégorie « Service area business » sans afficher l'adresse).

### Étapes
1. Va à https://business.google.com
2. Connecte-toi avec **olivier@nexuradata.ca**
3. Clique **Ajouter une entreprise** → **Add a single business**
4. Nom : `NEXURADATA`
5. Catégorie principale : **Data recovery service**
6. Catégories secondaires : `Computer support and services`, `Computer repair service`
7. Adresse : `965 boulevard Désaulniers, suite 168, Longueuil QC J3Y 7G5`
8. Cocher : **I also serve customers at their locations** → Zones : Montréal, Longueuil, Brossard, Laval, Repentigny, Terrebonne (rayon 50 km)
9. Téléphone : `+1 438-813-0592`
10. Site web : `https://nexuradata.ca`
11. Validation : Google enverra une **carte postale** au UPS Store avec un code à 5 chiffres dans 5-14 jours. **Demande au UPS Store #447 de t'avertir dès qu'elle arrive.**

### Une fois validé
- Ajouter 10+ photos : laboratoire, équipement, logo, équipe, identifiants
- Activer **Messages** (les clients peuvent t'écrire directement)
- Activer **Booking** (lien vers `/reserver-creneau-laboratoire.html`)
- Heures : Lun-Ven 9h-18h, Sam 10h-15h
- Description : voir ci-dessous

**Description GBP (750 caractères max) :**
> Laboratoire de récupération de données et forensique numérique à Longueuil, desservant le Grand Montréal et le Québec. Récupération HDD, SSD, RAID, NAS, téléphones (iPhone, Android). Diagnostic gratuit, prix ferme avant intervention, étiquette Purolator pré-payée par nous. Si nous ne récupérons rien, vous ne payez rien. Conforme Loi 25. Bitcoin, Visa, Mastercard et Interac acceptés. Forensique numérique disponible pour cabinets d'avocats, comptables et entreprises. Réponse en moins de 24 heures. Réservez un créneau ou écrivez à contact@nexuradata.ca.

---

## 3. Google Analytics 4 (5 min)

**But :** Voir d'où viennent les visiteurs, ce qu'ils consultent, combien convertissent.

1. Va à https://analytics.google.com
2. **Admin** → **Create Property** → `NEXURADATA` → fuseau Montreal → CAD
3. **Web data stream** → URL `https://nexuradata.ca` → Stream name `nexuradata-web`
4. Copie le **Measurement ID** (format `G-XXXXXXXXXX`)
5. **Envoie l'ID à l'agent** — il l'ajoutera dans `index.html` + toutes les pages via le snippet gtag

### Conversions à créer (Admin → Events → Create event → Mark as conversion)
- `lead_submit` (déclenché par soumission formulaire)
- `phone_click` (déclenché par clic sur lien `tel:`)
- `shipping_intent` (déclenché par clic « Envoi & dépôt »)
- `appointment_booked` (déclenché par réservation créneau)

---

## 4. Google Ads (15 min — création compte seulement)

**But :** Préparer le compte. Le lancement vient ensuite (voir `operations/ads-launch-kit.md`).

1. Va à https://ads.google.com
2. Connecte-toi avec **olivier@nexuradata.ca**
3. Clique **Switch to expert mode** (ne pas suivre l'assistant débutant)
4. Crée un compte sans campagne pour l'instant
5. **Tools & Settings → Linked accounts → Link Google Analytics 4** → choisir la propriété créée à l'étape 3
6. **Tools & Settings → Linked accounts → Link Search Console** → choisir nexuradata.ca
7. **Conversions → Create conversion action → Import from Analytics** → importer les 4 conversions
8. **Billing → Add payment method** → Visa entreprise

### Méthode budget
- Compte payant à la facture mensuelle (pas pré-paiement)
- Limite mensuelle = 1500 $ pour démarrer (sécurité)

---

## 5. Google Merchant Center (optionnel — pour shopping local)

Tu as déjà un `merchant-feed.xml` à la racine. Si tu veux pousser tes services en Shopping Ads :
1. https://merchants.google.com → créer compte
2. Lier au GBP créé à l'étape 2
3. Soumettre le feed : `https://nexuradata.ca/merchant-feed.xml`

> ⚠️ Stripe + Google Shopping pour services demande approbation manuelle. À faire seulement après que GBP soit verifé.

---

## 6. Microsoft Bing Webmaster Tools (5 min — bonus)

Bing = ~5-10% du trafic recherche au Québec, et leur indexation est ultra rapide.
1. https://www.bing.com/webmasters
2. **Import from Google Search Console** (plus rapide) — autorise une fois et toutes les propriétés sont copiées
3. Soumets `sitemap.xml`

---

## 7. Ce que l'agent peut faire pour toi (sans OAuth)

Quand tu reviens avec :
- ✅ Le fichier `google[HASH].html` → l'agent l'ajoute au repo + commit + deploy
- ✅ Le Measurement ID GA4 (`G-XXXXXXXXXX`) → l'agent injecte le snippet gtag dans toutes les pages
- ✅ Le Pixel ID Meta (`123456789012345`) → l'agent injecte le pixel
- ✅ Le LinkedIn Insight Tag ID → l'agent injecte le tag
- ✅ Les 4 codes de conversion Google Ads → l'agent les attache aux événements clés

---

## 8. Checklist finale (à cocher au fur et à mesure)

- [ ] Search Console : propriété ajoutée + sitemap soumis + 5 URLs prioritaires demandées
- [ ] Google Business Profile : créé + carte postale en route
- [ ] GA4 : propriété créée + ID transmis à l'agent
- [ ] Google Ads : compte créé + lié à GA4 et Search Console + paiement ajouté
- [ ] Bing Webmaster : importé depuis GSC
- [ ] Pixel Meta : compte business créé + ID transmis
- [ ] LinkedIn Insight Tag : compte ads créé + ID transmis
- [ ] Photos pro du labo : 10+ photos prêtes pour GBP
- [ ] Première campagne Google Ads lancée (suivre `operations/ads-launch-kit.md`)

---

**Dernière mise à jour :** 2026-04-27
**Responsable :** Olivier — olivier@nexuradata.ca
