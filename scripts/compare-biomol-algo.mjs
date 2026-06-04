// Compare la sortie de mon algo (buildBddRows) à la BDD ground truth
// pour BioMol, par CLCC × Fournisseur × Année × Lot.
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
const BIOMOL_DIR = 'C:/Users/g-gourrion/OneDrive - UNICANCER/Bureau/Marchés/Biologie moléculaire';
const YEAR = process.argv[2] || '2024';

console.log(`\n=== BioMol ${YEAR} : algo vs BDD ground truth ===`);

// 1. Parse reportings
const yearDir = path.join(BIOMOL_DIR, `BM Reporting ${YEAR}`);
const allFiles = fs.readdirSync(yearDir).filter(f => /\.xlsx?$/i.test(f));
const uniqueFiles = filterDuplicateFiles(allFiles);
console.log(`Fichiers uniques : ${uniqueFiles.length}`);
const reportings = [];
for (const f of uniqueFiles) {
  const r = await parseSupplierReporting(makeFile(path.join(yearDir, f)));
  reportings.push(r);
  console.log(`   ${r.fournisseur.padEnd(22)} ${r.lignes.length} lignes`);
}

// 2. Algo
const wbSuivi = XLSX.read(fs.readFileSync(SUIVI_PATH), { type: 'buffer' });
const nomenclature = loadNomenclature(wbSuivi);
const cfg = MARCHE_INVEST_CONFIG['bio-mol'];
const algoRows = buildBddRows(reportings, cfg, nomenclature);

// 3. Filtre algo aux lignes pour l'année donnée
const algoYear = algoRows.filter(r => String(r.bdd['Année']) === YEAR);
console.log(`\nAlgo : ${algoRows.length} lignes total, ${algoYear.length} pour ${YEAR}`);

// 4. BDD ground truth pour BioMol PPE025
const bddAll = loadBddRows(SUIVI_PATH);
const bddYear = bddAll.filter(r =>
  String(r['Année']) === YEAR &&
  String(r['Lot'] ?? '').toLowerCase().includes('biologie mol') &&
  String(r['Lot'] ?? '').toLowerCase().includes('ppe025')
);
console.log(`BDD : ${bddYear.length} lignes pour ${YEAR} (Biologie moléculaire PPE025)`);

// 5. Index sur (CLCC, Fournisseur, Type) — on ignore le libellé de lot car
// la BDD réelle a des libellés variables (Lots_13-40 à Lots_13-51) qui ne
// reflètent qu'une convention de saisie utilisateur, pas une distinction métier.
function key(r) {
  const bdd = r.bdd || r;
  return [
    bdd['CLCC unique'],
    bdd['Fournisseur'],
    bdd["Type d'équipement"],
  ].join('|');
}

const algoIdx = new Map();
for (const r of algoYear) {
  algoIdx.set(key(r), r);
}
const bddIdx = new Map();
for (const r of bddYear) {
  bddIdx.set(key(r), r);
}

const allKeys = new Set([...algoIdx.keys(), ...bddIdx.keys()]);
let matched = 0, deltaSum = 0, bddOnly = 0, algoOnly = 0;
const issues = [];
for (const k of [...allKeys].sort()) {
  const a = algoIdx.get(k);
  const b = bddIdx.get(k);
  if (a && b) {
    const ttcA = Number(a.bdd['CATTC']) || 0;
    const ttcB = Number(b['CATTC']) || 0;
    const delta = ttcA - ttcB;
    if (Math.abs(delta) > 1) {
      issues.push({ k, ttcA, ttcB, delta, status: 'Δ TTC' });
    } else {
      matched++;
    }
    deltaSum += Math.abs(delta);
  } else if (a) {
    algoOnly++;
    issues.push({ k, ttcA: Number(a.bdd['CATTC']) || 0, ttcB: 0, delta: Number(a.bdd['CATTC']) || 0, status: 'algo-only' });
  } else if (b) {
    bddOnly++;
    issues.push({ k, ttcA: 0, ttcB: Number(b['CATTC']) || 0, delta: -(Number(b['CATTC']) || 0), status: 'BDD-only' });
  }
}

console.log(`\n=== Bilan ${YEAR} ===`);
console.log(`Tuples matchés exact : ${matched}`);
console.log(`Tuples avec écart TTC : ${issues.filter(i => i.status === 'Δ TTC').length}`);
console.log(`BDD-only (manquant dans algo) : ${bddOnly}`);
console.log(`Algo-only (en trop) : ${algoOnly}`);
console.log(`Σ |Δ TTC| : ${deltaSum.toFixed(0)} €`);

// Détails
console.log(`\n=== Top 20 écarts ===`);
issues.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
for (const i of issues.slice(0, 20)) {
  const [clcc, four, lot, type] = i.k.split('|');
  console.log(`  [${i.status.padEnd(10)}] ${clcc.padEnd(15)} ${four.padEnd(20)} ${type.padEnd(13)} ${lot.padEnd(40).slice(0,40)}  algo=${i.ttcA.toFixed(0).padStart(10)} bdd=${i.ttcB.toFixed(0).padStart(10)} Δ=${i.delta.toFixed(0).padStart(10)}`);
}
