/**
 * Script d'import des contacts CLCC depuis le fichier Excel de diffusion.
 * Lit chaque onglet, extrait les contacts, les organise par CLCC et par fonction.
 * Génère src/data/clccContacts.js
 *
 * Usage : node scripts/import-clcc-contacts.mjs
 */

import XLSX from 'xlsx';
import { writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const EXCEL_PATH = resolve(
  'C:/Users/t-meuret/OneDrive - UNICANCER/Bureau/Stage/SCRIPTING',
  '00-Listing_Diffusion_CLCC_MAJ_ 31MAR2026.xlsx'
);
const OUTPUT_PATH = resolve(__dirname, '../src/data/clccContacts.js');

// ── Mapping onglet → fonction dans le SaaS ──────────────────────
// Mapping avec normalisation des accents pour matcher les noms d'onglets Excel
function normalizeKey(s) {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim();
}

const SHEET_TO_FONCTION_RAW = {
  'Acheteur':                       'Acheteur',
  'Cadre de sante RT':              'Cadre de santé Radiothérapie',
  'Cadre de santé RT':              'Cadre de santé Radiothérapie',
  'Cadre de sante RX':              'Cadre de santé Radiologie',
  'Cadre de santé RX':              'Cadre de santé Radiologie',
  'Cadre de sante Bloc':            'Cadre de santé Bloc opératoire',
  'Cadre de santé Bloc':            'Cadre de santé Bloc opératoire',
  'Cadre de sante MN':              'Cadre de santé Médecine Nucléaire',
  'Cadre de santé MN':              'Cadre de santé Médecine Nucléaire',
  'Chef de service radiotherapie':   'Chef de service Radiothérapie',
  'Chef de service radiothérapie':   'Chef de service Radiothérapie',
  'Chef de service de bloc':         'Chef de service Bloc opératoire',
  'Chef de service MN':              'Chef de service Médecine Nucléaire',
  'Chef de service radiologie':      'Chef de service Radiologie',
  'Chef service anapath (en cours)': 'Chef de service Anatomopathologie',
  'DRH':                             'DRH',
  'Directeurs techniques':           'Directeur Technique',
  'DSI':                             'DSI',
  'RP Travailleur (CRP)':            'Référent Radioprotection (Travailleur)',
  'Formation RP Patient':            'Référent Radioprotection (Patient)',
  'Formation Interne':               'Référent Formation Interne',
  'Formation Externe':               'Référent Formation Externe',
  'Ingenieurs biomedicaux':          'Ingénieur Biomédical',
  'Ingénieurs biomédicaux':          'Ingénieur Biomédical',
  'Medecins Nucleaires':             'Médecin Nucléaire',
  'Médecins Nucléaires':             'Médecin Nucléaire',
  'Medecins Nucléaires':             'Médecin Nucléaire',
  'Physiciens RC (en cours)':        'Physicien Radiologie Conventionnelle',
  'Physiciens MN (en cours)':        'Physicien Médecine Nucléaire',
  'Physiciens RT (en cours)':        'Physicien Radiothérapie',
  'Radiologues':                     'Radiologue',
  'Radiopharmaciens referents':      'Radiopharmacien',
  'Radiopharmaciens référents':      'Radiopharmacien',
  'Referents Qualite':               'Référent Qualité',
  'Référents Qualité':               'Référent Qualité',
  'Responsables Phy Med':            'Responsable Physique Médicale',
  'Responsables BEC DRCI':           'Responsable Recherche Clinique (BEC)',
};

// Build normalized lookup
const SHEET_TO_FONCTION = {};
for (const [k, v] of Object.entries(SHEET_TO_FONCTION_RAW)) {
  SHEET_TO_FONCTION[k] = v;
  SHEET_TO_FONCTION[normalizeKey(k)] = v;
}

// Onglets à ignorer (listes massives ou doublons)
const SKIP_SHEETS_RAW = [
  'Manip Electro Medicale', 'Manip Electro Médicale',
  'Oncologues',
  'Newsletter liste diff',
  'Liste sans doublons',
  'Presidents des CME', 'Présidents des CME',
  'Radiotherapeutes', 'Radiothérapeutes',
  'Responsables comite organe', 'Responsables comité organe',
];
const SKIP_SHEETS = new Set([...SKIP_SHEETS_RAW, ...SKIP_SHEETS_RAW.map(normalizeKey)]);

// ── Mapping centre → id CLCC dans mockData.js ───────────────────
const CENTRE_TO_CLCC = {
  'avignon':          'sainte-catherine',
  'bordeaux':         'bergonie',
  'caen':             'baclesse',
  'clermont':         'jean-perrin',
  'clermont-ferrand': 'jean-perrin',
  'curie':            'curie',
  'paris':            'curie',
  'saint-cloud':      'curie',
  'orsay':            'curie',
  'dijon':            'cgfl',
  'ico':              'ico',
  'angers':           'ico',
  'nantes':           'ico',
  'lille':            'oscar-lambret',
  'lyon':             'leon-berard',
  'marseille':        'ipc',
  'montpellier':      'icm',
  'nancy':            'icl',
  'nice':             'lacassagne',
  'reims':            'godinot',
  'rennes':           'eugene-marquis',
  'rouen':            'becquerel',
  'strasbourg':       'paul-strauss',
  'toulouse':         'iuct',
  'villejuif':        'gustave-roussy',
};

function normalizeCentre(raw) {
  if (!raw) return null;
  const s = raw.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z\s-]/g, '')
    .trim();

  // Direct match
  for (const [key, id] of Object.entries(CENTRE_TO_CLCC)) {
    if (s.includes(key)) return id;
  }

  // Special patterns
  if (s === 'icm') return 'icm';
  if (s === 'icl') return 'icl';
  if (s.includes('cancerologie de lorraine') || s.includes('cancerologie lorraine')) return 'icl';
  if (s.includes("cancerologie de l'ouest") || s.includes("cancerologie de louest")) return 'ico';
  if (s.includes('institut du cancer de montpellier')) return 'icm';
  if (s === 'unicancer' || s.includes('siege unicancer')) return null; // siège, pas un CLCC
  if (s.includes('gustave') || s.includes('igr')) return 'gustave-roussy';
  if (s.includes('berard')) return 'leon-berard';
  if (s.includes('bergoni')) return 'bergonie';
  if (s.includes('baclesse')) return 'baclesse';
  if (s.includes('jean perrin')) return 'jean-perrin';
  if (s.includes('leclerc') || s.includes('cgfl')) return 'cgfl';
  if (s.includes('lambret')) return 'oscar-lambret';
  if (s.includes('paoli') || s.includes('calmettes')) return 'ipc';
  if (s.includes('lacassagne')) return 'lacassagne';
  if (s.includes('godinot')) return 'godinot';
  if (s.includes('marquis')) return 'eugene-marquis';
  if (s.includes('becquerel')) return 'becquerel';
  if (s.includes('paul strauss')) return 'paul-strauss';
  if (s.includes('oncopole') || s.includes('claudius') || s.includes('iuct')) return 'iuct';
  if (s.includes('sainte-catherine') || s.includes('sainte catherine')) return 'sainte-catherine';
  if (s.includes('institut cancero') && s.includes('ouest')) return 'ico';

  return null;
}

function clean(v) {
  if (v == null) return '';
  return String(v).trim();
}

function cleanEmail(email) {
  if (!email) return '';
  return email
    .trim()
    .replace(/[;>]+$/, '')       // trailing ; or >
    .replace(/\.$/, '')          // trailing .
    .replace(',fr', '.fr')       // comma instead of dot
    .replace('hustaveroussy', 'gustaveroussy')  // typo
    .replace('institut-stauss', 'institut-strauss')  // typo
    .toLowerCase();
}

function isValidContact(nom, prenom) {
  const n = (nom || '').trim().toLowerCase();
  const p = (prenom || '').trim();
  if (!n && !p) return false;
  // Skip header-like rows
  const skip = ['nom', 'centre', 'clcc', 'prenom', 'contact', 'fonction', 'date'];
  if (skip.includes(n)) return false;
  // Skip placeholder entries
  const placeholders = ['pas de ', 'en cours de ', 'pas d\'', 'formation '];
  if (placeholders.some(ph => n.startsWith(ph))) return false;
  return true;
}

function cleanNom(nom) {
  if (!nom) return '';
  // Remove appended notes like "\narrêt longue durée (15/06/25)"
  return nom.split('\n')[0].trim();
}

function cleanTelephone(tel) {
  if (!tel) return '';
  const t = tel.trim();
  // Skip non-phone data
  if (t === '/' || t.length < 8 || /^[a-zA-Z]/.test(t)) return '';
  return t;
}

// ── Main ─────────────────────────────────────────────────────────

console.log('Reading Excel:', EXCEL_PATH);
const wb = XLSX.readFile(EXCEL_PATH);

// Map: clccId → { fonction → [contacts] }
const data = {};

let totalImported = 0;
let totalSkipped = 0;

for (const sheetName of wb.SheetNames) {
  if (SKIP_SHEETS.has(sheetName) || SKIP_SHEETS.has(normalizeKey(sheetName))) {
    console.log(`  SKIP: ${sheetName}`);
    continue;
  }

  const fonction = SHEET_TO_FONCTION[sheetName] || SHEET_TO_FONCTION[normalizeKey(sheetName)];
  if (!fonction) {
    console.log(`  SKIP (no mapping): "${sheetName}"`);
    continue;
  }

  const ws = wb.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

  // Find header row (look for "Centre" or "Nom" in first 5 rows)
  let headerIdx = -1;
  let colMap = {};
  for (let i = 0; i < Math.min(rows.length, 8); i++) {
    const row = rows[i].map(c => String(c).toLowerCase().trim());
    const centreCol = row.findIndex(c => c === 'centre' || c.includes('nom du centre') || c.includes('clcc'));
    const nomCol = row.findIndex(c => c === 'nom' || c === 'noms');
    if (centreCol >= 0 || nomCol >= 0) {
      headerIdx = i;
      colMap = {
        centre: centreCol >= 0 ? centreCol : -1,
        nom: nomCol >= 0 ? nomCol : row.findIndex(c => c === 'nom' || c === 'noms'),
        prenom: row.findIndex(c => c === 'prenom' || c === 'prenoms' || c === 'prénom'),
        email: row.findIndex(c => c.includes('contact') || c.includes('mail') || c.includes('courriel') || c === 'e-mail'),
        tel: row.findIndex(c => c.includes('tel') || c.includes('téléphone') || c.includes('telephone')),
        commentaire: row.findIndex(c => c.includes('comment') || c.includes('fonction') || c.includes('titre')),
      };
      break;
    }
  }

  if (headerIdx === -1) {
    // Try BEC/DRCI format
    for (let i = 0; i < Math.min(rows.length, 8); i++) {
      const row = rows[i].map(c => String(c).toLowerCase().trim());
      if (row.some(c => c.includes('noms'))) {
        headerIdx = i;
        colMap = {
          nom: row.findIndex(c => c === 'noms'),
          prenom: row.findIndex(c => c === 'prenoms' || c === 'prénoms'),
          centre: row.findIndex(c => c.includes('nom du centre') || c.includes('centre')),
          email: row.findIndex(c => c.includes('courriel') || c.includes('mail')),
          tel: -1,
          commentaire: row.findIndex(c => c.includes('titre') || c.includes('responsable')),
        };
        break;
      }
    }
  }

  if (headerIdx === -1) {
    console.log(`  SKIP (no header found): ${sheetName}`);
    continue;
  }

  let sheetCount = 0;
  let currentCentre = null;

  for (let i = headerIdx + 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.every(c => !c || !String(c).trim())) continue;

    // Detect centre from "centre" column or from a section header row
    let centreRaw = colMap.centre >= 0 ? clean(row[colMap.centre]) : '';

    // Some sheets use merged cells or section headers for the centre
    if (!centreRaw && colMap.centre >= 0) {
      // Check if this row is a centre header (only first cell filled)
      const first = clean(row[0]);
      if (first && !clean(row[colMap.nom >= 0 ? colMap.nom : 1])) {
        currentCentre = normalizeCentre(first);
        continue;
      }
    }

    const clccId = centreRaw ? normalizeCentre(centreRaw) : currentCentre;
    const nom = cleanNom(colMap.nom >= 0 ? clean(row[colMap.nom]) : '');
    const prenom = colMap.prenom >= 0 ? clean(row[colMap.prenom]) : '';
    const email = cleanEmail(colMap.email >= 0 ? clean(row[colMap.email]) : '');
    const tel = cleanTelephone(colMap.tel >= 0 ? clean(row[colMap.tel]) : '');
    const commentaire = colMap.commentaire >= 0 ? clean(row[colMap.commentaire]) : '';

    if (!isValidContact(nom, prenom)) continue;
    if (!clccId) {
      totalSkipped++;
      if (centreRaw) console.log(`    [?] Centre non reconnu: "${centreRaw}" — ${nom} ${prenom}`);
      continue;
    }

    if (!data[clccId]) data[clccId] = {};
    if (!data[clccId][fonction]) data[clccId][fonction] = [];

    data[clccId][fonction].push({
      nom: nom,
      prenom: prenom,
      email: email,
      telephone: tel,
      ...(commentaire ? { commentaire } : {}),
    });

    sheetCount++;
    totalImported++;
  }

  console.log(`  ${sheetName} → ${fonction}: ${sheetCount} contacts`);
}

// ── Generate JS file ─────────────────────────────────────────────

const lines = [
  '// ══════════════════════════════════════════════════════════════',
  '// Contacts CLCC — Généré automatiquement depuis :',
  '// 00-Listing_Diffusion_CLCC_MAJ_31MAR2026.xlsx',
  '// Dernière import : ' + new Date().toISOString().slice(0, 10),
  '// NE PAS ÉDITER MANUELLEMENT — relancer scripts/import-clcc-contacts.mjs',
  '// ══════════════════════════════════════════════════════════════',
  '',
  '/**',
  ' * Structure : { [clccId]: { [fonction]: [{ nom, prenom, email, telephone }] } }',
  ' */',
  'export const clccContacts = ' + JSON.stringify(data, null, 2) + ';',
  '',
  '/** Liste de toutes les fonctions présentes dans les données */',
  'export const FONCTIONS_IMPORT = ' + JSON.stringify(
    [...new Set(Object.values(data).flatMap(c => Object.keys(c)))].sort((a, b) => a.localeCompare(b, 'fr')),
    null, 2
  ) + ';',
];

writeFileSync(OUTPUT_PATH, lines.join('\n'), 'utf-8');

console.log('\n=== DONE ===');
console.log(`Total importés : ${totalImported}`);
console.log(`Total ignorés (centre non identifié) : ${totalSkipped}`);
console.log(`CLCCs couverts : ${Object.keys(data).length}`);
console.log(`Fonctions : ${[...new Set(Object.values(data).flatMap(c => Object.keys(c)))].length}`);
console.log(`Fichier généré : ${OUTPUT_PATH}`);
