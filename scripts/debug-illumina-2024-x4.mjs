// Investigation du ratio x4 Illumina 2024 :
// pour 7 CLCC clés, on compare BDD vs reporting parsé.
import fs from 'fs';
import path from 'path';
import * as XLSX from 'xlsx';
import { loadBddRows } from './bdd-helpers.mjs';
import { parseSupplierReporting } from '../src/utils/bddBuilder/parseSupplierReporting.js';
import { loadNomenclature, matchEtablissement } from '../src/utils/bddBuilder/matchClcc.js';

globalThis.File = class { constructor(buf, name) { this._b = buf; this.name = name; } async arrayBuffer() { return this._b.buffer.slice(this._b.byteOffset, this._b.byteOffset + this._b.byteLength); } };
const makeFile = (p) => new File(fs.readFileSync(p), path.basename(p));

const SUIVI = 'C:/Users/g-gourrion/OneDrive - UNICANCER/Bureau/Saas/données reporting/Suivi_Invest_2026 - sauvegarde 26_01_26.xlsx';
const FILE = 'C:/Users/g-gourrion/OneDrive - UNICANCER/Bureau/Marchés/Biologie moléculaire/BM Reporting 2024/Reporting_PPE025_Unicancer_2024_ILLUMINA_KV 9 DEC 2024.xlsx';

const wbS = XLSX.read(fs.readFileSync(SUIVI), { type: 'buffer' });
const nomenclature = loadNomenclature(wbS);
const r = await parseSupplierReporting(makeFile(FILE));
console.log(`Illumina 2024 — ${r.lignes.length} lignes`);

// Distribution complète par numLot
const byLot = {};
for (const l of r.lignes) byLot[l.numLot] = (byLot[l.numLot] || 0) + 1;
console.log(`\nLignes par numLot :`);
for (const [k, v] of Object.entries(byLot).sort((a,b)=>Number(a[0])-Number(b[0]))) {
  console.log(`  Lot ${k.padStart(3)} : ${v} lignes`);
}

// Inspect du fichier brut directement
const wb = XLSX.read(fs.readFileSync(FILE), { type: 'buffer' });
console.log(`\nSheets du fichier : ${wb.SheetNames.join(' | ')}`);

for (const sn of wb.SheetNames) {
  const ws = wb.Sheets[sn];
  const ref = ws['!ref'];
  if (!ref) continue;
  const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', blankrows: false });
  console.log(`\nSheet "${sn}" — ${data.length} rows`);
  // somme col 15 (TOTAL TTC) et col 13 (TOTAL HT) pour les 5 premières lignes pour validation
  if (sn.toLowerCase().includes('lot')) {
    let sumHt = 0, sumTtc = 0, count = 0;
    for (let i = 6; i < data.length; i++) {
      const ht = Number(data[i][13]) || 0;
      const ttc = Number(data[i][15]) || 0;
      if (ttc > 0) {
        sumHt += ht; sumTtc += ttc; count++;
      }
    }
    console.log(`  Sum col 13 (TOTAL HT) sur ${count} lignes : ${sumHt.toFixed(0)} €`);
    console.log(`  Sum col 15 (TOTAL TTC) sur ${count} lignes : ${sumTtc.toFixed(0)} €`);
  }
}

// Maintenant agrégation par CLCC du parser
console.log('\n=== Reporting agrégé par CLCC (parser actuel) ===');
const byClcc = {};
for (const l of r.lignes) {
  const m = matchEtablissement(l.etablissement, nomenclature);
  const k = m.nomenclature || `??(${l.etablissement})`;
  if (!byClcc[k]) byClcc[k] = { lines: 0, totalTtc: 0 };
  byClcc[k].lines++;
  byClcc[k].totalTtc += Number(l.montantTtc) || 0;
}
console.log('CLCC               Lignes   Total TTC');
for (const [k, v] of Object.entries(byClcc).sort((a,b)=>b[1].totalTtc-a[1].totalTtc)) {
  console.log(`  ${k.padEnd(15)} ${String(v.lines).padStart(6)}   ${v.totalTtc.toFixed(0).padStart(12)}`);
}

// BDD pour comparaison
console.log('\n=== BDD pour Illumina 2024 ===');
const bdd = loadBddRows(SUIVI);
const ill2024 = bdd.filter(r =>
  String(r['Année']) === '2024' &&
  String(r['Lot'] ?? '').includes('PPE025') &&
  String(r['Fournisseur'] ?? '').toLowerCase().includes('illumina')
);
console.log(`${ill2024.length} lignes BDD`);
const bddByClcc = {};
for (const row of ill2024) {
  const k = row['CLCC unique'];
  bddByClcc[k] = (bddByClcc[k] || 0) + (Number(row['CATTC']) || 0);
}
console.log('CLCC               BDD CATTC');
for (const [k, v] of Object.entries(bddByClcc).sort((a,b)=>b[1]-a[1])) {
  console.log(`  ${k.padEnd(15)}   ${v.toFixed(0).padStart(12)}`);
}

// Ratios
console.log('\n=== Ratios Algo / BDD par CLCC ===');
for (const k of Object.keys(byClcc)) {
  const algo = byClcc[k]?.totalTtc || 0;
  const bdd = bddByClcc[k] || 0;
  if (algo === 0 && bdd === 0) continue;
  const ratio = bdd > 0 ? (algo / bdd).toFixed(2) : 'N/A';
  console.log(`  ${k.padEnd(15)} algo=${algo.toFixed(0).padStart(10)}  bdd=${bdd.toFixed(0).padStart(10)}  ratio=${ratio}`);
}
