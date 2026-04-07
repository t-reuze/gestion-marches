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
    for (const sn of wb.SheetNames) {
      const m = XLSX.utils.sheet_to_json(wb.Sheets[sn], { header: 1, defval: '' });
      const flat = m.flat().filter(c => typeof c === 'string').join(' ');
      const mail = flat.match(/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g) || [];
      const tel = flat.match(/(?:\+33|0)\s*[1-9](?:[\s.-]*\d{2}){4}/g) || [];
      if (mail.length || tel.length) console.log(`${sub}/${f} [${sn}]`, 'mail:', mail.slice(0,2), 'tel:', tel.slice(0,2));
    }
  }
}
