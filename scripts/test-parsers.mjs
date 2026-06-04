import * as XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';

// Mock File API pour pouvoir appeler les parsers node-side
globalThis.File = class MockFile {
  constructor(buf, name) { this._buf = buf; this.name = name; }
  async arrayBuffer() { return this._buf.buffer.slice(this._buf.byteOffset, this._buf.byteOffset + this._buf.byteLength); }
};

// Node can't resolve 'mammoth/mammoth.browser' without .js — patch to use node entry
import mammothNode from 'mammoth';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
require.cache[require.resolve('mammoth/mammoth.browser.js')] = {
  exports: { default: mammothNode, ...mammothNode },
};

// parseAllotissement uses mammoth.browser; in node we stub via Function
async function parseAllotissement(file) {
  const name = file.name.toLowerCase();
  const buf = await file.arrayBuffer();
  if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
    const mod = await import('../src/utils/bddBuilder/parseAllotissement.js').catch(() => null);
    // fallback si l'import principal plante à cause de mammoth : on réutilise la fonction xlsx
    const XLSX = await import('xlsx');
    const wb = XLSX.read(buf, { type: 'array' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', blankrows: false });
    const lots = [];
    for (const r of rows) {
      const n = Number(String(r[0]).trim());
      if (Number.isInteger(n) && n > 0) lots.push({ numLot: n, objet: String(r[1] || '').trim(), description: String(r[2] || '').trim() });
    }
    return lots;
  }
  if (name.endsWith('.docx')) {
    const { value: text } = await mammothNode.extractRawText({ buffer: Buffer.from(buf) });
    const lots = [];
    const seen = new Set();
    const LOT_REGEX = /^\s*lot\s*(\d+)\s*[:\-–]\s*(.+?)\s*$/i;
    for (const line of text.split(/\r?\n/)) {
      const m = line.trim().match(LOT_REGEX);
      if (!m) continue;
      const n = Number(m[1]);
      if (seen.has(n)) continue;
      seen.add(n);
      lots.push({ numLot: n, objet: m[2], description: '' });
    }
    lots.sort((a, b) => a.numLot - b.numLot);
    return lots;
  }
  throw new Error(`Format non supporté : ${file.name}`);
}

const { parseSupplierReporting } = await import('../src/utils/bddBuilder/parseSupplierReporting.js');

function makeFile(p) {
  const buf = fs.readFileSync(p);
  return new File(buf, path.basename(p));
}

// Test allotissement ACP (xlsx)
console.log('\n=== Allotissement ACP (xlsx) ===');
const acpAllot = await parseAllotissement(makeFile('C:/Users/g-gourrion/OneDrive - UNICANCER/Bureau/Marchés/Anatomopathologie/Allotissement.xlsx'));
console.log(JSON.stringify(acpAllot, null, 2));

// Test allotissement BioMol (docx)
console.log('\n=== Allotissement BioMol (docx) ===');
try {
  const bmAllot = await parseAllotissement(makeFile('C:/Users/g-gourrion/OneDrive - UNICANCER/Bureau/Marchés/Biologie moléculaire/Allotissement marché Biologie moléculaire.docx'));
  console.log(`${bmAllot.length} lots :`);
  for (const l of bmAllot) console.log(`  ${l.numLot}. ${l.objet}`);
} catch (e) {
  console.error('ERR', e.message);
}

// Test reporting AGILENT BioMol 2024
console.log('\n=== Reporting AGILENT BioMol 2024 ===');
const rpt = await parseSupplierReporting(makeFile('C:/Users/g-gourrion/OneDrive - UNICANCER/Bureau/Marchés/Biologie moléculaire/BM Reporting 2024/Reporting_PPE025_Unicancer_2024_AGILENT janv-oct.xlsx'));
console.log(`Fournisseur: ${rpt.fournisseur}`);
console.log(`Lignes: ${rpt.lignes.length}`);
for (const l of rpt.lignes.slice(0, 8)) {
  console.log(`  L${l.numLot.toString().padStart(2)} ${l.date?.toISOString().slice(0,10) ?? '??'}  ${l.etablissement.padEnd(40)}  ${l.designation.padEnd(40).slice(0,40)}  q=${l.quantite}  ttc=${l.montantTtc}`);
}
if (rpt.lignes.length > 8) console.log(`  ... (${rpt.lignes.length - 8} more)`);

// Test reporting DIAPATH ACP 2024
console.log('\n=== Reporting DIAPATH ACP 2024 ===');
const rpt2 = await parseSupplierReporting(makeFile('C:/Users/g-gourrion/OneDrive - UNICANCER/Bureau/Marchés/Anatomopathologie/ACP Reporting 2024/4.Retours/Reporting_PPE028_Unicancer_2024_DIAPATH.xlsx'));
console.log(`Fournisseur: ${rpt2.fournisseur}`);
console.log(`Lignes: ${rpt2.lignes.length}`);
for (const l of rpt2.lignes) {
  console.log(`  L${l.numLot.toString().padStart(2)} ${l.date?.toISOString().slice(0,10) ?? '??'}  ${l.etablissement.padEnd(30)}  ${l.designation.padEnd(40).slice(0,40)}  q=${l.quantite}  ttc=${l.montantTtc}`);
}

// Test reporting LIFE TECH BioMol 2024
console.log('\n=== Reporting LIFE TECH BioMol 2024 ===');
const rpt3 = await parseSupplierReporting(makeFile('C:/Users/g-gourrion/OneDrive - UNICANCER/Bureau/Marchés/Biologie moléculaire/BM Reporting 2024/Copie de Reporting_PPE025_Unicancer_2024_LIFE TECH.xlsx'));
console.log(`Fournisseur: ${rpt3.fournisseur}`);
console.log(`Lignes: ${rpt3.lignes.length}`);
for (const l of rpt3.lignes.slice(0, 12)) {
  console.log(`  L${l.numLot.toString().padStart(2)} ${l.date?.toISOString().slice(0,10) ?? '??'}  ${l.etablissement.padEnd(35).slice(0,35)}  ${l.designation.padEnd(35).slice(0,35)}  q=${l.quantite}  ttc=${l.montantTtc}`);
}
