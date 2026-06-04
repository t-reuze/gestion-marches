// Compare la sortie de mon algo (buildBddRows) à la BDD ground truth
// pour Anatomopathologie, par année.
import fs from 'fs';
import path from 'path';
import * as XLSX from 'xlsx';
import { loadBddRows, filterDuplicateFiles } from './bdd-helpers.mjs';
import { parseSupplierReporting } from '../src/utils/bddBuilder/parseSupplierReporting.js';
import { loadNomenclature } from '../src/utils/bddBuilder/matchClcc.js';
import { buildBddRows } from '../src/utils/bddBuilder/buildBddRows.js';
import { MARCHE_INVEST_CONFIG } from '../src/data/marcheInvestConfig.js';

globalThis.File = class { constructor(buf, name) { this._b = buf; this.name = name; } async arrayBuffer() { return this._b.buffer.slice(this._b.byteOffset, this._b.byteOffset + this._b.byteLength); } };
const makeFile = (p) => new File(fs.readFileSync(p), path.basename(p));

const SUIVI_PATH = 'C:/Users/g-gourrion/OneDrive - UNICANCER/Bureau/Saas/données reporting/Suivi_Invest_2026 - sauvegarde 26_01_26.xlsx';
const ROOT = 'C:/Users/g-gourrion/OneDrive - UNICANCER/Bureau/Marchés/Anatomopathologie';
const YEAR = process.argv[2] || '2024';

function listAllFilesRec(dir) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...listAllFilesRec(full));
    else if (/\.xlsx?$/i.test(e.name)) out.push(full);
  }
  return out;
}

console.log(`\n=== Anapath ${YEAR} : algo vs BDD ground truth ===`);

// 1. Récupère tous les fichiers de l'année
const yearDir = path.join(ROOT, `ACP Reporting ${YEAR}`);
const allFiles = listAllFilesRec(yearDir);
console.log(`Fichiers bruts : ${allFiles.length}`);
const fileNames = allFiles.map(f => path.basename(f));
const uniqueNames = filterDuplicateFiles(fileNames);
const uniqueFiles = allFiles.filter(f => uniqueNames.includes(path.basename(f)));
console.log(`Après dédup : ${uniqueFiles.length}`);
for (const f of uniqueFiles) console.log(`   • ${path.relative(yearDir, f)}`);

// 2. Parse reportings
console.log('\n--- Parsing reportings...');
const reportings = [];
for (const f of uniqueFiles) {
  const r = await parseSupplierReporting(makeFile(f));
  reportings.push(r);
  console.log(`   ${r.fournisseur.padEnd(22)} ${r.lignes.length} lignes`);
}

// 3. Algo
const wbSuivi = XLSX.read(fs.readFileSync(SUIVI_PATH), { type: 'buffer' });
const nomenclature = loadNomenclature(wbSuivi);
const cfg = MARCHE_INVEST_CONFIG['anapath'];
const algoRows = buildBddRows(reportings, cfg, nomenclature);
const algoYear = algoRows.filter(r => String(r.bdd['Année']) === YEAR);
console.log(`\nAlgo : ${algoRows.length} lignes total, ${algoYear.length} pour ${YEAR}`);

// 4. BDD ground truth
const bddAll = loadBddRows(SUIVI_PATH);
const bddYear = bddAll.filter(r =>
  String(r['Année']) === YEAR &&
  String(r['Marché'] ?? '').toLowerCase().includes('anatomo')
);
console.log(`BDD : ${bddYear.length} lignes Anatomopathologie pour ${YEAR}`);

// 5. Index sur (CLCC, Fournisseur, Type, Lot) — pour Anapath chaque BC est une ligne distincte
// Le libellé de lot est normalisé pour ignorer les underscores (la BDD a des saisies
// inconsistantes : "Lot_1" vs "Lot1" pour le même lot).
function normLot(lot) {
  return String(lot || '').toLowerCase().replace(/[_\s]/g, '').trim();
}
function key(r) {
  const bdd = r.bdd || r;
  return [
    bdd['CLCC unique'],
    String(bdd['Fournisseur'] || '').trim(),
    bdd["Type d'équipement"],
    normLot(bdd['Lot']),
  ].join('|');
}

const algoIdx = new Map();
for (const r of algoYear) {
  const k = key(r);
  if (!algoIdx.has(k)) algoIdx.set(k, []);
  algoIdx.get(k).push(r);
}
const bddIdx = new Map();
for (const r of bddYear) {
  const k = key(r);
  if (!bddIdx.has(k)) bddIdx.set(k, []);
  bddIdx.get(k).push(r);
}

const allKeys = new Set([...algoIdx.keys(), ...bddIdx.keys()]);
let matched = 0, deltaSum = 0, bddOnly = 0, algoOnly = 0;
const issues = [];
for (const k of [...allKeys].sort()) {
  const a = algoIdx.get(k) || [];
  const b = bddIdx.get(k) || [];
  const ttcA = a.reduce((s, x) => s + (Number(x.bdd['CATTC']) || 0), 0);
  const ttcB = b.reduce((s, x) => s + (Number(x['CATTC']) || 0), 0);
  if (a.length && b.length) {
    if (Math.abs(ttcA - ttcB) > 1) issues.push({ k, ttcA, ttcB, status: 'Δ TTC', algoCount: a.length, bddCount: b.length });
    else matched++;
  } else if (a.length) {
    algoOnly++;
    issues.push({ k, ttcA, ttcB, status: 'algo-only', algoCount: a.length, bddCount: 0 });
  } else {
    bddOnly++;
    issues.push({ k, ttcA, ttcB, status: 'BDD-only', algoCount: 0, bddCount: b.length });
  }
  deltaSum += Math.abs(ttcA - ttcB);
}

console.log(`\n=== Bilan ${YEAR} ===`);
console.log(`Tuples matchés exact      : ${matched}`);
console.log(`Tuples avec écart TTC     : ${issues.filter(i => i.status === 'Δ TTC').length}`);
console.log(`BDD-only (manquant algo)  : ${bddOnly}`);
console.log(`Algo-only (en trop)       : ${algoOnly}`);
console.log(`Σ |Δ TTC|                  : ${deltaSum.toFixed(0)} €`);

console.log(`\n=== Top 25 écarts ===`);
issues.sort((a, b) => Math.abs(b.ttcA - b.ttcB) - Math.abs(a.ttcA - a.ttcB));
for (const i of issues.slice(0, 25)) {
  const [clcc, four, type, lot] = i.k.split('|');
  console.log(`  [${i.status.padEnd(10)}] ${clcc.padEnd(22).slice(0,22)} ${four.padEnd(15)} ${type.padEnd(10).slice(0,10)} ${lot.padEnd(35).slice(0,35)}  algo=${i.ttcA.toFixed(0).padStart(10)} (${i.algoCount}) bdd=${i.ttcB.toFixed(0).padStart(10)} (${i.bddCount})`);
}
