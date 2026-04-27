# PLAN 90 JOURS — NEXURADATA

> Date de départ : 2026-04-27. Revue obligatoire le 2026-07-27.
> **Règle d'or : on n'ajoute RIEN à ce plan avant le 2026-07-27.** Toute idée nouvelle va dans `IDEAS-PARKING.md` et attend la prochaine revue.

---

## OBJECTIF UNIQUE

**Atteindre 10 clients payants par mois, persona = particulier en panique (Rive-Sud + Montréal).**

> Pourquoi ce persona : 80 % du marché, cycle de vente court (jours, pas mois), AOV 200–800 $, ne demande pas de certifications longues à obtenir, déjà aligné avec la localisation Longueuil.

KPI unique suivi chaque lundi matin : **# de clients payants la semaine précédente.**

KPI secondaires (tableau de bord D1) :
- Visiteurs uniques / semaine
- Leads formulaire / semaine
- Appels reçus / semaine (compteur manuel ou Twilio si activé plus tard)
- Taux de conversion lead → client payant

---

## RÈGLES DE PILOTAGE — NON-NÉGOCIABLES

1. **Pas de pivot UX entre deux revues.** Toute version mise en prod reste minimum 14 jours avant d'être jugée.
2. **Pas de nouveau chantier technique** tant que le KPI unique n'a pas atteint la cible.
3. **Une seule chose en cours à la fois.** Pas de parallélisation.
4. **Toute décision UX doit citer un chiffre** (taux de clic, lead count, appel). Pas de « je sens que… ».
5. **Vendredi 16 h = revue hebdo de 30 min.** Si le KPI bouge pas pendant 2 semaines, on change de tactique — pas de stratégie.

---

## SEMAINE 1 (28 avril – 4 mai) — INSTRUMENTATION

**But : savoir ce qui se passe réellement.**

- [ ] Lundi : exporter les chiffres D1 actuels (30 derniers jours)
  - `tracking_events` par jour
  - `leads` total + par source
  - Top 20 event_type
- [ ] Mardi : créer `operations/dashboard-hebdo.md` rempli à la main chaque lundi avec les 4 KPI
- [ ] Mercredi : ajouter Google Search Console (vérifier que le site est indexé, top 20 requêtes)
- [ ] Jeudi : déployer le commit 4b8b650 (hero simplifié) en prod, l'oublier 14 jours
- [ ] Vendredi : appeler / WhatsApper les 5 derniers leads pour comprendre comment ils nous ont trouvés et leurs vrais mots
- [ ] Vendredi 16 h : revue hebdo, baseline figée

**Livrable** : `operations/baseline-2026-04-27.md` avec chiffres réels.

---

## SEMAINES 2–4 (5 – 25 mai) — ACQUISITION HORS SITE

**But : remplir le top du funnel. Le site ne change PAS.**

Choix stratégique : on ne touche plus au site pendant 3 semaines. On va chercher les leads.

- [ ] **Google Business Profile** : photos du local, 10 services bien décrits, demander 10 avis aux 10 derniers contacts (clients ou non)
- [ ] **Google Ads** : 200 $/mois, 3 mots-clés ultra-ciblés
  - « récupération données téléphone montréal »
  - « disque dur ne démarre plus »
  - « récupération données mac longueuil »
  - Landing = home actuelle (on mesure le baseline)
- [ ] **Partenariats locaux (cold outreach)** : 20 contacts en 3 semaines
  - 5 réparateurs Apple Authorized Rive-Sud + Montréal
  - 5 boutiques de réparation téléphone
  - 5 cabinets comptables (cible PME perte de fichier)
  - 5 IT consultants indépendants
  - Offre : 15 % de commission sur tout client référé
- [ ] **Annonces Kijiji / Marketplace** : 1 annonce / semaine en 3 quartiers (Longueuil, Brossard, Verdun)

**Livrable hebdo** : `operations/dashboard-hebdo.md` mis à jour chaque lundi.

---

## SEMAINE 5 (26 mai – 1er juin) — REVUE MI-PARCOURS

- [ ] Lundi : analyser 4 semaines de data
  - Quelle source apporte le plus de leads ?
  - Quel mot-clé Google Ads convertit ?
  - Combien de clients payants en cumul ?
- [ ] Décision **mesurée** :
  - Si Google Ads convertit → augmenter le budget
  - Si partenariats convertissent → en signer 10 de plus
  - Si Kijiji ne donne rien → arrêter
- [ ] **Pas de modification du site cette semaine.**

---

## SEMAINES 6–9 (2 – 29 juin) — OPTIMISATION DU CANAL GAGNANT

**But : doubler le canal qui marche, abandonner ceux qui ne marchent pas.**

- [ ] Doubler le budget du canal #1 identifié à la semaine 5
- [ ] Si le site est le bottleneck (CTR ads → site OK, mais site → lead form catastrophique), **alors et seulement alors** on retravaille le site avec UNE hypothèse mesurable
  - Ex : « j'ajoute un sélecteur d'appareil. Hypothèse : +30 % de leads form en 14 jours. »
  - Si non vérifié → rollback
- [ ] Aucun autre chantier (WhatsApp auto, Stripe, ops dashboard) **sauf si bloque un client payant cette semaine-là**

---

## SEMAINES 10–12 (30 juin – 27 juillet) — STABILISATION & REVUE 90 JOURS

- [ ] Mesurer le KPI unique : combien de clients payants/mois en moyenne sur les 12 semaines ?
- [ ] Identifier le canal d'acquisition principal (un seul, idéalement)
- [ ] Documenter le « playbook 1 client » : du premier contact au paiement
- [ ] **Revue 90 jours le 2026-07-27** :
  - Cible atteinte (10/mois) ? → on garde le persona, on industrialise
  - Cible ratée < 50 % ? → on revoit le persona ou le marché géographique
  - Cible ratée 50–80 % ? → on garde tout, on optimise 90 jours de plus

---

## CE QU'ON NE FAIT **PAS** (parking)

Toutes ces idées sont valides. Aucune n'avance avant le 2026-07-27 :

- ❌ Refonte hero supplémentaire
- ❌ Sélecteur d'appareil cliquable
- ❌ Segmentation 4 personas dans le hero
- ❌ Pages par ville (SEO long terme)
- ❌ Pages par appareil détaillées
- ❌ Stripe automation avancée
- ❌ Dashboard ops complet
- ❌ Refonte sticky bar
- ❌ Refonte header / nav
- ❌ Ajouter Telegram, Signal, autres canaux
- ❌ Version anglaise complète des landing pages secondaires
- ❌ Nouvelle vague de contenu blog

→ Tout va dans `IDEAS-PARKING.md` quand l'idée vient. On y revient au 2026-07-27.

---

## ENGAGEMENT DU FONDATEUR

Je m'engage à :
- Ouvrir VS Code **maximum 5 h / semaine** sur ce projet pendant 90 jours
- Le reste du temps : prospection, appels, partenariats, mesure
- Refuser toute idée qui n'est pas dans ce plan jusqu'au 2026-07-27
- Dire non à mes propres impulsions de pivot

---

## ENGAGEMENT DE L'AGENT (Copilot)

L'agent s'engage à :
- Refuser toute demande de modification UX/dev qui n'est pas dans ce plan
- Renvoyer toute nouvelle idée vers `IDEAS-PARKING.md`
- Demander systématiquement « quel chiffre justifie ça ? » avant de coder
- Tenir le `dashboard-hebdo.md` à jour si demandé

---

*Ce plan est verrouillé. Pour le modifier : revue 90 jours obligatoire le 2026-07-27.*
