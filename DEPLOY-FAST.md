# Mise en ligne rapide

## Option la plus rapide: Cloudflare Pages

1. Ouvrir `dash.cloudflare.com`.
2. Aller dans `Workers & Pages`.
3. Créer un projet `Pages`.
4. Choisir `Direct Upload` si vous voulez publier sans Git.
5. Envoyer tout le contenu du dossier `NEXURA`.
6. Vérifier que `index.html` est bien la page d'accueil.
7. Ajouter ensuite votre domaine personnalisé si vous utilisez `nexura.ca`.

## Option plus propre à long terme: Cloudflare Pages + Git

1. Mettre ce dossier dans un dépôt GitHub.
2. Dans Cloudflare Pages, choisir `Connect to Git`.
3. Sélectionner le dépôt.
4. Laisser le `Build command` vide pour ce site statique.
5. Utiliser la racine du dépôt comme source.
6. Déployer la branche de production.

## Juste après la mise en ligne

1. Tester `index.html`, `mentions-legales.html` et `politique-confidentialite.html`.
2. Vérifier que le domaine final correspond aux URL canoniques et au `sitemap.xml`.
3. Mettre à jour les vraies coordonnées, chiffres et certifications si nécessaire.
