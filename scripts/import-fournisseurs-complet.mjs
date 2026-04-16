/**
 * Import complet des fournisseurs depuis :
 * - liste_fournisseurs_AIRO.xlsx (emails par entreprise)
 * - Listing_Diffusion_Activité FORMATION (fournisseurs avec noms/fonctions/tel)
 *
 * Génère src/data/fournisseursContacts.js
 * Usage : node scripts/import-fournisseurs-complet.mjs
 */

import XLSX from 'xlsx';
import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BASE = 'C:/Users/t-meuret/OneDrive - UNICANCER/Bureau/Stage/SCRIPTING';
const OUTPUT = resolve(__dirname, '../src/data/fournisseursContacts.js');

// Map: entreprise → { contacts: [{ nom, prenom, fonction, email, telephone }], categories: Set }
const data = {};

function cleanEmail(e) {
  if (!e) return '';
  return e.trim().replace(/[;>]+$/, '').replace(/\.$/, '').replace(',fr', '.fr').toLowerCase();
}

function addFournisseur(entreprise, contact, categorie) {
  const name = entreprise.replace(/^\(/, '').replace(/\)$/, '').trim();
  if (!name) return;
  if (!data[name]) data[name] = { contacts: [], categories: new Set() };
  if (categorie) data[name].categories.add(categorie);
  if (contact && contact.email) {
    // Dedup by email
    if (!data[name].contacts.some(c => c.email === contact.email)) {
      data[name].contacts.push(contact);
    }
  }
}

let totalContacts = 0;

// ══════════════════════════════════════════════════════════════
// 1. liste_fournisseurs_AIRO.xlsx
// ══════════════════════════════════════════════════════════════
console.log('\n── Fournisseurs AIRO ──');
try {
  const wb = XLSX.readFile(resolve(BASE, 'liste_fournisseurs_AIRO.xlsx'));
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, defval: '' });
  let count = 0;
  for (const row of rows) {
    const company = String(row[0] || '').trim();
    const email = cleanEmail(String(row[1] || ''));
    if (!company || !email) continue;
    addFournisseur(company, { nom: '', prenom: '', fonction: '', email, telephone: '' }, 'AIRO');
    count++;
  }
  console.log('  Importés : ' + count);
  totalContacts += count;
} catch (err) { console.log('  Erreur : ' + err.message); }

// ══════════════════════════════════════════════════════════════
// 2. Listing_Diffusion_Activité FORMATION — multiple sheets
// ══════════════════════════════════════════════════════════════
console.log('\n── Fichier Formation (fournisseurs) ──');
try {
  const allFiles = readdirSync(BASE);
  const formFile = allFiles.find(f => f.includes('Listing_Diffusion') && f.includes('FORMATION'));
  if (!formFile) throw new Error('Fichier Formation non trouvé');

  const wb = XLSX.readFile(resolve(BASE, formFile));

  // Sheets with structured fournisseur data
  const FOURNISSEUR_SHEETS = [
    { match: 'solution num', cat: 'Solutions numériques' },
    { match: 'imagerie', cat: 'Imagerie médicale' },
    { match: 'proton', cat: 'Protonthérapie' },
    { match: 'reirrad', cat: 'Radiothérapie (REIRRAD)' },
    { match: 'ia radio', cat: 'IA Radiothérapie' },
  ];

  for (const sheetName of wb.SheetNames) {
    if (!sheetName.toLowerCase().includes('fournisseur')) continue;
    const sn = sheetName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const matchEntry = FOURNISSEUR_SHEETS.find(e => sn.includes(e.match));
    const categorie = matchEntry ? matchEntry.cat : 'Autre';


    console.log('  Sheet: ' + sheetName + ' → ' + categorie);
    const ws = wb.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

    // Find header row
    let headerIdx = -1;
    let colMap = {};
    for (let i = 0; i < Math.min(rows.length, 15); i++) {
      const row = rows[i].map(c => String(c).toLowerCase().trim());
      const socIdx = row.findIndex(c => c.includes('societe') || c.includes('société') || c.includes('entreprise') || c.includes('fournisseur'));
      const hasEmail = row.some(c => c.includes('contact') || c.includes('mail') || c.includes('courriel'));
      if (socIdx >= 0 && hasEmail) {
        headerIdx = i;
        colMap = {
          societe: socIdx,
          nom: row.findIndex(c => c === 'nom'),
          prenom: row.findIndex(c => c === 'prenom' || c === 'prénom'),
          fonction: row.findIndex(c => c.includes('fonction') || c.includes('titre')),
          email: row.findIndex(c => c.includes('contact') || c.includes('mail') || c.includes('courriel')),
          tel: row.findIndex(c => c.includes('tel') || c.includes('téléphone')),
        };
        break;
      }
    }

    if (headerIdx === -1) {
      // Try simpler format : company | email
      for (const row of rows) {
        const company = String(row[0] || '').trim();
        const email = cleanEmail(String(row[1] || ''));
        if (company && email && email.includes('@')) {
          addFournisseur(company, { nom: '', prenom: '', fonction: '', email, telephone: '' }, categorie);
          totalContacts++;
        }
      }
      continue;
    }

    let count = 0;
    for (let i = headerIdx + 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.every(c => !String(c).trim())) continue;

      const societe = String(row[colMap.societe] || '').trim();
      const nom = colMap.nom >= 0 ? String(row[colMap.nom] || '').trim() : '';
      const prenom = colMap.prenom >= 0 ? String(row[colMap.prenom] || '').trim() : '';
      const fonction = colMap.fonction >= 0 ? String(row[colMap.fonction] || '').trim() : '';
      const email = cleanEmail(colMap.email >= 0 ? String(row[colMap.email] || '') : '');
      const tel = colMap.tel >= 0 ? String(row[colMap.tel] || '').trim() : '';

      if (!societe && !email) continue;

      addFournisseur(
        societe || '(inconnu)',
        email ? { nom, prenom, fonction, email, telephone: tel } : null,
        categorie
      );
      if (email) count++;
    }
    console.log('    → ' + count + ' contacts');
    totalContacts += count;
  }
} catch (err) { console.log('  Erreur : ' + err.message); }

// ══════════════════════════════════════════════════════════════
// Generate output
// ══════════════════════════════════════════════════════════════

// Convert Sets to arrays for JSON
const output = {};
for (const [name, entry] of Object.entries(data)) {
  output[name] = {
    categories: [...entry.categories],
    contacts: entry.contacts,
  };
}

const sorted = Object.fromEntries(
  Object.entries(output).sort(([a], [b]) => a.localeCompare(b, 'fr', { sensitivity: 'base' }))
);

const lines = [
  '// Fournisseurs — Import complet',
  '// Sources : liste_fournisseurs_AIRO.xlsx + Listing_Diffusion_Activité FORMATION',
  '// Dernière import : ' + new Date().toISOString().slice(0, 10),
  '// NE PAS ÉDITER MANUELLEMENT',
  '',
  '/**',
  ' * Structure : { [entreprise]: { categories: string[], contacts: [{ nom, prenom, fonction, email, telephone }] } }',
  ' */',
  'export const fournisseursContacts = ' + JSON.stringify(sorted, null, 2) + ';',
  '',
  'export const CATEGORIES_FOURNISSEURS = ' + JSON.stringify(
    [...new Set(Object.values(output).flatMap(e => e.categories))].sort(),
    null, 2
  ) + ';',
];

writeFileSync(OUTPUT, lines.join('\n'), 'utf-8');

console.log('\n=== DONE ===');
console.log('Entreprises : ' + Object.keys(output).length);
console.log('Contacts : ' + totalContacts);
console.log('Catégories : ' + [...new Set(Object.values(output).flatMap(e => e.categories))].join(', '));
console.log('→ ' + OUTPUT);
