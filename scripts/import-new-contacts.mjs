/**
 * Import des nouveaux fichiers de contacts (avril 2026) :
 * - Cadres supérieurs de santé (CSV)
 * - Radiothérapeutes et physiciens médicaux (XLSX)
 * - Fournisseurs AIRO (XLSX)
 *
 * Fusionne avec le fichier clccContacts.js existant.
 * Usage : node scripts/import-new-contacts.mjs
 */

import XLSX from 'xlsx';
import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BASE = 'C:/Users/t-meuret/OneDrive - UNICANCER/Bureau/Stage/SCRIPTING';
const OUTPUT = resolve(__dirname, '../src/data/clccContacts.js');

// ── Load existing data ───────────────────────────────────────
const existingRaw = readFileSync(OUTPUT, 'utf-8');
const match = existingRaw.match(/export const clccContacts = ({[\s\S]*?});/);
const data = match ? JSON.parse(match[1]) : {};

// ── Centre normalizer ────────────────────────────────────────
const CENTRE_MAP = {
  'montpellier': 'icm', 'icm': 'icm',
  'clermont': 'jean-perrin', 'clermont-ferrand': 'jean-perrin',
  'toulouse': 'iuct', 'iuct': 'iuct',
  'rennes': 'eugene-marquis', 'cem': 'eugene-marquis',
  'strasbourg': 'paul-strauss', 'icans': 'paul-strauss',
  'nancy': 'icl', 'icl': 'icl',
  'lyon': 'leon-berard',
  'rouen': 'becquerel', 'chb': 'becquerel',
  'lille': 'oscar-lambret',
  'caen': 'baclesse',
  'ico': 'ico', 'angers': 'ico', 'nantes': 'ico',
  'nice': 'lacassagne',
  'curie': 'curie', 'institut curie': 'curie',
  'bordeaux': 'bergonie',
  'dijon': 'cgfl',
  'reims': 'godinot',
  'marseille': 'ipc',
  'villejuif': 'gustave-roussy', 'gustave roussy': 'gustave-roussy',
  'avignon': 'sainte-catherine',
};

function normCentre(raw) {
  if (!raw) return null;
  const s = raw.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  for (const [k, v] of Object.entries(CENTRE_MAP)) {
    if (s.includes(k)) return v;
  }
  if (s.includes('berard')) return 'leon-berard';
  if (s.includes('bergoni')) return 'bergonie';
  if (s.includes('baclesse')) return 'baclesse';
  if (s.includes('leclerc') || s.includes('cgfl')) return 'cgfl';
  if (s.includes('lambret')) return 'oscar-lambret';
  if (s.includes('paoli') || s.includes('calmettes')) return 'ipc';
  if (s.includes('lacassagne')) return 'lacassagne';
  if (s.includes('godinot')) return 'godinot';
  if (s.includes('marquis')) return 'eugene-marquis';
  if (s.includes('becquerel')) return 'becquerel';
  if (s.includes('oncopole') || s.includes('claudius')) return 'iuct';
  if (s.includes("cancerologie de l'ouest") || s.includes('ouest')) return 'ico';
  if (s.includes('cancerologie de lorraine') || s.includes('lorraine')) return 'icl';
  if (s.includes('gustave')) return 'gustave-roussy';
  if (s.includes('sainte-catherine') || s.includes('sainte catherine')) return 'sainte-catherine';
  return null;
}

function cleanEmail(e) {
  if (!e) return '';
  return e.trim().replace(/[;>]+$/, '').replace(/\.$/, '').toLowerCase();
}

function addContact(clccId, fonction, ct) {
  if (!data[clccId]) data[clccId] = {};
  if (!data[clccId][fonction]) data[clccId][fonction] = [];
  // Dedup by email
  if (ct.email && data[clccId][fonction].some(x => x.email === ct.email)) return false;
  data[clccId][fonction].push(ct);
  return true;
}

let totalAdded = 0;

// ══════════════════════════════════════════════════════════════
// 1. Cadres Supérieurs de Santé (CSV)
// ══════════════════════════════════════════════════════════════
console.log('\n── Cadres Supérieurs de Santé ──');
try {
  const csvFile = readFileSync(resolve(BASE, '25_2026-03-5_Liste de diffusion Cadre santé.csv'), 'latin1');
  const rows = csvFile.split('\n').map(r => r.split(';'));
  let count = 0;
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length < 5) continue;
    const centre = (row[0] || '').trim();
    const nom = (row[2] || '').trim();
    const prenom = (row[3] || '').trim();
    const email = cleanEmail(row[4] || '');
    const titre = (row[10] || '').trim();
    if (!nom || !prenom) continue;
    const clccId = normCentre(centre);
    if (!clccId) { console.log('  [?] ' + centre + ' — ' + nom); continue; }
    if (addContact(clccId, 'Directeur des Soins', { nom, prenom, email, telephone: '', commentaire: titre })) count++;
  }
  console.log('  Importés : ' + count);
  totalAdded += count;
} catch (err) { console.log('  Erreur CSV : ' + err.message); }

// ══════════════════════════════════════════════════════════════
// 2. Radiothérapeutes et Physiciens Médicaux (XLSX)
// ══════════════════════════════════════════════════════════════
console.log('\n── Radiothérapeutes et Physiciens Médicaux ──');
try {
  const files = readFileSync(resolve(BASE), null);
} catch {}
try {
  // Find the file
  const { readdirSync } = await import('fs');
  const allFiles = readdirSync(BASE);
  const rtFile = allFiles.find(f => f.includes('Radioth') && f.endsWith('.xlsx'));
  if (rtFile) {
    const wb = XLSX.readFile(resolve(BASE, rtFile));
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

    // Find header
    let headerIdx = -1;
    for (let i = 0; i < Math.min(rows.length, 5); i++) {
      if (rows[i].some(c => String(c).toLowerCase().includes('centre'))) { headerIdx = i; break; }
    }
    if (headerIdx === -1) headerIdx = 0;

    const headers = rows[headerIdx].map(h => String(h).toLowerCase().trim());
    const colCentre = headers.findIndex(h => h.includes('centre'));
    const colNom = headers.findIndex(h => h === 'nom');
    const colPrenom = headers.findIndex(h => h.includes('prenom') || h.includes('prénom'));
    const colEmail = headers.findIndex(h => h.includes('email') || h.includes('mail'));
    const colPoste = headers.findIndex(h => h.includes('poste'));

    let count = 0;
    for (let i = headerIdx + 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || !String(row[colNom] || '').trim()) continue;

      const centre = String(row[colCentre] || '').trim();
      const nom = String(row[colNom] || '').trim();
      const prenom = String(row[colPrenom] || '').trim();
      const email = cleanEmail(String(row[colEmail] || ''));
      const poste = String(row[colPoste] || '').trim();

      if (!nom) continue;
      const clccId = normCentre(centre);
      if (!clccId) continue;

      // Map poste to fonction
      let fonction;
      const p = poste.toLowerCase();
      if (p.includes('physicien')) fonction = 'Physicien Médical';
      else if (p.includes('radiotherapeute') || p.includes('radiothérapeute')) fonction = 'Radiothérapeute';
      else if (p.includes('consultant')) fonction = 'Consultant Radiothérapie';
      else if (p.includes('pu-ph')) fonction = 'PU-PH Radiothérapie';
      else if (p.includes('assistant')) fonction = 'Assistant Spécialiste Radiothérapie';
      else fonction = 'Radiothérapeute';

      if (addContact(clccId, fonction, { nom, prenom, email, telephone: '' })) count++;
    }
    console.log('  Importés : ' + count);
    totalAdded += count;
  } else {
    console.log('  Fichier non trouvé');
  }
} catch (err) { console.log('  Erreur : ' + err.message); }

// ══════════════════════════════════════════════════════════════
// 3. Fournisseurs AIRO (XLSX) → fichier séparé
// ══════════════════════════════════════════════════════════════
console.log('\n── Fournisseurs AIRO ──');
const fournisseurs = {};
try {
  const wb = XLSX.readFile(resolve(BASE, 'liste_fournisseurs_AIRO.xlsx'));
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

  let count = 0;
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const company = String(row[0] || '').trim();
    const email = cleanEmail(String(row[1] || ''));
    if (!company || !email) continue;
    // Clean company name (remove parentheses prefix)
    const cleanCompany = company.replace(/^\(/, '').replace(/\)$/, '').trim();
    if (!fournisseurs[cleanCompany]) fournisseurs[cleanCompany] = [];
    if (!fournisseurs[cleanCompany].some(e => e === email)) {
      fournisseurs[cleanCompany].push(email);
      count++;
    }
  }
  console.log('  Importés : ' + count + ' contacts de ' + Object.keys(fournisseurs).length + ' fournisseurs');
  totalAdded += count;
} catch (err) { console.log('  Erreur : ' + err.message); }

// ── Write fournisseurs file ──────────────────────────────────
const fournisseursOutput = resolve(__dirname, '../src/data/fournisseursContacts.js');
const fLines = [
  '// Fournisseurs — Importé depuis liste_fournisseurs_AIRO.xlsx',
  '// Dernière import : ' + new Date().toISOString().slice(0, 10),
  '',
  'export const fournisseursContacts = ' + JSON.stringify(fournisseurs, null, 2) + ';',
];
writeFileSync(fournisseursOutput, fLines.join('\n'), 'utf-8');
console.log('  → ' + fournisseursOutput);

// ── Write updated clccContacts ───────────────────────────────
const lines = [
  '// Contacts CLCC — Généré automatiquement',
  '// Sources : Listing_Diffusion_CLCC + Cadres Supérieurs + Radiothérapeutes/Physiciens',
  '// Dernière import : ' + new Date().toISOString().slice(0, 10),
  '// NE PAS ÉDITER MANUELLEMENT',
  '',
  'export const clccContacts = ' + JSON.stringify(data, null, 2) + ';',
  '',
  'export const FONCTIONS_IMPORT = ' + JSON.stringify(
    [...new Set(Object.values(data).flatMap(c => Object.keys(c)))].sort((a, b) => a.localeCompare(b, 'fr')),
    null, 2
  ) + ';',
];
writeFileSync(OUTPUT, lines.join('\n'), 'utf-8');

console.log('\n=== DONE ===');
console.log('Total ajoutés : ' + totalAdded);
console.log('CLCCs : ' + Object.keys(data).length);
console.log('Fonctions : ' + [...new Set(Object.values(data).flatMap(c => Object.keys(c)))].length);
