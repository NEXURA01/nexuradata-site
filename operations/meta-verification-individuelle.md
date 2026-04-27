# Vérification Meta — chemin individuel (sans REQ)

> Statut: NEXURADATA opère comme **entreprise individuelle non immatriculée**
> (Olivier Blanchet faisant affaire sous le nom commercial NEXURADATA).
> Aucune obligation REQ tant que les revenus restent symboliques.

## Ce que tu fais MAINTENANT dans Meta

### 1. Annule la vérification "Entreprise"

Dans la modale qui demande un document fiscal :

- clique **Précédent** jusqu'à sortir du flux entreprise
- ou ferme la modale, ne téléverse rien

### 2. Bascule en vérification "Personne / Particulier"

- Meta Business Suite → **Paramètres** → **Centre de comptes** → **Identité**
- Choisis **"Vérifier votre identité personnelle"** (pas "vérifier l'entreprise")
- Téléverse :
  - **Permis de conduire QC** (recto-verso, photo nette, fond uni)
  - OU **Passeport canadien** (page photo)
- Validation auto en 5–30 minutes

### 3. Crée le compte publicitaire au nom NEXURADATA

- Dans **Comptes publicitaires** → Créer
- **Nom du compte** : `NEXURADATA - Récupération de données`
- **Pays** : Canada
- **Devise** : CAD
- **Fuseau** : America/Toronto
- **Type d'entreprise** : "Particulier" (si demandé)

Les pubs apparaîtront avec **NEXURADATA** comme annonceur (nom de la Page Facebook), pas ton nom personnel. Le nom personnel sert uniquement à Meta pour la vérification.

### 4. Vérifie le domaine nexuradata.ca

- **Paramètres entreprise** → **Sécurité de la marque** → **Domaines** → Ajouter `nexuradata.ca`
- Méthode **balise meta** : Meta te donne un `<meta name="facebook-domain-verification" content="xxxx">`
- Donne-moi cette valeur, je l'ajoute dans le `<head>` de l'index FR + EN en 30 secondes

### 5. Connecte WhatsApp Business

- Plus besoin de vérification fiscale en mode test
- WhatsApp Cloud API gratuit jusqu'à 1000 conversations/mois
- Ton numéro test Meta marche immédiatement

## Plafonds en vérification individuelle

- Dépenses pub : **OK** (pas de plafond technique)
- WhatsApp Cloud API : **1000 conversations/mois gratuites** (largement suffisant pour démarrer)
- Pixel + Conversions API : **OK**
- Catalogue produits : **OK**
- Click-to-WhatsApp ads : **OK**

Ce que tu n'auras PAS sans REQ :

- "Verified business" badge bleu (peu important pour récup données)
- Certains crédits pub Meta réservés aux entreprises vérifiées

## Quand passer au REQ

Déclencheurs honnêtes :

- 1er client encaissé > 500 $
- Premier client B2B (entreprise) qui demande facture officielle
- Total annuel projeté > 30 000 $ (seuil TPS/TVQ)
- Demande d'ouverture compte bancaire pro

Quand l'un arrive : 39 $ + 10 min sur registreentreprises.gouv.qc.ca, NEQ en 1–2 jours, et on fait passer Meta de "individuel" à "entreprise" en 1 clic.

## Côté NEXURADATA

- Lettre d'attestation à jour : `/operations/attestation-entreprise.html`
- Schema.org du site : reste en `LocalBusiness` (légitime même sans NEQ)
- Mentions légales / Politique conf : déjà conformes Loi 25
- Factures Stripe : émises au nom **NEXURADATA**, mention "Olivier Blanchet, entreprise individuelle" en bas
