import * as XLSX from 'xlsx';
import fs from 'fs';

const p = process.argv[2];
const wb = XLSX.read(fs.readFileSync(p), { type: 'buffer', cellFormula: true });
const ws = wb.Sheets['BDD'];
const range = XLSX.utils.decode_range(ws['!ref']);

// Find last row where col A has a value
let lastDataRow = 0;
for (let r = 0; r <= range.e.r; r++) {
  const cell = ws[XLSX.utils.encode_cell({ r, c: 0 })];
  if (cell && cell.v && (cell.v === 'Unicancer' || cell.v === 'Etablissement affilié')) {
    lastDataRow = r;
  }
}
console.log('Last data row (0-indexed):', lastDataRow, '(Excel row', lastDataRow + 1, ')');

// Show formulas on last 3 data rows
for (let r = lastDataRow - 2; r <= lastDataRow; r++) {
  console.log(`\n--- row ${r + 1} ---`);
  for (let c = 0; c <= 27; c++) {
    const addr = XLSX.utils.encode_cell({ r, c });
    const cell = ws[addr];
    if (!cell) continue;
    const colLetter = XLSX.utils.encode_col(c);
    if (cell.f) console.log(`  ${colLetter}: f=${cell.f}  v=${cell.v}`);
    else console.log(`  ${colLetter}: v=${String(cell.v).slice(0, 40)}`);
  }
}
