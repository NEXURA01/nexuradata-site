// Generate WhatsApp-related brand assets:
//   1. assets/icons/whatsapp-profile.png  (640x640, square brand portrait for WA Business profile photo)
//   2. assets/icons/whatsapp-qr.svg       (vector QR pointing to wa.me/14388130592)
//   3. assets/icons/whatsapp-qr.png       (1024x1024 PNG version, useful for print)
//
// Run: node ./scripts/generate-whatsapp-assets.mjs
// Locked palette only: noir #0d0d0b, os #e8e4dc, info #c4b8a8.

import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import QRCode from "qrcode";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const OUT_DIR = resolve(ROOT, "assets/icons");

const WA_URL = "https://wa.me/14388130592";

mkdirSync(OUT_DIR, { recursive: true });

// ── 1. Profile portrait 640x640 ─────────────────────────────────────────────
// Square SVG built from the existing logo elements (vertical bars + "EXURA").
// Bg: noir. Fg: os. No external glyphs (WhatsApp green forbidden by branding).
const profileSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" width="640" height="640">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#0d0d0b"/>
      <stop offset="1" stop-color="#1c1c19"/>
    </linearGradient>
  </defs>
  <rect width="640" height="640" fill="url(#bg)"/>
  <!-- Brand bars + diagonal (echo of logo-petit.svg, scaled) -->
  <g transform="translate(140 200)" stroke-linecap="butt">
    <rect x="0"  y="0" width="14" height="180" fill="#e8e4dc"/>
    <rect x="46" y="0" width="14" height="180" fill="#e8e4dc" opacity="0.55"/>
    <rect x="92" y="0" width="14" height="180" fill="#e8e4dc" opacity="0.22"/>
    <rect x="138" y="0" width="14" height="180" fill="#e8e4dc" opacity="0.08"/>
    <line x1="0" y1="0" x2="152" y2="180" stroke="#e8e4dc" stroke-width="10"/>
    <rect x="148" y="0" width="14" height="180" fill="#e8e4dc"/>
  </g>
  <!-- Wordmark -->
  <text x="320" y="448"
        text-anchor="middle"
        font-family="Georgia, 'Times New Roman', serif"
        font-size="56"
        letter-spacing="14"
        fill="#e8e4dc">NEXURA</text>
  <text x="320" y="488"
        text-anchor="middle"
        font-family="Georgia, 'Times New Roman', serif"
        font-size="22"
        letter-spacing="14"
        fill="#c4b8a8">DATA</text>
  <!-- Tagline -->
  <text x="320" y="552"
        text-anchor="middle"
        font-family="'IBM Plex Sans', 'Segoe UI', sans-serif"
        font-size="18"
        letter-spacing="3"
        fill="#c4b8a8" opacity="0.9">RÉCUPÉRATION · FORENSIQUE</text>
</svg>`;

await sharp(Buffer.from(profileSvg))
    .png({ compressionLevel: 9 })
    .toFile(resolve(OUT_DIR, "whatsapp-profile.png"));
console.log("✓ assets/icons/whatsapp-profile.png  (640x640)");

// ── 2. QR code SVG ──────────────────────────────────────────────────────────
const qrSvg = await QRCode.toString(WA_URL, {
    type: "svg",
    errorCorrectionLevel: "Q",
    margin: 2,
    color: { dark: "#0d0d0b", light: "#e8e4dc" },
});
writeFileSync(resolve(OUT_DIR, "whatsapp-qr.svg"), qrSvg, "utf8");
console.log("✓ assets/icons/whatsapp-qr.svg");

// ── 3. QR code PNG 1024 ─────────────────────────────────────────────────────
await QRCode.toFile(resolve(OUT_DIR, "whatsapp-qr.png"), WA_URL, {
    errorCorrectionLevel: "Q",
    width: 1024,
    margin: 2,
    color: { dark: "#0d0d0b", light: "#e8e4dc" },
});
console.log("✓ assets/icons/whatsapp-qr.png       (1024x1024)");

console.log("\nAll WhatsApp assets generated. Target URL:", WA_URL);
