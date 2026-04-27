import fs from "node:fs";

const frFile = "index.html";
const enFile = "en/index.html";

const patch = (file, label) => {
    const content = fs.readFileSync(file, "utf8");
    const re = /<p class="hero-payments"[\s\S]*?<\/p>/;
    const match = content.match(re);
    if (!match) { console.log("MISS or already updated:", file); return; }
    const isEn = label === "en";
    const aria = isEn ? "Accepted payment methods" : "Moyens de paiement accept\u00e9s";
    const labelText = isEn ? "Payments" : "Paiements";
    const indent = "          ";
    const replacement = [
        `<ul class="hero-payments" aria-label="${aria}">`,
        `${indent}  <li class="hero-payments__label">${labelText}</li>`,
        `${indent}  <li>VISA</li>`,
        `${indent}  <li>Mastercard</li>`,
        `${indent}  <li>Interac</li>`,
        `${indent}  <li>Apple Pay</li>`,
        `${indent}  <li>Google Pay</li>`,
        `${indent}  <li class="hero-payments__btc">Bitcoin <span aria-hidden="true">\u20bf</span></li>`,
        `${indent}</ul>`
    ].join("\n");
    fs.writeFileSync(file, content.replace(re, replacement), "utf8");
    console.log("OK:", file);
};

patch(frFile, "fr");
patch(enFile, "en");

