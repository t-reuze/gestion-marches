import fs from 'fs';
import path from 'path';
import { parseSupplierReporting } from '../src/utils/bddBuilder/parseSupplierReporting.js';

globalThis.File = class { constructor(buf, name) { this._b = buf; this.name = name; } async arrayBuffer() { return this._b.buffer.slice(this._b.byteOffset, this._b.byteOffset + this._b.byteLength); } };
const makeFile = (p) => new File(fs.readFileSync(p), path.basename(p));

const FILE = 'C:/Users/g-gourrion/OneDrive - UNICANCER/Bureau/Marchés/Biologie moléculaire/BM Reporting 2023/ILLUMINA_Suivi_commandes_BM_2023.xlsx';
const r = await parseSupplierReporting(makeFile(FILE));
console.log(`Fournisseur: ${r.fournisseur}, ${r.lignes.length} lignes`);

// Premières lignes complètes
console.log('\n5 premières lignes parsées :');
for (const l of r.lignes.slice(0, 5)) {
  console.log(`  L${l.numLot}  qte=${l.quantite}  prixTtc=${l.prixTtc}  montantTtc=${l.montantTtc}  designation=${(l.designation||'').slice(0,40)}  etab=${(l.etablissement||'').slice(0,40)}`);
}

// Stats
let nz = 0, total = 0;
for (const l of r.lignes) {
  if (Number(l.montantTtc) > 0) nz++;
  total += Number(l.montantTtc) || 0;
}
console.log(`\n${nz}/${r.lignes.length} lignes avec montantTtc > 0, total = ${total.toFixed(0)} €`);
