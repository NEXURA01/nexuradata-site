---
description: "Use when writing HTML, CSS, or JS for the NEXURADATA site. Covers design tokens, typography, layout, forms, animation, and editorial rules. Triggers on: styling, CSS, layout, new page, component, section, form, animation."
applyTo: ["**/*.html", "**/*.css", "**/*.js"]
---
# NEXURADATA Design System

## Structure
- Semantic HTML only — `<main>`, `<section>`, `<nav>`, `<footer>`. No unnecessary `<div>`.
- Single CSS file, no framework.
- No JS except for form logic and scroll reveal.

## CSS Tokens
```css
:root {
  --noir: #0d0d0b;
  --os: #e8e4dc;
  --os-dim: rgba(232, 228, 220, 0.22);
  --os-ghost: rgba(232, 228, 220, 0.08);
  --rule: 0.5px solid rgba(232, 228, 220, 0.1);
  --serif: 'Georgia', 'Times New Roman', serif;
  --tracking-wide: 0.35em;
  --tracking-xwide: 0.55em;
}
```

## Reset
```css
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html { background: var(--noir); color: var(--os); font-family: var(--serif); font-size: 16px; }
body { min-height: 100vh; }
```

## Typography
```css
h1 { font-size: clamp(2.8rem, 6vw, 5rem); font-weight: 400; letter-spacing: var(--tracking-wide); line-height: 1.1; }
h2 { font-size: clamp(1.4rem, 3vw, 2.2rem); font-weight: 400; letter-spacing: var(--tracking-wide); }
p  { font-size: 1rem; line-height: 1.85; opacity: 0.65; max-width: 58ch; }
small, label { font-size: 0.7rem; letter-spacing: var(--tracking-xwide); opacity: 0.35; text-transform: uppercase; }
```

## Layout
```css
.container { max-width: 1100px; margin: 0 auto; padding: 0 48px; }
section { padding: 96px 0; border-top: var(--rule); }
nav { display: flex; justify-content: space-between; align-items: center; padding: 32px 48px; }
```

## Nav
```css
nav a { font-size: 0.75rem; letter-spacing: var(--tracking-xwide); opacity: 0.35; text-decoration: none; color: var(--os); transition: opacity 0.2s; }
nav a:hover { opacity: 1; }
```

## Forms
```css
input, select, textarea {
  background: transparent;
  border: none;
  border-bottom: var(--rule);
  color: var(--os);
  font-family: var(--serif);
  font-size: 0.95rem;
  padding: 12px 0;
  width: 100%;
  outline: none;
  border-radius: 0;
  transition: border-color 0.2s;
}
input:focus, textarea:focus { border-bottom-color: rgba(232,228,220,0.4); }
button[type=submit] {
  background: none;
  border: 0.5px solid rgba(232,228,220,0.25);
  color: var(--os);
  font-family: var(--serif);
  font-size: 0.75rem;
  letter-spacing: var(--tracking-xwide);
  padding: 14px 36px;
  cursor: pointer;
  transition: border-color 0.2s, opacity 0.2s;
  border-radius: 0;
}
button[type=submit]:hover { border-color: rgba(232,228,220,0.6); }
```

## Components
```css
/* Section separator */
.rule { width: 100%; height: 0.5px; background: var(--os); opacity: 0.08; }

/* Service tags (inline) */
.services { display: flex; gap: 2px; flex-wrap: wrap; margin-top: 48px; }
.service-tag {
  border: 0.5px solid rgba(232,228,220,0.2);
  font-size: 0.7rem;
  letter-spacing: var(--tracking-xwide);
  padding: 10px 20px;
  opacity: 0.55;
}
```

## Animation — Scroll Reveal
```css
.reveal { opacity: 0; transform: translateY(16px); transition: opacity 0.7s ease, transform 0.7s ease; }
.reveal.visible { opacity: 1; transform: none; }
```
```js
const observer = new IntersectionObserver(els => {
  els.forEach(el => { if (el.isIntersecting) el.target.classList.add('visible'); });
}, { threshold: 0.1 });
document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
```

## Editorial Rules
- Never more than 2 levels of visual hierarchy per section.
- Titles in sentence case — never all-caps except labels and nav.
- All secondary text uses `opacity` — never a different color.
- `<hr>` or `.rule` separates sections — not background changes.
- `max-width: 58ch` on all paragraphs — readability first.
