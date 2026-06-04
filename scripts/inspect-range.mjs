import * as XLSX from 'xlsx';
import fs from 'fs';

const [, , p, sheetName, fromR = '0', toR = '30', maxCols = '25'] = process.argv;
const buf = fs.readFileSync(p);
const wb = XLSX.read(buf, { type: 'buffer' });
const ws = wb.Sheets[sheetName];
if (!ws) { console.error('no sheet', sheetName, '—', wb.SheetNames); process.exit(1); }
const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', blankrows: false });
const a = Number(fromR), b = Math.min(Number(toR), data.length);
const nc = Number(maxCols);
console.log(`rows ${a}-${b-1}, first ${nc} cols`);
for (let i = a; i < b; i++) {
  const row = (data[i] || []).slice(0, nc).map(c => {
    const s = String(c);
    return s.length > 35 ? s.slice(0, 35) + '…' : s;
  });
  console.log(`[${i}]`, JSON.stringify(row));
}
