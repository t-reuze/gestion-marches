import * as XLSX from 'xlsx';
import fs from 'fs';

const [, , p, match] = process.argv;
const buf = fs.readFileSync(p);
const wb = XLSX.read(buf, { type: 'buffer' });
const ws = wb.Sheets['BDD'];
const objs = XLSX.utils.sheet_to_json(ws, { defval: '' });
const re = new RegExp(match, 'i');

const matched = objs.filter(r => re.test(String(r['Marché'] ?? '')) || re.test(String(r['Lot'] ?? '')));

const show = (r) => {
  const keep = ['Etablissement','CLCC unique','Marché',"Type d'équipement",'Lot','Fournisseur','Nom equipement','Année','QUANTITE','CATTC'];
  const o = {};
  for (const k of keep) o[k] = r[k];
  return o;
};
console.log(`Matched ${matched.length} rows for /${match}/`);
for (const r of matched.slice(0, 40)) console.log(JSON.stringify(show(r)));

console.log(`\n--- Distinct Type d'équipement in matches ---`);
const types = {};
for (const r of matched) {
  const t = String(r["Type d'équipement"] ?? '').trim();
  types[t] = (types[t] || 0) + 1;
}
for (const [k, v] of Object.entries(types).sort((a,b)=>b[1]-a[1])) console.log(`  ${v}  ${k}`);

console.log(`\n--- Distinct Lot in matches ---`);
const lots = {};
for (const r of matched) {
  const t = String(r['Lot'] ?? '').trim();
  lots[t] = (lots[t] || 0) + 1;
}
for (const [k, v] of Object.entries(lots).sort((a,b)=>b[1]-a[1])) console.log(`  ${v}  ${k}`);

console.log(`\n--- Distinct Fournisseur in matches ---`);
const four = {};
for (const r of matched) {
  const t = String(r['Fournisseur'] ?? '').trim();
  four[t] = (four[t] || 0) + 1;
}
for (const [k, v] of Object.entries(four).sort((a,b)=>b[1]-a[1])) console.log(`  ${v}  ${k}`);
