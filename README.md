# NEXURADATA

Site vitrine statique pour un laboratoire de recuperation de donnees et forensique numerique.

## Structure

- `index.html`: page d'accueil principale
- `mentions-legales.html`: page legale de base
- `politique-confidentialite.html`: page de confidentialite de base
- `assets/css/site.css`: styles partages
- `assets/js/site.js`: interactions progressives et non bloquantes

## Avant mise en ligne

1. Confirmer le nom legal exact de l'entreprise.
2. Valider toutes les certifications, statistiques et claims marketing.
3. Remplacer les coordonnees de demonstration si necessaire.
4. Mettre a jour `sitemap.xml`, `robots.txt` et les URL canoniques si le domaine final differe de `https://nexuradata.pages.dev/`.

## Mise en ligne

Le site etant statique, il peut etre heberge sur toute plateforme compatible HTML/CSS/JS statique:

- Cloudflare Pages
- Cloudflare Workers Static Assets
- GitHub Pages
- Netlify

Pour Cloudflare, le choix recommande pour ce depot est `GitHub + Cloudflare Pages`. Le depot contient aussi des scripts `Wrangler` si vous voulez garder une voie CLI en parallele.

- le site est purement statique
- `release-cloudflare/` est un dossier de publication genere automatiquement
- `main` sert de branche de production et `staging` peut servir de branche de previsualisation
- le site profite nativement des fichiers `_headers` et `_redirects`
- `package.json` declare le nom du projet Pages pour les commandes CLI

Le point d'entree a publier sur Cloudflare est `release-cloudflare/`.

## Cloudflare Pages avec GitHub

1. Connecter le repo GitHub a Cloudflare Pages.
2. Choisir `main` comme branche de production.
3. Utiliser `.` comme root directory.
4. Utiliser `npm run build` comme build command.
5. Utiliser `release-cloudflare` comme build output directory.
6. Utiliser `staging` comme branche de preview si vous voulez un environnement de previsualisation dedie.
7. Ajouter ensuite le domaine personnalise.

## Cloudflare Pages avec Wrangler

1. Installer Node.js puis npm.
2. Depuis la racine du depot, lancer `npm install`.
3. Verifier l'authentification Cloudflare avec `npm run cf:whoami`.
4. Generer le dossier de publication avec `npm run build`.
5. Creer le projet Pages avec `npm run cf:pages:project:create` si necessaire.
6. Verifier l'acces au projet Pages avec `npm run cf:check`.
7. Deployer la production avec `npm run cf:deploy`.
8. Deployer la previsualisation avec `npm run cf:deploy:staging`.

`release-cloudflare/` est regenere automatiquement pendant les commandes de build puis envoye vers Pages. La branche `main` correspond a la production et la branche `staging` fournit un environnement de previsualisation distinct.

## Option sans Wrangler

Si vous voulez eviter Wrangler, vous pouvez utiliser `Cloudflare Pages` en `Direct Upload` avec le dossier `release-cloudflare/` apres l'avoir genere localement via `npm run build`. Sans Node.js, cette generation locale n'est pas disponible sur cette machine.
