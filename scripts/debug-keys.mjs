import * as XLSX from 'xlsx';
import fs from 'fs';

const SUIVI = 'C:/Users/g-gourrion/OneDrive - UNICANCER/Bureau/Saas/données reporting/Suivi_Invest_2026 - sauvegarde 26_01_26.xlsx';
const wb = XLSX.read(fs.readFileSync(SUIVI), { type: 'buffer' });
const ws = wb.Sheets['BDD'];
const objs = XLSX.utils.sheet_to_json(ws, { defval: '' });

console.log('Clés du premier objet :');
const first = objs[0];
for (const k of Object.keys(first)) {
  console.log(`  ${JSON.stringify(k)}  →  ${JSON.stringify(String(first[k]).slice(0, 30))}`);
}
