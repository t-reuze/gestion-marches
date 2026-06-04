import * as XLSX from 'xlsx';
import fs from 'fs';

const p = process.argv[2];
const sheetName = process.argv[3] || 'BDD';
const nRows = Number(process.argv[4] || 5);

const buf = fs.readFileSync(p);
const wb = XLSX.read(buf, { type: 'buffer' });
const ws = wb.Sheets[sheetName];
if (!ws) { console.error('no sheet', sheetName, '— available:', wb.SheetNames); process.exit(1); }

const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', blankrows: false });
const headers = data[0] || [];
console.log(`\n=== ${sheetName} — ${headers.length} columns ===`);
headers.forEach((h, i) => console.log(`  col${i} (${XLSX.utils.encode_col(i)}): ${JSON.stringify(h)}`));

console.log(`\n=== First ${nRows} data rows (as objects) ===`);
const objs = XLSX.utils.sheet_to_json(ws, { defval: '' });
for (let i = 0; i < Math.min(nRows, objs.length); i++) {
  console.log(`--- row ${i} ---`);
  for (const [k, v] of Object.entries(objs[i])) {
    const s = String(v);
    console.log(`  ${k}: ${s.length > 60 ? s.slice(0, 60) + '…' : s}`);
  }
}
console.log(`\nTotal data rows: ${objs.length}`);
