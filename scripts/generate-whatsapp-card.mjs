// One-file deliverable: assets/icons/whatsapp-card.png (1080x1350, story format)
// Combines: brand portrait + QR code + phone number + URL — ready to share.
// Run: node ./scripts/generate-whatsapp-card.mjs
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import QRCode from "qrcode";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const OUT_DIR = resolve(ROOT, "assets/icons");
mkdirSync(OUT_DIR, { recursive: true });

const WA_URL = "https://wa.me/14388130592";
const PHONE_DISPLAY = "+1 438-813-0592";

// QR generated as data URL so we can embed in SVG
const qrDataUrl = await QRCode.toDataURL(WA_URL, {
    errorCorrectionLevel: "Q",
    margin: 1,
    width: 720,
    color: { dark: "#0d0d0b", light: "#e8e4dc" },
});

const W = 1080;
const H = 1350;

const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#0d0d0b"/>
      <stop offset="1" stop-color="#1c1c19"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#bg)"/>

  <!-- Brand bars + diagonal -->
  <g transform="translate(380 110)" stroke-linecap="butt">
    <rect x="0"   y="0" width="14" height="140" fill="#e8e4dc"/>
    <rect x="46"  y="0" width="14" height="140" fill="#e8e4dc" opacity="0.55"/>
    <rect x="92"  y="0" width="14" height="140" fill="#e8e4dc" opacity="0.22"/>
    <rect x="138" y="0" width="14" height="140" fill="#e8e4dc" opacity="0.08"/>
    <line x1="0" y1="0" x2="152" y2="140" stroke="#e8e4dc" stroke-width="8"/>
    <rect x="148" y="0" width="14" height="140" fill="#e8e4dc"/>
  </g>

  <!-- Wordmark -->
  <text x="${W / 2}" y="320" text-anchor="middle"
        font-family="Georgia, 'Times New Roman', serif"
        font-size="74" letter-spacing="18" fill="#e8e4dc">NEXURA</text>
  <text x="${W / 2}" y="362" text-anchor="middle"
        font-family="Georgia, 'Times New Roman', serif"
        font-size="26" letter-spacing="18" fill="#c4b8a8">DATA</text>

  <!-- Section divider -->
  <line x1="${W / 2 - 60}" y1="430" x2="${W / 2 + 60}" y2="430" stroke="#c4b8a8" stroke-width="1" opacity="0.6"/>

  <!-- WhatsApp label -->
  <text x="${W / 2}" y="490" text-anchor="middle"
        font-family="'IBM Plex Sans', 'Segoe UI', sans-serif"
        font-size="34" letter-spacing="6" fill="#e8e4dc"
        font-weight="500">WHATSAPP BUSINESS</text>

  <!-- QR code -->
  <g transform="translate(${(W - 560) / 2} 540)">
    <rect width="560" height="560" fill="#e8e4dc" rx="24"/>
    <image href="${qrDataUrl}" x="20" y="20" width="520" height="520"/>
  </g>

  <!-- Phone -->
  <text x="${W / 2}" y="1180" text-anchor="middle"
        font-family="'IBM Plex Mono', monospace"
        font-size="44" letter-spacing="2" fill="#e8e4dc">${PHONE_DISPLAY}</text>

  <!-- URL -->
  <text x="${W / 2}" y="1240" text-anchor="middle"
        font-family="'IBM Plex Sans', sans-serif"
        font-size="22" letter-spacing="2" fill="#c4b8a8">nexuradata.ca/whatsapp</text>

  <!-- Tagline footer -->
  <text x="${W / 2}" y="1300" text-anchor="middle"
        font-family="'IBM Plex Sans', sans-serif"
        font-size="18" letter-spacing="3" fill="#c4b8a8" opacity="0.75">RÉCUPÉRATION · FORENSIQUE · MONTRÉAL</text>
</svg>`;

const outPng = resolve(OUT_DIR, "whatsapp-card.png");
await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toFile(outPng);
console.log("✓", outPng, "(1080x1350)");

// Also drop a copy on the Desktop for easy access (handles OneDrive redirect on Windows)
import { homedir } from "node:os";
import { existsSync } from "node:fs";
const candidates = [
    resolve(homedir(), "OneDrive", "Desktop"),
    resolve(homedir(), "OneDrive", "Bureau"),
    resolve(homedir(), "Desktop"),
    resolve(homedir(), "Bureau"),
];
const desktopDir = candidates.find((p) => existsSync(p)) || candidates[2];
const desktop = resolve(desktopDir, "NEXURA-whatsapp.png");
await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toFile(desktop);
console.log("✓", desktop);
