import XLSX from 'xlsx-js-style';
import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = 'C:/Users/t-reuze/OneDrive - UNICANCER/Bureau/Interface Unicancer Analyse des offres/AO_Recrutement_Standardisés';
const isReal = v => v != null && String(v).trim() !== '' && !/^(na|n\/a|néant|sans objet|-|—)$/i.test(String(v).trim());

// Colonnes requises par lot (from interim-recrutement-2026 config)
const BPU_REQ = {
  1: [{ col: 2, name: 'PUHT/jour' }, { col: 3, name: '% Remise' }],
  2: [{ col: 1, name: '% Taux' }],
  3: [{ col: 2, name: 'PUHT/jour' }, { col: 3, name: 'PUHT/heure' }, { col: 4, name: '% Remise' }],
};

const annuaire = {};
const ensure = n => annuaire[n] ??= { lots: {}, hasQT: false, hasRSE: false, hasOptim: false };

// BPU
for (const f of (await fs.readdir(path.join(ROOT, 'BPU'))).filter(x => /\.xlsx$/i.test(x) && !x.startsWith('~'))) {
  const display = f.replace(/_BPU_standardis[eé]\.xlsx$/i, '').trim();
  const sup = ensure(display);
  const wb = XLSX.read(await fs.readFile(path.join(ROOT, 'BPU', f)));
  for (const sn of wb.SheetNames) {
    if (/optim/i.test(sn)) {
      const rows = XLSX.utils.sheet_to_json(wb.Sheets[sn], { header: 1, defval: '' });
      sup.hasOptim = rows.slice(1).some(r => r.slice(1).some(isReal));
      continue;
    }
    const m = sn.match(/lot\s*(\d+)/i);
    if (!m) continue;
    const lot = +m[1];
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[sn], { header: 1, defval: '' }).slice(1).filter(r => String(r[0] || '').trim());
    const reqCols = BPU_REQ[lot] || [];
    const total = rows.length;
    const filled = rows.filter(r => reqCols.some(({ col }) => isReal(r[col]))).length;
    const status = total === 0 || filled === 0 ? 'vide' : (filled < total ? `partiel ${filled}/${total}` : 'x');
    sup.lots[lot] = status;
  }
}

// QT / RSE
for (const [sub, key] of [['QT', 'hasQT'], ['RSE', 'hasRSE']]) {
  for (const f of (await fs.readdir(path.join(ROOT, sub))).filter(x => /\.xlsx$/i.test(x) && !x.startsWith('~'))) {
    const display = f.replace(new RegExp(`_${sub}_standardis[eé]\.xlsx$`, 'i'), '').trim();
    ensure(display)[key] = true;
  }
}

// Report
const sups = Object.keys(annuaire).sort();
console.log('\n══ ANNUAIRE — Pipeline (' + sups.length + ' fournisseurs) ══\n');
console.log('Fournisseur'.padEnd(36), 'L1'.padEnd(13), 'L2'.padEnd(13), 'L3'.padEnd(13), 'BPU', 'Optim', 'QT ', 'RSE');
console.log('-'.repeat(110));
for (const s of sups) {
  const a = annuaire[s];
  const l = n => (a.lots[n] || 'non fourni').padEnd(13);
  const bpu = Object.values(a.lots).some(v => v === 'x') ? 'x  ' : (Object.keys(a.lots).length ? 'par' : '—  ');
  console.log(s.padEnd(36), l(1), l(2), l(3), bpu, (a.hasOptim ? 'x   ' : '—   '), (a.hasQT ? 'x  ' : '—  '), (a.hasRSE ? 'x' : '—'));
}

// Contacts
const allFiles = [];
async function walk(d) { for (const e of await fs.readdir(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) await walk(p); else allFiles.push(p); } }
await walk(ROOT);
const contactFiles = allFiles.filter(p => /contact|interlocuteur|annexe.?4/i.test(p) && /\.xlsx?$/i.test(p));
console.log('\n══ CONTACTS ══');
console.log('Fichiers contact trouvés :', contactFiles.length);
contactFiles.forEach(f => console.log('  •', path.relative(ROOT, f)));
