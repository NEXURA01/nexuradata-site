# Politique de sécurité — NEXURADATA

> English version below.

## Périmètre

Ce dépôt héberge le site marketing et la plateforme opérationnelle de NEXURADATA
(`nexuradata.ca`), incluant les Cloudflare Pages Functions, les migrations D1,
les intégrations Stripe et Resend, ainsi que les scripts de build et d'audit SEO.

## Signaler une vulnérabilité

Merci de **ne pas** ouvrir d'issue GitHub publique pour un problème de sécurité.

- **Email confidentiel** : `security@nexuradata.ca`
- **PGP / chiffrement** : disponible sur demande au même email.
- **Téléphone** (urgences uniquement) : +1 438-813-0592

Inclure dans le rapport :

1. Une description claire du problème et de l'impact estimé.
2. Les étapes de reproduction (URL, payload, en-têtes, horodatage UTC).
3. Toute preuve de concept, en évitant l'exfiltration de données réelles.
4. Vos coordonnées pour le suivi (optionnel mais apprécié).

## Engagements

| Étape | Délai cible |
| --- | --- |
| Accusé de réception | 48 h ouvrables |
| Évaluation initiale | 5 jours ouvrables |
| Correctif ou mitigation | selon sévérité (CVSS) |
| Divulgation coordonnée | après correctif déployé |

Nous suivons une approche de **divulgation coordonnée**. Aucune action légale
ne sera engagée contre les chercheurs qui respectent cette politique et la
règle « pas d'exfiltration, pas de dégradation de service ».

## Hors périmètre

- Attaques nécessitant un accès physique à nos locaux ou à du matériel client.
- Ingénierie sociale du personnel ou des clients.
- Déni de service volumétrique.
- Vulnérabilités sur des services tiers (Cloudflare, Stripe, Resend, Google) —
  à signaler directement à l'éditeur concerné.
- Rapports automatisés sans preuve d'exploitabilité (en-têtes manquants,
  versions de bibliothèques, etc.) sans impact démontré.

## Bonnes pratiques internes

- Secrets gérés via `wrangler secret` et GitHub Actions secrets — jamais en clair.
- Webhooks Stripe vérifiés via `STRIPE_WEBHOOK_SECRET`.
- Données client traitées conformément à la **Loi 25** (Québec) et au RGPD
  lorsque applicable.
- Audits dépendances : `npm audit` au build, revue manuelle des PR.

---

# Security Policy — NEXURADATA (English)

## Scope

This repository hosts the marketing site and operational platform for
NEXURADATA (`nexuradata.ca`), including Cloudflare Pages Functions, D1
migrations, Stripe and Resend integrations, and build/SEO audit scripts.

## Reporting a vulnerability

Please **do not** open a public GitHub issue for security problems.

- **Confidential email**: `security@nexuradata.ca`
- **PGP / encryption**: available on request at the same address.
- **Phone** (emergencies only): +1 438-813-0592

Include in the report:

1. A clear description of the issue and estimated impact.
2. Reproduction steps (URL, payload, headers, UTC timestamp).
3. Any proof of concept, avoiding real-data exfiltration.
4. Your contact info for follow-up (optional but appreciated).

## Commitments

| Stage | Target |
| --- | --- |
| Acknowledgement | 48 business hours |
| Initial assessment | 5 business days |
| Fix or mitigation | per severity (CVSS) |
| Coordinated disclosure | after fix is deployed |

We follow **coordinated disclosure**. No legal action will be pursued against
researchers acting in good faith under this policy and the rule
"no data exfiltration, no service degradation."

## Out of scope

- Attacks requiring physical access to our premises or client hardware.
- Social engineering of staff or clients.
- Volumetric denial-of-service attacks.
- Vulnerabilities in third-party services (Cloudflare, Stripe, Resend,
  Google) — report directly to the vendor.
- Automated scans without demonstrated impact (missing headers, library
  versions, etc.).

## Internal practices

- Secrets managed via `wrangler secret` and GitHub Actions secrets — never
  in plaintext.
- Stripe webhooks verified via `STRIPE_WEBHOOK_SECRET`.
- Client data handled per **Law 25** (Québec) and GDPR where applicable.
- Dependency audits: `npm audit` at build time, manual PR review.
