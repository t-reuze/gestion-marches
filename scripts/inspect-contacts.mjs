import XLSX from 'xlsx-js-style';
import fs from 'node:fs/promises';
import path from 'node:path';
const ROOT = 'C:/Users/t-reuze/OneDrive - UNICANCER/Bureau/Interface Unicancer Analyse des offres/AO_Recrutement_Standardisés';
for (const sub of ['BPU', 'QT', 'RSE', 'Chiffrage']) {
  const dir = path.join(ROOT, sub);
  let files = [];
  try { files = await fs.readdir(dir); } catch { continue; }
  for (const f of files.filter(x => /\.xlsx$/i.test(x) && !x.startsWith('~'))) {
    const buf = await fs.readFile(path.join(dir, f));
    const wb = XLSX.read(buf, { type: 'buffer' });
    // Look for sheets containing contact/coord/identif/présentation
    for (const sn of wb.SheetNames) {
      if (/contact|coord|identif|present|interloc|fournisseur/i.test(sn)) {
        const m = XLSX.utils.sheet_to_json(wb.Sheets[sn], { header: 1, defval: '' });
        console.log(`\n${sub}/${f} [${sn}]`);
        m.slice(0, 15).forEach((r, i) => console.log(`  ${i}:`, r.filter(c => c !== '').slice(0, 6)));
      }
    }
  }
}
