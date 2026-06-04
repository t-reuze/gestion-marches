// Détail Promega 2024 : reporting source vs BDD ground truth
import fs from 'fs';
import path from 'path';
import * as XLSX from 'xlsx';
import { loadBddRows } from './bdd-helpers.mjs';
import { parseSupplierReporting } from '../src/utils/bddBuilder/parseSupplierReporting.js';
import { loadNomenclature, matchEtablissement } from '../src/utils/bddBuilder/matchClcc.js';

globalThis.File = class { constructor(buf, name) { this._b = buf; this.name = name; } async arrayBuffer() { return this._b.buffer.slice(this._b.byteOffset, this._b.byteOffset + this._b.byteLength); } };
const makeFile = (p) => new File(fs.readFileSync(p), path.basename(p));

const SUIVI = 'C:/Users/g-gourrion/OneDrive - UNICANCER/Bureau/Saas/données reporting/Suivi_Invest_2026 - sauvegarde 26_01_26.xlsx';
const REPORTING = 'C:/Users/g-gourrion/OneDrive - UNICANCER/Bureau/Marchés/Biologie moléculaire/BM Reporting 2024/Reporting_PPE025_Unicancer_2024_PROMEGA.xlsx';

const wbSuivi = XLSX.read(fs.readFileSync(SUIVI), { type: 'buffer' });
const nomenclature = loadNomenclature(wbSuivi);

console.log('═════════════════════════════════════════════════════');
console.log('A) Reporting source — Reporting_PPE025_Unicancer_2024_PROMEGA.xlsx');
console.log('═════════════════════════════════════════════════════\n');
const r = await parseSupplierReporting(makeFile(REPORTING));
console.log(`Total parsé : ${r.lignes.length} lignes\n`);

// Agrégation par CLCC matché
const byClcc = {};
for (const l of r.lignes) {
  const m = matchEtablissement(l.etablissement, nomenclature);
  const k = m.nomenclature || `??(${l.etablissement})`;
  if (!byClcc[k]) byClcc[k] = { lines: 0, totalTtc: 0, sourceRows: [], etabRaw: l.etablissement };
  byClcc[k].lines++;
  byClcc[k].totalTtc += Number(l.montantTtc) || 0;
  byClcc[k].sourceRows.push(l.sourceRow);
}
console.log('Agrégation par CLCC dans le reporting Promega 2024 :');
console.log('CLCC                Nb lignes    Total TTC          Premières lignes Excel (à vérifier)');
for (const [k, v] of Object.entries(byClcc).sort((a,b) => b[1].totalTtc - a[1].totalTtc)) {
  console.log(`  ${k.padEnd(18)} ${String(v.lines).padStart(8)}   ${v.totalTtc.toFixed(2).padStart(12)} €   lignes ${v.sourceRows.slice(0,5).join(', ')}${v.sourceRows.length>5?'...':''}`);
}

console.log('\n═════════════════════════════════════════════════════');
console.log('B) BDD ground truth — Suivi_Invest_2026 - sauvegarde 26_01_26.xlsx, onglet BDD');
console.log('═════════════════════════════════════════════════════\n');
const bdd = loadBddRows(SUIVI);
const promega2024 = bdd.filter(r =>
  String(r['Année']) === '2024' &&
  String(r['Lot'] ?? '').includes('PPE025') &&
  String(r['Fournisseur'] ?? '').toLowerCase().includes('promega')
);
console.log(`Lignes BDD Promega 2024 : ${promega2024.length}\n`);
console.log('CLCC                Lot                                    Type             Qté   CATTC');
for (const row of promega2024) {
  console.log(`  ${(row['CLCC unique']||'').padEnd(18)} ${(row['Lot']||'').padEnd(40).slice(0,40)}  ${(row["Type d'équipement"]||'').padEnd(15)}  ${String(row['QUANTITE']||'').padStart(3)}   ${Number(row['CATTC']||0).toFixed(0).padStart(10)}`);
}

console.log('\n═════════════════════════════════════════════════════');
console.log('C) Vérification manuelle — instructions Ctrl+F');
console.log('═════════════════════════════════════════════════════');
console.log(`
Dans le fichier reporting :
  → Ouvrir : ${REPORTING}
  → Aller sur l'onglet "Lots 13-40" (les consommables)
  → Ctrl+F sur le nom de chaque CLCC pour vérifier sa présence et le total TTC associé :`);
for (const k of ['Bordeaux', 'Caen', 'Curie', 'Dijon', 'Clermont', 'ICO', 'Lyon', 'Rouen', 'Reims']) {
  const v = byClcc[k];
  if (v) console.log(`     • Ctrl+F "${k}" → présent ${v.lines}× → total ${v.totalTtc.toFixed(0)} €`);
  else console.log(`     • Ctrl+F "${k}" → ABSENT du reporting source`);
}
console.log(`
Dans la BDD ground truth :
  → Ouvrir : ${SUIVI}
  → Aller sur l'onglet BDD
  → Filtrer (ou Ctrl+F) sur "Promega" en colonne F (Fournisseur) ET "2024" en colonne I (Année)
  → Vérifier si chacun des CLCCs ci-dessus apparaît OU non.

VERDICT :
  Si les CLCCs sont présents dans le reporting MAIS absents de la BDD → la BDD est incomplète, mon algo a raison.
  Si les CLCCs sont absents du reporting → c'est mon algo qui se trompe (probablement à cause d'un mauvais matching CLCC).`);
