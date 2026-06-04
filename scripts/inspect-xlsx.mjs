import * as XLSX from 'xlsx';
import fs from 'fs';

const paths = process.argv.slice(2);
for (const p of paths) {
  try {
    const buf = fs.readFileSync(p);
    const wb = XLSX.read(buf, { type: 'buffer' });
    console.log('\n==========================================');
    console.log('FILE:', p);
    console.log('SHEETS:', wb.SheetNames);
    for (const name of wb.SheetNames) {
      const ws = wb.Sheets[name];
      const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
      console.log(`\n--- Sheet "${name}" (${range.e.r + 1} rows x ${range.e.c + 1} cols) ---`);
      const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', blankrows: false });
      const limit = Math.min(8, data.length);
      for (let i = 0; i < limit; i++) {
        const row = data[i];
        const preview = row.slice(0, 20).map(c => {
          const s = String(c);
          return s.length > 25 ? s.slice(0, 25) + '…' : s;
        });
        console.log(`  [${i}]`, JSON.stringify(preview));
      }
      if (data.length > limit) console.log(`  ... (${data.length - limit} autres lignes)`);
    }
  } catch (e) {
    console.error('ERR', p, e.message);
  }
}
