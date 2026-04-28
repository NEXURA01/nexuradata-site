# Google APIs — chemin d'automatisation complet

> **TL;DR** : 15 min de setup humain (login + OAuth + GBP claim), puis TOUT est automatisable.

## Étape humaine obligatoire (1 fois, ~15 min)

### 1. Réclamer la fiche Google Business Profile (5 min)
1. <https://business.google.com> → connexion avec admin@nexuradata.ca
2. Add business → "NEXURADATA"
3. Adresse : 1100 rue Coteau-Rouge, Longueuil J4K 1W6
4. Catégorie principale : **Data recovery service**
5. Téléphone : 438-813-0592
6. Vérification : par **vidéo selfie** de l'enseigne / poste de travail (plus rapide que carte postale)
7. Une fois vérifié, va dans **Settings → Managers** et note l'**Account ID** + **Location ID** (format `accounts/X/locations/Y`)

### 2. Créer un projet Google Cloud + OAuth (5 min)
1. <https://console.cloud.google.com> → créer projet **nexuradata-ops**
2. **APIs & Services → Library** → activer :
   - Google Search Console API
   - My Business Business Information API
   - My Business Account Management API
   - Google Analytics Data API (optionnel)
3. **OAuth consent screen** → External, app name **NEXURADATA Ops**, support email admin@
4. Add **test users** : ton compte Google
5. Scopes : `webmasters`, `business.manage`
6. **Credentials → Create OAuth client ID** type **Desktop app** → name "nexuradata-ops-cli"
7. Note **Client ID** et **Client Secret**

### 3. Vérifier le site dans Search Console (2 min)
1. <https://search.google.com/search-console>
2. Add property → URL prefix → `https://nexuradata.ca/`
3. Méthode : **HTML tag** ou **DNS** (DNS recommandé via Cloudflare)
4. Une fois vérifié, soumettre `https://nexuradata.ca/sitemap.xml`

### 4. Générer le refresh token (3 min)
```powershell
$env:GOOGLE_OAUTH_CLIENT_ID = "xxxxx.apps.googleusercontent.com"
$env:GOOGLE_OAUTH_CLIENT_SECRET = "GOCSPX-xxxxx"
node scripts/google-oauth-bootstrap.mjs
```
Ça ouvre le navigateur, tu acceptes les permissions, le terminal affiche ton **refresh token**.

### 5. Mettre les secrets dans Cloudflare (2 min)
```powershell
npx wrangler pages secret put GOOGLE_OAUTH_CLIENT_ID --project-name nexuradata
npx wrangler pages secret put GOOGLE_OAUTH_CLIENT_SECRET --project-name nexuradata
npx wrangler pages secret put GOOGLE_OAUTH_REFRESH_TOKEN --project-name nexuradata
npx wrangler pages secret put GOOGLE_GSC_SITE_URL --project-name nexuradata
# valeur: sc-domain:nexuradata.ca   (ou https://nexuradata.ca/ si URL-prefix property)
npx wrangler pages secret put GOOGLE_GBP_LOCATION_NAME --project-name nexuradata
# valeur: accounts/XXXXX/locations/YYYYY  (optionnel — skip si pas encore claim GBP)
```

---

## Ce qui devient automatique ensuite

Le worker `functions/api/cron/google-sync.js` est déjà en place. Il fait :

- **GET `/api/cron/google-sync`** — auth via Cf Access OU header `x-ops-secret: <ACCESS_CODE_SECRET>` :
  - Refresh OAuth token
  - Soumet le sitemap à Search Console
  - Récupère top 50 requêtes des 7 derniers jours
  - Publie un post quotidien sur Google Business Profile (si `GOOGLE_GBP_LOCATION_NAME` set)
  - Log dans D1 (table `ops_log` si elle existe)

### Activer le cron quotidien (option A — GitHub Actions, gratuit)
1. <https://github.com/NEXURA01/nexuradata-site/settings/secrets/actions> → **New repository secret**
2. Name : `OPS_SECRET`  Value : la même que Cloudflare `ACCESS_CODE_SECRET`
3. Le workflow `.github/workflows/google-sync.yml` tourne automatiquement à 13h UTC chaque jour
4. Test manuel : Actions tab → "Google daily sync" → **Run workflow**

### Activer le cron quotidien (option B — Cloudflare dashboard)
1. Cloudflare → Pages → nexuradata → **Settings → Functions → Cron triggers**
2. Add trigger : `0 13 * * *`
3. Path : `/api/cron/google-sync`
4. Headers : `x-ops-secret: <ACCESS_CODE_SECRET value>`

### Tester manuellement
```powershell
# Avec x-ops-secret (recommandé):
$headers = @{ "x-ops-secret" = "<valeur ACCESS_CODE_SECRET>" }
Invoke-RestMethod -Uri "https://nexuradata.ca/api/cron/google-sync" -Headers $headers
```

---

## APIs disponibles pour étendre plus tard

| Besoin | API | Endpoint à créer |
|---|---|---|
| Demander indexation d'une URL | Indexing API | `POST /api/cron/google-index?url=...` |
| Pull GA4 metrics | Analytics Data API | `GET /api/cron/ga4-pull?days=7` |
| Créer campagne Google Ads | Google Ads API | nécessite developer token approuvé (~7 jours d'attente) |
| Répondre aux avis GBP | My Business Reviews API | `POST /api/ops/gbp-reply` |
| Manager Google Tag | Tag Manager API | déployer tags GA4/conversions par script |

Toutes utilisent le même `GOOGLE_OAUTH_REFRESH_TOKEN` (avec scopes additionnels au moment du bootstrap si besoin).
