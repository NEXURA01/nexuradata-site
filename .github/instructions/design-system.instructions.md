---
description: "Use when writing HTML, CSS, or JS for the NEXURADATA site. Covers design tokens, typography, layout, forms, animation, and editorial rules. Triggers on: styling, CSS, layout, new page, component, section, form, animation."
applyTo: ["**/*.html", "**/*.css", "**/*.js"]
---
# NEXURADATA Design System

## Structure
- Semantic HTML only — `<main>`, `<section>`, `<nav>`, `<footer>`. No unnecessary `<div>`.
- Single CSS file (`assets/css/site.css`), no framework.
- No JS except for form logic and scroll reveal (`assets/js/site.js`).
- Fonts loaded via Google Fonts: **IBM Plex Sans** (body) + **IBM Plex Mono** (eyebrows/labels).

## CSS Tokens
```css
:root {
  --color-bg: #141618;
  --color-bg-soft: #1a1d20;
  --color-surface: rgba(24, 27, 31, 0.94);
  --color-surface-strong: #1d2126;
  --color-surface-elevated: rgba(28, 31, 36, 0.98);
  --color-panel: #171b20;
  --color-panel-soft: #1d2228;
  --color-line: rgba(255, 255, 255, 0.08);
  --color-line-strong: rgba(150, 166, 184, 0.22);
  --color-text: #f1f3f5;
  --color-text-soft: #c0c6ce;
  --color-text-muted: #8f98a3;
  --color-accent: #b7c4d3;
  --color-accent-strong: #8fa2b7;
  --color-accent-ink: #101417;
  --color-highlight: #d9e1e8;
  --shadow-soft: 0 14px 32px -28px rgba(0, 0, 0, 0.48);
  --shadow-strong: 0 24px 56px -40px rgba(0, 0, 0, 0.62);
  --radius-sm: 1rem;
  --radius-md: 1.5rem;
  --radius-lg: 2rem;
  --width-content: min(1160px, calc(100% - 3rem));
  --ease-out: cubic-bezier(0.22, 1, 0.36, 1);
}
```

## Reset
```css
*, *::before, *::after { box-sizing: border-box; }
body {
  margin: 0; min-width: 320px;
  font-family: "IBM Plex Sans", sans-serif;
  color: var(--color-text); background: #141618;
  line-height: 1.6;
  -webkit-font-smoothing: antialiased; text-rendering: optimizeLegibility;
}
```

## Typography
```css
h1 { font-size: clamp(2.55rem, 5vw, 4.1rem); font-weight: 700; letter-spacing: -0.03em; line-height: 1.05; text-wrap: balance; }
h2 { font-size: clamp(2.2rem, 5vw, 3.6rem); font-weight: 700; letter-spacing: -0.03em; line-height: 1.05; text-wrap: balance; }
/* Eyebrow labels */
.eyebrow { text-transform: uppercase; letter-spacing: 0.28em; font-size: 0.78rem; font-weight: 600; font-family: "IBM Plex Mono", monospace; color: var(--color-accent); }
```
- Subdued text uses `color: var(--color-text-soft)` or `var(--color-text-muted)` — not opacity.

## Layout
```css
.container { width: var(--width-content); margin: 0 auto; }
.section { padding: 4.25rem 0; }
.section-surface { background: linear-gradient(180deg, rgba(24,27,31,0.76), rgba(20,22,25,0.54)); border-top: 1px solid rgba(255,255,255,0.05); border-bottom: 1px solid rgba(255,255,255,0.05); }
```

## Nav
```css
.site-header { position: sticky; top: 0; z-index: 50; backdrop-filter: blur(16px); background: rgba(20,22,24,0.94); border-bottom: 1px solid rgba(255,255,255,0.06); }
.navbar { display: flex; align-items: center; justify-content: space-between; gap: 1.5rem; min-height: 5.5rem; }
.nav-links a { color: var(--color-text-soft); font-size: 0.92rem; font-weight: 600; text-decoration: none; transition: color 160ms ease; }
.nav-links a:hover { color: var(--color-accent); }
```

## Buttons
```css
.button {
  display: inline-flex; align-items: center; justify-content: center; gap: 0.5rem;
  min-height: 3.25rem; padding: 0.9rem 1.4rem;
  border: 1px solid transparent; border-radius: 1rem 1rem 1rem 0.35rem;
  font-weight: 800; letter-spacing: -0.02em; text-decoration: none;
  transition: transform 180ms var(--ease-out), background-color 180ms var(--ease-out), border-color 180ms var(--ease-out), color 180ms var(--ease-out);
}
.button:hover { transform: translateY(-2px); }
.button-primary   { background: var(--color-accent); color: var(--color-accent-ink); }
.button-secondary { border-color: rgba(255,255,255,0.12); background: rgba(31,34,38,0.96); color: var(--color-text); }
.button-outline   { border-color: rgba(183,196,211,0.22); color: var(--color-accent); background: rgba(27,31,36,0.94); }
```

## Forms
```css
.field input, .field select, .field textarea {
  width: 100%; min-height: 3.15rem; padding: 0.9rem 1rem;
  border: 1px solid rgba(255,255,255,0.1); border-radius: 1rem;
  background: rgba(20,23,27,0.98); color: var(--color-text);
}
.field input:focus, .field textarea:focus {
  outline: none; border-color: rgba(183,196,211,0.32);
  box-shadow: 0 0 0 4px rgba(183,196,211,0.08);
}
.consent-check {
  display: flex; gap: 0.8rem; align-items: flex-start;
  padding: 1rem 1.05rem; border: 1px solid rgba(255,255,255,0.08);
  border-radius: 1rem; background: rgba(23,26,30,0.92);
}
```

## Legal / Shell Pages
Legal pages (mentions-legales, politique-confidentialite, conditions-intervention-paiement) use:
```css
.page-shell   /* full-page wrapper */
.page-hero    /* top hero section with h1 */
.page-grid    /* max-width content grid */
.page-card    /* surface panel for card blocks */
.page-content /* prose container inside cards */
.page-links   /* footer link list */
```
- Always include `<link rel="canonical">`, `<link rel="alternate" hreflang>` pairs.

## Animation
All transitions use `var(--ease-out)`: `cubic-bezier(0.22, 1, 0.36, 1)`.
Hover lifts use `transform: translateY(-2px)`.
No scroll-reveal class in current CSS — entrance animations are handled by JS in `assets/js/site.js`.

## Editorial Rules
- Never more than 2 levels of visual hierarchy per section.
- Titles in sentence case — never all-caps except `.eyebrow` labels and nav items.
- Subdued text uses `--color-text-soft` or `--color-text-muted` — not opacity hacks.
- Sections separated by border + surface gradient — not background color swaps.
- Asymmetric corner radius (`1rem 1rem 1rem 0.35rem`) is the signature shape for buttons and interactive elements.
