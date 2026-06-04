// Trouve la ligne avec etablissement vide et montant 5.6M€ dans Illumina 2024
import fs from 'fs';
import path from 'path';
import { parseSupplierReporting } from '../src/utils/bddBuilder/parseSupplierReporting.js';

globalThis.File = class { constructor(buf, name) { this._b = buf; this.name = name; } async arrayBuffer() { return this._b.buffer.slice(this._b.byteOffset, this._b.byteOffset + this._b.byteLength); } };
const FILE = 'C:/Users/g-gourrion/OneDrive - UNICANCER/Bureau/Marchés/Biologie moléculaire/BM Reporting 2024/Reporting_PPE025_Unicancer_2024_ILLUMINA_KV 9 DEC 2024.xlsx';
const r = await parseSupplierReporting(new File(fs.readFileSync(FILE), path.basename(FILE)));

const phantoms = r.lignes.filter(l => !l.etablissement || l.etablissement.trim() === '');
console.log(`${phantoms.length} ligne(s) sans etablissement :\n`);
for (const p of phantoms) {
  console.log(`  sheet=${p.sourceSheet} row=${p.sourceRow} numLot=${p.numLot} qte=${p.quantite} ttc=${p.montantTtc} designation="${(p.designation||'').slice(0, 60)}"`);
}

// Top 5 lignes par montant TTC
console.log(`\nTop 5 lignes par montant TTC :`);
const top = [...r.lignes].sort((a,b)=>(Number(b.montantTtc)||0)-(Number(a.montantTtc)||0)).slice(0, 5);
for (const t of top) {
  console.log(`  TTC=${(t.montantTtc||0).toFixed(0).padStart(10)}  qte=${t.quantite}  numLot=${t.numLot}  etab="${(t.etablissement||'').slice(0,40)}"  des="${(t.designation||'').slice(0,40)}"  row=${t.sourceRow}`);
}
