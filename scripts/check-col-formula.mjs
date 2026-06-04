import * as XLSX from 'xlsx';
import fs from 'fs';

const p = process.argv[2];
const colLetter = process.argv[3] || 'V';
const wb = XLSX.read(fs.readFileSync(p), { type: 'buffer', cellFormula: true });
const ws = wb.Sheets['BDD'];
const range = XLSX.utils.decode_range(ws['!ref']);
const col = XLSX.utils.decode_col(colLetter);

const formulas = {};
const values = {};
for (let r = 1; r <= range.e.r; r++) {
  const cell = ws[XLSX.utils.encode_cell({ r, c: col })];
  if (!cell) continue;
  if (cell.f) formulas[cell.f] = (formulas[cell.f] || 0) + 1;
  else if (cell.v !== '' && cell.v != null) values[String(cell.v).slice(0, 30)] = (values[String(cell.v).slice(0, 30)] || 0) + 1;
}
console.log(`Col ${colLetter} — ${Object.values(formulas).reduce((a,b)=>a+b,0)} cells with formula, ${Object.values(values).reduce((a,b)=>a+b,0)} cells with value only`);
console.log('\n-- Formules les plus fréquentes --');
for (const [f, n] of Object.entries(formulas).sort((a,b)=>b[1]-a[1]).slice(0, 5)) {
  console.log(`  ${n} × ${f.slice(0, 100)}`);
}
console.log('\n-- Valeurs les plus fréquentes --');
for (const [v, n] of Object.entries(values).sort((a,b)=>b[1]-a[1]).slice(0, 5)) {
  console.log(`  ${n} × ${v}`);
}
