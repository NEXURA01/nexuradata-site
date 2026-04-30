/**
 * setup-drive.js
 * Creates the NEXURA DATA Google Drive folder structure
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
  return result;
}

function createFolder(name, parentId) {
  const body = {
    name,
    mimeType: 'application/vnd.google-apps.folder',
    ...(parentId ? { parents: [parentId] } : {})
  };
  const r = gws('drive', 'files', 'create', '--json', JSON.stringify(body));
  try {
    const data = JSON.parse(r.stdout);
    if (data.id) {
      console.log(`  ✓ ${name} (${data.id})`);
      return data.id;
    } else {
      console.error(`  ✗ ${name}:`, r.stdout, r.stderr);
      return null;
    }
  } catch (e) {
    console.error(`  ✗ ${name}: parse error`, r.stdout, r.stderr);
    return null;
  }
}

// Root folders
const rootFolders = [
  'Clients & Dossiers',
  'Finances',
  'Marketing & Communication',
  'Op\u00e9rations',
  'Juridique & Conformit\u00e9',
  'Infrastructure & Tech',
];

console.log('── Creating root folders…');
const folderIds = {};
for (const name of rootFolders) {
  const id = createFolder(name);
  if (id) folderIds[name] = id;
}

// Sub-folders
const subFolders = {
  'Clients & Dossiers': ['Dossiers actifs', 'Dossiers archiv\u00e9s', 'Formulaires & Contrats'],
  'Finances': ['Factures', 'Devis', 'D\u00e9penses', 'Rapports financiers'],
  'Marketing & Communication': ['Logos & Identit\u00e9 visuelle', 'Contenu web', 'R\u00e9seaux sociaux', 'Publicit\u00e9s'],
  'Op\u00e9rations': ['Fournisseurs', 'Proc\u00e9dures', '\u00c9quipements'],
  'Juridique & Conformit\u00e9': ['Contrats', 'Licences', 'Politiques internes', 'Conformit\u00e9 Qu\u00e9bec'],
  'Infrastructure & Tech': ['Cloudflare', 'Google Workspace', 'Sauvegardes', 'Documentation technique'],
};

console.log('\n── Creating sub-folders…');
for (const [parent, children] of Object.entries(subFolders)) {
  const parentId = folderIds[parent];
  if (!parentId) { console.log(`  Skipping ${parent} (no ID)`); continue; }
  for (const child of children) {
    createFolder(child, parentId);
  }
}

console.log('\nDone.');
