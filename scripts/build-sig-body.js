const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const sigFile = path.join(__dirname, '..', 'assets', 'email-signature.html');
const html = fs.readFileSync(sigFile, 'utf8');

const m = html.match(/<table cellpadding="0"[\s\S]*?<\/table>/);
if (!m) { console.error('NO MATCH'); process.exit(1); }
const sig = m[0];

const body = JSON.stringify({ signature: sig });
const params = JSON.stringify({ userId: 'me', sendAsEmail: 'olivier@nexuradata.ca' });

const gwsJs = path.join(
  'C:', 'Users', 'oblan', 'AppData', 'Local', 'Microsoft', 'WinGet', 'Packages',
  'OpenJS.NodeJS.LTS_Microsoft.Winget.Source_8wekyb3d8bbwe',
  'node-v24.14.1-win-x64', 'node_modules', '@googleworkspace', 'cli', 'run.js'
);

console.log('Pushing Gmail signature…');
const result = spawnSync(process.execPath, [
  gwsJs,
  'gmail', 'users', 'settings', 'sendAs', 'patch',
  '--params', params,
  '--json', body
], { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });

if (result.stdout) console.log(result.stdout);
if (result.stderr) console.error(result.stderr);
process.exit(result.status || 0);
