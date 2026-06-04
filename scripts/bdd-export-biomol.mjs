import * as XLSX from 'xlsx';
import fs from 'fs';

const SUIVI = 'C:/Users/g-gourrion/OneDrive - UNICANCER/Bureau/Saas/données reporting/Suivi_Invest_2026 - sauvegarde 26_01_26.xlsx';
const wb = XLSX.read(fs.readFileSync(SUIVI), { type: 'buffer' });
const ws = wb.Sheets['BDD'];

// Lecture par lignes (array of arrays) pour éviter d'instancier 16384 colonnes par ligne.
// On limite à la colonne AB (28) qui contient toutes les vraies données BDD.
const range = XLSX.utils.decode_range(ws['!ref']);
range.e.c = Math.min(range.e.c, 27);
ws['!ref'] = XLSX.utils.encode_range(range);
const rows2d = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', blankrows: false });
const headers = (rows2d[0] || []).map(h => String(h).trim());
const objs = rows2d.slice(1).map(row => {
  const o = {};
  for (let i = 0; i < headers.length; i++) o[headers[i]] = row[i] ?? '';
  return o;
});

// Filtre : Marché=Biologie moléculaire (ou Lot contient PPE025)
const biomol = objs.filter(r =>
  String(r['Marché'] ?? '').toLowerCase().includes('biologie') ||
  String(r['Lot'] ?? '').toLowerCase().includes('biologie mol')
);

console.log(`Total BioMol BDD : ${biomol.length}`);

// Stats par année
const byYear = {};
for (const r of biomol) {
  const y = String(r['Année'] || '').trim();
  byYear[y] = (byYear[y] || 0) + 1;
}
console.log('\nPar année :');
for (const [y, n] of Object.entries(byYear).sort()) console.log(`  ${y}: ${n}`);

// Stats par lot pour PPE025
const lotsPpe025 = {};
for (const r of biomol) {
  const lot = String(r['Lot'] ?? '').trim();
  if (!lot.includes('PPE025')) continue;
  lotsPpe025[lot] = (lotsPpe025[lot] || 0) + 1;
}
console.log('\nLots PPE025 :');
for (const [k, v] of Object.entries(lotsPpe025).sort((a,b)=>b[1]-a[1])) console.log(`  ${v.toString().padStart(4)}  ${k}`);

// Pour chaque année, stats sur Quantite/CATTC remplis vs vides
console.log('\n=== Stats par année (PPE025 only) ===');
for (const y of ['2023', '2024', '2025']) {
  const yr = biomol.filter(r => String(r['Année']) === y && String(r['Lot'] ?? '').includes('PPE025'));
  let withTtc = 0, withQte = 0;
  let totalTtc = 0, ttcs = [];
  for (const r of yr) {
    const ttc = Number(r['CATTC'] || 0);
    const qte = Number(r['QUANTITE'] || 0);
    if (ttc > 0) { withTtc++; totalTtc += ttc; ttcs.push(ttc); }
    if (qte > 0) withQte++;
  }
  ttcs.sort((a,b)=>a-b);
  const med = ttcs.length ? ttcs[Math.floor(ttcs.length/2)] : 0;
  console.log(`  ${y}: ${yr.length} lignes — ${withTtc} avec TTC>0 (médiane ${med.toFixed(0)} €) — ${withQte} avec qté>0`);
}

// Détail full pour 2023 (qui a le plus de lignes "réelles")
console.log('\n=== BDD BioMol 2023 (49 lignes) ===');
const y2023 = biomol.filter(r => String(r['Année']) === '2023' && String(r['Lot'] ?? '').includes('PPE025'));
for (const r of y2023) {
  const ttc = Number(r['CATTC'] || 0);
  const qte = r['QUANTITE'] || '';
  console.log(`  [${r['Lot']?.padEnd(40)?.slice(0,40)}] ${(r['CLCC unique']||'').padEnd(15)} ${(r['Fournisseur']||'').padEnd(20)} ${(r["Type d'équipement"]||'').padEnd(13)} qte=${String(qte).padStart(4)} ttc=${ttc.toFixed(0).padStart(10)} ${(r['Nom equipement']||'').slice(0, 50)}`);
}

// Et les lignes 2024 qui ont un montant >0
console.log('\n=== BDD BioMol 2024 avec TTC>0 ===');
const y2024nz = biomol.filter(r => String(r['Année']) === '2024' && Number(r['CATTC'] || 0) > 0);
console.log(`${y2024nz.length} lignes avec CATTC > 0`);
for (const r of y2024nz) {
  console.log(`  [${r['Lot']?.padEnd(40)?.slice(0,40)}] ${(r['CLCC unique']||'').padEnd(15)} ${(r['Fournisseur']||'').padEnd(20)} qte=${String(r['QUANTITE']||'').padStart(4)} ttc=${Number(r['CATTC']||0).toFixed(0).padStart(10)} ${(r['Nom equipement']||'').slice(0, 50)}`);
}

// Comparaison avec Anapath PPE028 — est-ce que LÀ il y a des montants réels ?
console.log('\n=== Anapath PPE028 — stats ===');
const anapath = objs.filter(r => String(r['Marché'] ?? '').toLowerCase().includes('anatomo'));
let withTtc = 0, totalTtc = 0;
for (const r of anapath) {
  const ttc = Number(r['CATTC'] || 0);
  if (ttc > 0) { withTtc++; totalTtc += ttc; }
}
console.log(`Total: ${anapath.length} lignes, ${withTtc} avec TTC>0 (somme ${(totalTtc/1e6).toFixed(2)} M€)`);

// Lignes 2018-2021 BioMol
console.log('\n=== BDD BioMol 2018-2021 (legacy) — exemples ===');
const legacy = biomol.filter(r => ['2018','2019','2020','2021'].includes(String(r['Année'])));
for (const r of legacy.slice(0, 12)) {
  console.log(`  ${String(r['Année']||'').padEnd(5)} [${r['Lot']?.padEnd(35)?.slice(0,35)}] ${(r['CLCC unique']||'').padEnd(15)} ${(r['Fournisseur']||'').padEnd(15)} ${(r["Type d'équipement"]||'').padEnd(13)} qte=${String(r['QUANTITE']||'').padStart(4)} ttc=${Number(r['CATTC']||0).toFixed(0).padStart(10)}`);
}
