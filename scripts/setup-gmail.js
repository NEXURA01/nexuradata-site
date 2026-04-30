/**
 * setup-gmail.js
 * Sets up vacation auto-reply and Gmail labels for olivier@nexuradata.ca
 */
const { spawnSync } = require('child_process');
const path = require('path');

const gwsJs = path.join(
  'C:', 'Users', 'oblan', 'AppData', 'Local', 'Microsoft', 'WinGet', 'Packages',
  'OpenJS.NodeJS.LTS_Microsoft.Winget.Source_8wekyb3d8bbwe',
  'node-v24.14.1-win-x64', 'node_modules', '@googleworkspace', 'cli', 'run.js'
);

function gws(...args) {
  const result = spawnSync(process.execPath, [gwsJs, ...args], {
    encoding: 'utf8',
    maxBuffer: 10 * 1024 * 1024
  });
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  return result;
}

// ── 1. Vacation auto-reply ─────────────────────────────────────────────────
console.log('\n── Setting vacation auto-reply…');

const vacationBody = {
  enableAutoReply: true,
  responseSubject: 'NEXURA DATA \u2014 Bien re\u00e7u\u00a0/ Message received',
  responseBodyHtml: `<div style="font-family:Georgia,'Times New Roman',serif;color:#0d0d0b;font-size:14px;line-height:1.7;max-width:600px">
  <p><strong>Votre message a bien \u00e9t\u00e9 re\u00e7u.</strong><br>
  Nous vous r\u00e9pondrons dans les plus brefs d\u00e9lais, g\u00e9n\u00e9ralement dans les 24\u00a0heures ouvrables.</p>
  <p>Pour les demandes urgentes, vous pouvez nous joindre directement au <strong>438\u00a0813\u20110592</strong>.</p>
  <hr style="border:none;border-top:1px solid #e0ddd6;margin:20px 0">
  <p><strong>Your message has been received.</strong><br>
  We will respond as soon as possible, typically within 24 business hours.</p>
  <p>For urgent requests, you may reach us directly at <strong>438\u00a0813\u20110592</strong>.</p>
  <hr style="border:none;border-top:1px solid #e0ddd6;margin:20px 0">
  <p style="font-size:11px;color:#888">NEXURA DATA \u2014 Laboratoire de r\u00e9cup\u00e9ration de donn\u00e9es / Data Recovery Laboratory<br>
  Montr\u00e9al, Qu\u00e9bec\u00a0\u00b7\u00a0nexuradata.ca</p>
</div>`,
  restrictToContacts: false,
  restrictToDomain: false
};

const vacResult = gws(
  'gmail', 'users', 'settings', 'updateVacation',
  '--params', JSON.stringify({ userId: 'me' }),
  '--json', JSON.stringify(vacationBody)
);
console.log('Vacation result status:', vacResult.status);

// ── 2. Gmail labels ────────────────────────────────────────────────────────
const labels = [
  { name: 'Clients',          color: { backgroundColor: '#16a766', textColor: '#ffffff' } },
  { name: 'Urgents',          color: { backgroundColor: '#cc3a21', textColor: '#ffffff' } },
  { name: 'Devis & Factures', color: { backgroundColor: '#f2c960', textColor: '#000000' } },
  { name: 'Partenaires',      color: { backgroundColor: '#4986e7', textColor: '#ffffff' } },
  { name: 'Juridique',        color: { backgroundColor: '#8e63ce', textColor: '#ffffff' } },
];

console.log('\n── Creating Gmail labels…');
for (const label of labels) {
  console.log(`  Creating label: ${label.name}`);
  const r = gws(
    'gmail', 'users', 'labels', 'create',
    '--params', JSON.stringify({ userId: 'me' }),
    '--json', JSON.stringify({ name: label.name, color: label.color, labelListVisibility: 'labelShow', messageListVisibility: 'show' })
  );
  console.log('  status:', r.status);
}

console.log('\nDone.');
