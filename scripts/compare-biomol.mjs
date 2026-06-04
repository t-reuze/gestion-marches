import fs from 'fs';
import path from 'path';
import { loadBddRows, filterDuplicateFiles } from './bdd-helpers.mjs';
import { parseSupplierReporting } from '../src/utils/bddBuilder/parseSupplierReporting.js';

globalThis.File = class { constructor(buf, name) { this._b = buf; this.name = name; } async arrayBuffer() { return this._b.buffer.slice(this._b.byteOffset, this._b.byteOffset + this._b.byteLength); } };
const makeFile = (p) => new File(fs.readFileSync(p), path.basename(p));

const SUIVI_PATH = 'C:/Users/g-gourrion/OneDrive - UNICANCER/Bureau/Saas/données reporting/Suivi_Invest_2026 - sauvegarde 26_01_26.xlsx';
const BIOMOL_DIR = 'C:/Users/g-gourrion/OneDrive - UNICANCER/Bureau/Marchés/Biologie moléculaire';

const YEAR = process.argv[2] || '2023';
const yearDir = path.join(BIOMOL_DIR, `BM Reporting ${YEAR}`);
console.log(`\n=== Année ${YEAR} : ${yearDir} ===`);

const allFiles = fs.readdirSync(yearDir).filter(f => /\.xlsx?$/i.test(f));
const uniqueFiles = filterDuplicateFiles(allFiles);
console.log(`Fichiers : ${allFiles.length} brut → ${uniqueFiles.length} unique`);
for (const f of uniqueFiles) console.log(`   • ${f}`);

// Parse tous les reportings
console.log('\n--- Parsing reportings...');
const reportings = [];
for (const f of uniqueFiles) {
  const r = await parseSupplierReporting(makeFile(path.join(yearDir, f)));
  reportings.push(r);
  console.log(`   ${r.fournisseur.padEnd(20)} ${r.lignes.length} lignes`);
}

// Charge BDD ground truth
console.log('\n--- Chargement BDD...');
const bddAll = loadBddRows(SUIVI_PATH);
const bddYear = bddAll.filter(r =>
  String(r['Année']) === YEAR &&
  String(r['Lot'] ?? '').toLowerCase().includes('biologie mol')
);
console.log(`BDD BioMol ${YEAR} : ${bddYear.length} lignes`);

// Agrégation BDD par (CLCC, Fournisseur)
const bddAgg = {};
for (const r of bddYear) {
  const k = `${r['CLCC unique']}|${r['Fournisseur']}`;
  if (!bddAgg[k]) bddAgg[k] = { clcc: r['CLCC unique'], fourn: r['Fournisseur'], rows: [] };
  bddAgg[k].rows.push({
    lot: r['Lot'],
    type: r["Type d'équipement"],
    qte: Number(r['QUANTITE'] || 0),
    cattc: Number(r['CATTC'] || 0),
    nomEquip: r['Nom equipement'],
  });
}

// Agrégation reporting par (CLCC matché, Fournisseur normalisé)
import { loadNomenclature, matchEtablissement } from '../src/utils/bddBuilder/matchClcc.js';
import * as XLSX from 'xlsx';
const wbSuivi = XLSX.read(fs.readFileSync(SUIVI_PATH), { type: 'buffer' });
const nomenclature = loadNomenclature(wbSuivi);

const FOUR_CANON = {
  'AGILENT': 'Agilent', 'ILLUMINA': 'Illumina', 'PROMEGA': 'Promega',
  'NEB': 'New England Biolabs', 'NEW ENGLAND BIOLABS': 'New England Biolabs',
  'LIFE TECHNOLOGIES': 'Life Technologies', 'LIFE TECH': 'Life Technologies',
  'STILLA': 'STILLA', 'SYNORIS': 'SYNORIS', 'HAMILTON': 'Hamilton',
  'THERMOFISHER': 'ThermoFisher', 'TELEMIS': 'Telemis', 'STARLAB': 'Starlab',
  'EUROGENTEC': 'Eurogentec', 'AATI': 'AATI', 'PERKINELMER': 'Perkinelmer',
  'QIAGEN': 'Qiagen', 'BIO-RAD': 'BIO-RAD', 'BIORAD': 'BIO-RAD',
};

const rptAgg = {};
for (const rpt of reportings) {
  const four = FOUR_CANON[rpt.fournisseur.toUpperCase()] || rpt.fournisseur;
  for (const ligne of rpt.lignes) {
    const m = matchEtablissement(ligne.etablissement, nomenclature);
    if (!m.nomenclature) continue;
    const k = `${m.nomenclature}|${four}`;
    if (!rptAgg[k]) rptAgg[k] = { clcc: m.nomenclature, fourn: four, totalTtc: 0, count: 0, lots: new Set() };
    rptAgg[k].totalTtc += Number(ligne.montantTtc) || 0;
    rptAgg[k].count++;
    rptAgg[k].lots.add(ligne.numLot);
  }
}

// Comparaison
const allKeys = new Set([...Object.keys(bddAgg), ...Object.keys(rptAgg)]);
console.log(`\n=== Comparaison agrégée (CLCC × Fournisseur) — ${allKeys.size} tuples ===`);
console.log('CLCC           Fourn                BDD_TTC    Rpt_TTC    Δ          BDD_lignes  Rpt_BC  Lots');
const summary = { matched: 0, bddOnly: 0, rptOnly: 0, totalDelta: 0 };
const sortedKeys = [...allKeys].sort();
for (const k of sortedKeys) {
  const b = bddAgg[k];
  const r = rptAgg[k];
  const bTtc = b ? b.rows.reduce((s, x) => s + x.cattc, 0) : 0;
  const rTtc = r ? r.totalTtc : 0;
  const delta = rTtc - bTtc;
  summary.totalDelta += Math.abs(delta);
  if (b && r) summary.matched++;
  else if (b) summary.bddOnly++;
  else summary.rptOnly++;
  const status = !r ? 'BDD-only' : !b ? 'RPT-only' : Math.abs(delta) < 1 ? 'OK' : 'Δ';
  if (status === 'OK' || (b && r && Math.abs(delta) < 100)) continue;  // n'affiche que les écarts notables
  console.log(`${(b||r).clcc.padEnd(15)} ${(b||r).fourn.padEnd(20)} ${bTtc.toFixed(0).padStart(10)} ${rTtc.toFixed(0).padStart(10)} ${delta.toFixed(0).padStart(10)}  ${String(b?.rows.length||0).padStart(10)}  ${String(r?.count||0).padStart(6)}  ${r ? [...r.lots].sort((a,b)=>a-b).join(',') : ''}  [${status}]`);
}
console.log(`\nRésumé : ${summary.matched} matched, ${summary.bddOnly} BDD-only, ${summary.rptOnly} Rpt-only — somme |Δ| = ${summary.totalDelta.toFixed(0)} €`);
