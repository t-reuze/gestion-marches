import fs from 'fs';
import path from 'path';
import { parseSupplierReporting } from '../src/utils/bddBuilder/parseSupplierReporting.js';

globalThis.File = class { constructor(buf, name) { this._b = buf; this.name = name; } async arrayBuffer() { return this._b.buffer.slice(this._b.byteOffset, this._b.byteOffset + this._b.byteLength); } };
const makeFile = (p) => new File(fs.readFileSync(p), path.basename(p));

const FILE = 'C:/Users/g-gourrion/OneDrive - UNICANCER/Bureau/Marchés/Biologie moléculaire/BM Reporting 2024/Reporting_PPE025_Unicancer_2024_ILLUMINA_KV 9 DEC 2024.xlsx';
const r = await parseSupplierReporting(makeFile(FILE));
console.log(`Fournisseur: ${r.fournisseur}, ${r.lignes.length} lignes`);

// Distribution par lot
const byLot = {};
for (const l of r.lignes) {
  byLot[l.numLot] = (byLot[l.numLot] || 0) + 1;
}
console.log('\nPar n° lot :');
for (const [k, v] of Object.entries(byLot).sort((a, b) => Number(a[0]) - Number(b[0]))) {
  console.log(`  Lot ${k.padStart(3)} : ${v} lignes`);
}

// Sample 5 premières lignes
console.log('\n5 premières lignes :');
for (const l of r.lignes.slice(0, 5)) {
  console.log(`  L${l.numLot.toString().padStart(3)} ${(l.date?.toISOString().slice(0,10) || '??').padEnd(10)} ${(l.etablissement||'').padEnd(35).slice(0,35)} qte=${String(l.quantite).padStart(4)} ttc=${(Number(l.montantTtc)||0).toFixed(0).padStart(10)}  ${(l.designation||'').slice(0,40)}`);
}

// Total TTC
const total = r.lignes.reduce((s, l) => s + (Number(l.montantTtc) || 0), 0);
console.log(`\nTotal TTC sur ce fichier : ${total.toFixed(0)} €`);

// Distribution par CLCC
const byEtab = {};
for (const l of r.lignes) {
  byEtab[l.etablissement] = (byEtab[l.etablissement] || 0) + (Number(l.montantTtc) || 0);
}
console.log('\nTop 10 etablissements :');
for (const [k, v] of Object.entries(byEtab).sort((a,b)=>b[1]-a[1]).slice(0, 10)) {
  console.log(`  ${k.padEnd(50).slice(0,50)} ${v.toFixed(0).padStart(12)} €`);
}
