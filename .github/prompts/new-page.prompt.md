---
description: "Scaffold a new bilingual page pair (FR + EN) with correct meta tags, canonical/hreflang links, and design-system classes."
agent: "agent"
---
Create a new bilingual page pair for the NEXURADATA site.

**Page slug**: {{slug}}
**French title**: {{titleFR}}
**English title**: {{titleEN}}
**French meta description**: {{descFR}}
**English meta description**: {{descEN}}
**Page type**: {{type}} (content page or legal/shell page)

## Requirements

1. Create the French page at root: `{{slug}}.html`
2. Create the English page at: `en/{{slug}}.html`
3. Follow the exact `<head>` structure from existing pages (see `mentions-legales.html` for reference):
   - `lang="fr-CA"` / `lang="en-CA"`
   - All OG and Twitter meta tags
   - Canonical + hreflang (FR, EN, x-default) links
   - EN page uses `../` relative paths for assets, manifest, and favicon
4. Follow the design system from `.github/instructions/design-system.instructions.md`
5. For legal/shell pages, use `.page-shell`, `.page-hero`, `.page-grid`, `.page-card`, `.page-content` classes
6. Include skip-link, site-header, main content, and site-footer matching existing pages
7. Add the new page to `sitemap.xml`
8. The build script (`npm run build`) copies HTML files automatically — no changes needed to `scripts/sync-release.mjs`
