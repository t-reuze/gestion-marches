import fs from 'fs';
import * as XLSX from 'xlsx';
import { parseSupplierReporting } from '../src/utils/bddBuilder/parseSupplierReporting.js';
import { loadNomenclature } from '../src/utils/bddBuilder/matchClcc.js';
import { buildBddRows, summarize } from '../src/utils/bddBuilder/buildBddRows.js';
import { appendBddRows } from '../src/utils/bddBuilder/exportSuiviInvest.js';
import { MARCHE_INVEST_CONFIG } from '../src/data/marcheInvestConfig.js';

globalThis.File = class MockFile {
  constructor(buf, name) { this._buf = buf; this.name = name; }
  async arrayBuffer() { return this._buf.buffer.slice(this._buf.byteOffset, this._buf.byteOffset + this._buf.byteLength); }
};

function makeFile(p) {
  const buf = fs.readFileSync(p);
  return new File(buf, p.split('/').pop());
}

// === Test e2e BioMol 2024 ===
console.log('\n=== E2E BioMol 2024 (3 fichiers fournisseurs) ===');
const SUIVI = 'C:/Users/g-gourrion/OneDrive - UNICANCER/Bureau/Saas/données reporting/Suivi_Invest_2026 - sauvegarde 26_01_26.xlsx';
const wb = XLSX.read(fs.readFileSync(SUIVI), { type: 'buffer', cellFormula: true });
const nomenclature = loadNomenclature(wb);
console.log(`Nomenclature: ${nomenclature.length} entrées`);

const supplierFiles = [
  'C:/Users/g-gourrion/OneDrive - UNICANCER/Bureau/Marchés/Biologie moléculaire/BM Reporting 2024/Reporting_PPE025_Unicancer_2024_AGILENT janv-oct.xlsx',
  'C:/Users/g-gourrion/OneDrive - UNICANCER/Bureau/Marchés/Biologie moléculaire/BM Reporting 2024/Copie de Reporting_PPE025_Unicancer_2024_LIFE TECH.xlsx',
  'C:/Users/g-gourrion/OneDrive - UNICANCER/Bureau/Marchés/Biologie moléculaire/BM Reporting 2024/Reporting_PPE025_Unicancer_2024_PROMEGA.xlsx',
];

const reportings = [];
for (const p of supplierFiles) {
  const r = await parseSupplierReporting(makeFile(p));
  console.log(`  ${r.fournisseur.padEnd(20)} → ${r.lignes.length} lignes`);
  reportings.push(r);
}

const cfg = MARCHE_INVEST_CONFIG['bio-mol'];
const rows = buildBddRows(reportings, cfg, nomenclature);
console.log('\nSummary:', summarize(rows));

// Sample of results per lot
const byLot = {};
for (const r of rows) {
  const l = r.bdd['Lot'];
  byLot[l] = (byLot[l] || 0) + 1;
}
console.log('\nRépartition par lot:');
for (const [k, v] of Object.entries(byLot).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${v.toString().padStart(4)}  ${k}`);
}

// Sample rows
console.log('\nExemple lignes OK:');
const okRows = rows.filter(r => r.status === 'ok');
for (const r of okRows.slice(0, 5)) {
  const b = r.bdd;
  console.log(`  ${b['CLCC unique'].padEnd(14)} | ${b['Lot'].padEnd(45)} | ${b['Fournisseur'].padEnd(18)} | ${String(b['Nom equipement']).padEnd(30).slice(0,30)} | ${b['Année']} | qte=${b['QUANTITE']} | ttc=${b['CATTC']}`);
}

console.log('\nExemple lignes ERROR:');
const errRows = rows.filter(r => r.status === 'error');
for (const r of errRows.slice(0, 5)) {
  console.log(`  ${JSON.stringify(r.warnings)}  source=${r.source.fileName}:${r.source.row}`);
}

console.log('\nExemple lignes WARNING:');
const warnRows = rows.filter(r => r.status === 'warning');
for (const r of warnRows.slice(0, 5)) {
  console.log(`  ${JSON.stringify(r.warnings)}`);
}

// Append + write
const okAndWarn = rows.filter(r => r.status !== 'error');
console.log(`\nInsertion de ${okAndWarn.length} lignes dans BDD...`);

const { insertedCount, lastRow } = appendBddRows(wb, okAndWarn);
console.log(`Inséré ${insertedCount} lignes. Nouvelle dernière ligne: ${lastRow + 1}`);

// Write out
const out = `c:/tmp/Suivi_Invest_test_${Date.now()}.xlsx`;
const outDir = 'c:/tmp';
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);
XLSX.writeFile(wb, out, { cellStyles: true });
console.log(`Fichier écrit: ${out}`);
