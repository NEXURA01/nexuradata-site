# WhatsApp Cloud API — démarrage en 15 minutes (sans vérification Meta)

> **But** : recevoir et envoyer des messages WhatsApp via `https://nexuradata.ca/api/whatsapp/webhook`
> sans soumettre de document fiscal ni vérifier un business. Idéal pour tester avant le go-live commercial.

Tout le code est déjà en place (`functions/api/whatsapp/webhook.js`, `functions/_lib/whatsapp.js`, table D1 `whatsapp_threads/messages`, console ops `/operations/whatsapp.html`). Il ne manque que **4 secrets** et **1 webhook**.

---

## Étape 1 — Créer une app Meta (3 min)

1. Va sur **<https://developers.facebook.com/apps>**
2. Clique **Create App** → type **Business** → Next
3. App name : `NEXURADATA`, contact : `admin@nexuradata.ca`, business account : tu peux skipper ou choisir le tien existant
4. Dans le dashboard de l'app, section **Add products to your app** → cherche **WhatsApp** → **Set up**

Tu arrives sur la page **WhatsApp → API Setup**. Tout ce dont on a besoin est ici.

---

## Étape 2 — Récupérer les 4 valeurs (5 min)

Dans **WhatsApp → API Setup**, note :

| Champ Meta | Variable Cloudflare |
|---|---|
| **Temporary access token** (bouton orange en haut) | `WHATSAPP_ACCESS_TOKEN` (valable 24 h — on remplace plus tard) |
| **Phone number ID** (sous "From") | `WHATSAPP_PHONE_NUMBER_ID` |
| **App Secret** : App settings → Basic → App Secret → Show | `WHATSAPP_APP_SECRET` |
| Choisir un mot de passe webhook (n'importe quoi) | `WHATSAPP_VERIFY_TOKEN` (ex: `nexura-wh-2026-x9z`) |

---

## Étape 3 — Mettre les 4 secrets dans Cloudflare (2 min)

Dans le terminal du repo :

```powershell
npx wrangler pages secret put WHATSAPP_ACCESS_TOKEN --project-name nexuradata
npx wrangler pages secret put WHATSAPP_PHONE_NUMBER_ID --project-name nexuradata
npx wrangler pages secret put WHATSAPP_APP_SECRET --project-name nexuradata
npx wrangler pages secret put WHATSAPP_VERIFY_TOKEN --project-name nexuradata
```

À chaque prompt, colle la valeur correspondante.

---

## Étape 4 — Brancher le webhook côté Meta (3 min)

1. Dans **WhatsApp → Configuration** → section **Webhook** → **Edit**
2. **Callback URL** : `https://nexuradata.ca/api/whatsapp/webhook`
3. **Verify token** : la même chaîne que `WHATSAPP_VERIFY_TOKEN` ci-dessus
4. Clique **Verify and save** — Meta envoie un GET handshake, ton Worker répond avec le challenge → ✅
5. Dans la liste **Webhook fields**, abonne-toi à : `messages`
6. Optionnel : `message_template_status_update`, `message_status_changes`

---

## Étape 5 — Tester avec ton numéro perso (2 min)

1. Toujours dans **API Setup**, section **To** → ajoute ton numéro WhatsApp perso comme **recipient de test** (max 5 numéros gratuits, sans vérification)
2. Meta envoie un code à valider sur ton WhatsApp
3. Une fois validé, envoie un message **depuis ton numéro perso vers le numéro de test Meta** affiché dans la même page
4. Vérifie le résultat :
   - **<https://nexuradata.ca/operations/whatsapp.html>** → ton message apparaît, l'IA répond automatiquement
   - **<https://wa.me/...>** → tu reçois la réponse de l'IA sur ton WhatsApp perso

---

## Limites du mode test (gratuit, sans vérif)

- Max **5 numéros récepteurs** déclarés manuellement
- Token d'accès **expire toutes les 24 h** (à renouveler manuellement dans le dashboard, OU générer un token long-lived via System User une fois la vérification business faite)
- **1000 conversations gratuites** par mois (largement suffisant pour les tests)
- Le numéro affiché est un numéro Meta de test — pas ton 438-813-0592

## Pour passer en production avec ton vrai numéro

1. Ajouter ton **numéro 438-813-0592** dans WhatsApp Business Platform → Phone numbers
2. Vérification SMS OU appel vocal (Meta envoie un code)
3. Faire la **vérification business** (peut être individuelle, voir `meta-verification-individuelle.md`)
4. Générer un **System User access token** permanent
5. Remplacer `WHATSAPP_ACCESS_TOKEN` dans Cloudflare avec le nouveau token

---

## Dépannage rapide

| Symptôme | Cause probable | Fix |
|---|---|---|
| Webhook verify fails | `WHATSAPP_VERIFY_TOKEN` ne match pas | Re-paste exactement la même chaîne dans Meta |
| Messages reçus mais aucune réponse IA | `WHATSAPP_ACCESS_TOKEN` expiré (>24h en test) | Régénérer dans Meta → re-mettre le secret |
| 401 sur le webhook POST | `WHATSAPP_APP_SECRET` incorrect | Recopier depuis App Settings → Basic |
| Console ops vide | Cf Access pas configuré sur `/operations/*` | Vérifier `OPS_ACCESS_ALLOWED_DOMAIN=nexuradata.ca` dans `wrangler.jsonc` |

Logs en direct :
```powershell
npx wrangler pages deployment tail --project-name nexuradata
```
