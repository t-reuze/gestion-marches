import * as XLSX from 'xlsx';
import fs from 'fs';

const p = process.argv[2];
const wb = XLSX.read(fs.readFileSync(p), { type: 'buffer', cellFormula: true });
const ws = wb.Sheets['BDD'];
const range = XLSX.utils.decode_range(ws['!ref']);
console.log('Range:', ws['!ref'], '→ lastRow:', range.e.r);

const lastFewRows = [range.e.r - 2, range.e.r - 1, range.e.r];
for (const r of lastFewRows) {
  console.log(`\n--- row ${r + 1} (1-indexed) ---`);
  for (let c = 0; c <= 27; c++) {
    const addr = XLSX.utils.encode_cell({ r, c });
    const cell = ws[addr];
    if (!cell) continue;
    const colLetter = XLSX.utils.encode_col(c);
    if (cell.f) console.log(`  ${colLetter}: f=${cell.f}  v=${cell.v}`);
    else console.log(`  ${colLetter}: v=${cell.v}`);
  }
}
