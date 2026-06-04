import fs from 'fs';
import * as XLSX from 'xlsx';
import { loadNomenclature, matchEtablissement } from '../src/utils/bddBuilder/matchClcc.js';

const SUIVI = 'C:/Users/g-gourrion/OneDrive - UNICANCER/Bureau/Saas/données reporting/Suivi_Invest_2026 - sauvegarde 26_01_26.xlsx';
const buf = fs.readFileSync(SUIVI);
const wb = XLSX.read(buf, { type: 'buffer' });
const nom = loadNomenclature(wb);
console.log(`Nomenclature chargée : ${nom.length} entrées`);

const inputs = [
  'Centre Eugène Marquis - Rennes',
  'Hopital Du Haut Leveque - Pessac',
  'Centre Regional Leon-Berard - Lyon',
  'Center François Baclesse - Caen',
  'IPC Marseille',
  'CENTRE LECLERC DIJON',
  'PAOLI CALMETTE',
  'INSTITUT BERGONIE',
  'CHR LILLE',
  'CENTRE PAUL PAPIN',
  'Institut Gustave Roussy - Villejuif',
  'CHU_Reims',
  'CAMPUS NICE',
  'SITE CANCEROPOLE',
  'Centre Antoine Lacassagne - Nice',
  'Centre Eugène Marquis',
  'Unknown Place XYZ',
];

for (const i of inputs) {
  const r = matchEtablissement(i, nom);
  console.log(`${(i + '').padEnd(45)} → ${r.nomenclature.padEnd(18)} (${r.type.padEnd(21)} ${r.matchedVia}, conf=${r.confidence.toFixed(2)})`);
}
