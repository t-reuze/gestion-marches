import * as XLSX from 'xlsx';
import fs from 'fs';

const p = process.argv[2];
const buf = fs.readFileSync(p);
const wb = XLSX.read(buf, { type: 'buffer' });
const ws = wb.Sheets['BDD'];
const objs = XLSX.utils.sheet_to_json(ws, { defval: '' });

const counts = (key) => {
  const m = {};
  for (const r of objs) {
    const v = String(r[key] ?? '').trim();
    if (!v) continue;
    m[v] = (m[v] || 0) + 1;
  }
  return Object.entries(m).sort((a, b) => b[1] - a[1]);
};

const keys = ['Etablissement', 'CLCC unique', 'Marché', "Type d'équipement", 'Lot', 'Fournisseur', 'Année'];
for (const k of keys) {
  console.log(`\n=== ${k} ===`);
  const c = counts(k);
  for (const [v, n] of c.slice(0, 50)) console.log(`  ${n.toString().padStart(4)}  ${v}`);
  if (c.length > 50) console.log(`  ... (${c.length - 50} more)`);
}

console.log(`\nTOTAL ROWS: ${objs.length}`);
