// Debug MM France 2024 : trouver les établissements non matchés
import fs from 'fs';
import path from 'path';
import * as XLSX from 'xlsx';
import { loadBddRows } from './bdd-helpers.mjs';
import { parseSupplierReporting } from '../src/utils/bddBuilder/parseSupplierReporting.js';
import { loadNomenclature, matchEtablissement } from '../src/utils/bddBuilder/matchClcc.js';

globalThis.File = class { constructor(buf, name) { this._b = buf; this.name = name; } async arrayBuffer() { return this._b.buffer.slice(this._b.byteOffset, this._b.byteOffset + this._b.byteLength); } };
const makeFile = (p) => new File(fs.readFileSync(p), path.basename(p));

const SUIVI = 'C:/Users/g-gourrion/OneDrive - UNICANCER/Bureau/Saas/données reporting/Suivi_Invest_2026 - sauvegarde 26_01_26.xlsx';
const FILES = [
  'C:/Users/g-gourrion/OneDrive - UNICANCER/Bureau/Marchés/Anatomopathologie/ACP Reporting 2024/4.Retours/241129-Reporting_PPE028_Unicancer_2024_MM FRANCE.XLSX',
  'C:/Users/g-gourrion/OneDrive - UNICANCER/Bureau/Marchés/Anatomopathologie/ACP Reporting 2024/1.Mi-année 2024/Du 301123 au 310724-Suivi_des_commandes_Anapath_Unicancer_2023.08.xlsx',
];

const wbS = XLSX.read(fs.readFileSync(SUIVI), { type: 'buffer' });
const nomenclature = loadNomenclature(wbS);

for (const f of FILES) {
  console.log(`\n=== ${path.basename(f)} ===`);
  const r = await parseSupplierReporting(makeFile(f));
  console.log(`Fournisseur: ${r.fournisseur}, ${r.lignes.length} lignes\n`);
  for (const l of r.lignes) {
    const m = matchEtablissement(l.etablissement, nomenclature);
    const flag = m.nomenclature ? `→ ${m.nomenclature.padEnd(22)}` : '→ ?? NON MATCHÉ';
    console.log(`  L${String(l.numLot).padStart(2)} ${(l.etablissement||'').padEnd(40).slice(0,40)} ${flag}  ttc=${(l.montantTtc||0).toFixed(0).padStart(8)}  ${(l.designation||'').slice(0,30)}`);
  }
}
