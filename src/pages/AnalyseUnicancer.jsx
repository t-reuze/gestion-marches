import { useState } from 'react';
import XLSX from 'xlsx-js-style';
import JSZip from 'jszip';
import Layout from '../components/Layout';

const DOC_LABELS = [
  'Lot 1 MAD Personnel', 'Lot 2 Recrutement', 'Lot 3 Freelance',
  'BPU (Annexe 5)', 'Optim. Tarifaire', 'QT (Annexe 1)',
  'BPU Chiffrage (Annexe 3)', 'Questionnaire RSE', 'CCAP signé',
  'CCTP signé', 'DC1', 'DC2', 'ATTRI1', 'Fiche Contacts',
];

// ─── Helpers fichiers ──────────────────────────────────────────────────────────

function lotFromFilename(name) {
  const n = name.toLowerCase();
  const lots = new Set();
  const re = /lot[\s_-]*(\d[\d\s,/&+-]*)/g;
  let m;
  while ((m = re.exec(n)) !== null) {
    const nums = m[0].match(/[123]/g);
    if (nums) nums.forEach(d => lots.add(parseInt(d)));
  }
  return [...lots].sort();
}

const isOffice = name => /\.(xls|xlsx|pdf|p7m)$/i.test(name);
const val = b => b ? 'x' : '';

async function getAllFiles(dirHandle, path = '') {
  const files = [];
  for await (const [name, handle] of dirHandle.entries()) {
    if (name.startsWith('~') || name.startsWith('.')) continue;
    const fullPath = path ? path + '/' + name : name;
    if (handle.kind === 'file') files.push({ name, path: fullPath, handle });
    else files.push(...await getAllFiles(handle, fullPath));
  }
  return files;
}

async function getSubdirs(dirHandle) {
  const dirs = [];
  for await (const [name, handle] of dirHandle.entries()) {
    if (handle.kind === 'directory' && !name.startsWith('.')) dirs.push({ name, handle });
  }
  return dirs.sort((a, b) => a.name.localeCompare(b.name));
}

async function findReponsesDir(rootHandle) {
  for await (const [name, handle] of rootHandle.entries()) {
    if (handle.kind === 'directory' && name.toLowerCase() === 'reponses') return { handle, name };
  }
  return null;
}

async function findStandardisesDir(reponsesDirHandle) {
  for await (const [name, handle] of reponsesDirHandle.entries()) {
    if (handle.kind === 'directory' && name.toLowerCase().replace('é', 'e') === 'standardises') {
      return { handle, name };
    }
  }
  return null;
}

async function readXlsxHandle(fileHandle) {
  const file = await fileHandle.getFile();
  const buf = await file.arrayBuffer();
  return XLSX.read(buf, { type: 'array' });
}

async function findQTFile(dirHandle, lot) {
  const EXCL = ['annexe 3', 'annexe_3', 'annexe 5', 'annexe_5', 'bpu', 'attri', 'chiffrage', 'rse', 'dc1', 'dc2', 'attri1'];
  const files = await getAllFiles(dirHandle);
  const xlsx = files.filter(f => /\.(xls|xlsx)$/i.test(f.name) && !EXCL.some(e => f.path.toLowerCase().includes(e)));

  const withLotQt = xlsx.filter(f => {
    const n = f.path.toLowerCase();
    const hasLot = n.includes(`lot_${lot}`) || n.includes(`lot ${lot}`) || n.includes(`lot${lot}`);
    const isQt = n.includes('qt') || (n.includes('annexe') && n.includes('1'));
    return hasLot && isQt;
  });
  if (withLotQt.length) return { ...withLotQt[0], lotSheet: null };

  const annexe1 = xlsx.filter(f => {
    const n = f.path.toLowerCase();
    return (n.includes('annexe') && (n.includes('1') || n.includes('cctp'))) || n.includes('qt');
  });
  if (annexe1.length) return { ...annexe1[0], lotSheet: lot };

  return null;
}

function findLotSheet(wb, lot) {
  const match = wb.SheetNames.find(s => {
    const n = s.toLowerCase();
    return n.includes(`lot ${lot}`) || n.includes(`lot_${lot}`) || n.includes(`lot${lot}`);
  });
  return match || wb.SheetNames[0];
}

// Trouve la colonne réponse : cherche "réponse"/"candidat" dans les en-têtes, sinon col C
function findAnswerCol(data) {
  for (let ri = 0; ri < Math.min(8, data.length); ri++) {
    const row = data[ri];
    for (let ci = 1; ci < row.length; ci++) {
      const cell = String(row[ci] || '').toLowerCase();
      if (cell.includes('réponse') || cell.includes('reponse') || cell.includes('candidat')) return ci;
    }
  }
  return 2;
}

// Lit et nettoie un fichier QT — retourne [{ q, a }]
function parseQTSheet(raw, ansCol) {
  const HEADER_VALS = new Set([
    'réponse candidat', 'réponse fournisseur', 'reponse candidat', 'reponse fournisseur',
    'réponse du candidat', 'réponses', 'réponse',
  ]);
  const SKIP_ANS = new Set([
    'réponse candidat', 'réponse fournisseur', 'reponse candidat', 'reponse fournisseur',
    'à compléter', 'a completer', 'n/a', '-',
  ]);

  const rows = raw.filter(r => {
    const q = String(r[0] || '').trim();
    if (!q) return false;
    // Ignorer la ligne d'en-tête (colonne réponse contient un label d'en-tête)
    const ans = String(r[ansCol] || '').trim().toLowerCase();
    if (HEADER_VALS.has(ans)) return false;
    // Ignorer aussi si col B = "Détail"/"Detail" et col réponse contient "réponse"
    const colB = String(r[1] || '').trim().toLowerCase();
    if ((colB === 'détail' || colB === 'detail') && ans.startsWith('réponse')) return false;
    return true;
  });

  return rows.map(r => {
    const raw_a = String(r[ansCol] || '').trim();
    const a = SKIP_ANS.has(raw_a.toLowerCase()) ? '' : raw_a;
    return { q: String(r[0]).trim(), a };
  });
}

// ─── Détection fournisseur (annuaire) ─────────────────────────────────────────

async function detectSupplier(dirHandle) {
  const files = await getAllFiles(dirHandle);
  const bpuFiles = files.filter(f => {
    const n = f.path.toLowerCase();
    return isOffice(f.name) && !n.includes('annexe 3') && !n.includes('chiffrage')
      && (n.includes('annexe 5') || n.includes('bpu') || n.includes('bordereau de prix'));
  });
  const hasBpu = bpuFiles.length > 0;
  const lots = { 1: false, 2: false, 3: false, optim: false };
  bpuFiles.forEach(f => {
    lotFromFilename(f.path).forEach(l => { if ([1,2,3].includes(l)) lots[l] = true; });
    if (f.path.toLowerCase().includes('optim')) lots.optim = true;
  });
  if (hasBpu && !lots[1] && !lots[2] && !lots[3])
    files.forEach(f => lotFromFilename(f.path).forEach(l => { if ([1,2,3].includes(l)) lots[l] = true; }));

  const a3 = files.filter(f => isOffice(f.name) && (f.path.toLowerCase().includes('annexe 3') || f.path.toLowerCase().includes('chiffrage')));
  const lotsA3 = new Set();
  a3.forEach(f => lotFromFilename(f.path).forEach(l => lotsA3.add(l)));
  const lotsFromBpu = new Set([1,2,3].filter(l => lots[l]));
  const chiffrage = a3.length > 0 && lotsFromBpu.size > 0 && [...lotsFromBpu].every(l => lotsA3.has(l));

  const fn = files.map(f => f.path.toLowerCase());
  const qt = fn.some(n => /\.(xls|xlsx|p7m)$/.test(n) && (n.includes('qt_lot') || n.includes('qt lot') || (n.includes('annexe') && n.includes('1') && n.includes('cctp'))));
  const rse = fn.some(n => n.includes('rse'));
  const ccap = fn.some(n => n.includes('ccap') && !n.includes('bpu') && !n.includes('annexe 5') && (n.endsWith('.pdf') || n.endsWith('.p7m')));
  const cctp = fn.some(n => n.includes('cctp') && !n.includes('annexe 1') && !n.includes('qt') && (n.endsWith('.pdf') || n.endsWith('.p7m')));
  const dc1 = fn.some(n => /(^\/|\/)dc1/.test(n));
  const dc2 = fn.some(n => /(^\/|\/)dc2/.test(n));
  const attri = fn.some(n => n.includes('attri1') || (n.includes('attri') && n.includes('sign')));
  const contacts = fn.some(n => n.includes('contact') || n.includes('annexe 4'));

  return {
    'Lot 1 MAD Personnel': val(lots[1]), 'Lot 2 Recrutement': val(lots[2]), 'Lot 3 Freelance': val(lots[3]),
    'BPU (Annexe 5)': val(hasBpu), 'Optim. Tarifaire': val(lots.optim), 'QT (Annexe 1)': val(qt),
    'BPU Chiffrage (Annexe 3)': val(chiffrage), 'Questionnaire RSE': val(rse),
    'CCAP signé': val(ccap), 'CCTP signé': val(cctp), 'DC1': val(dc1), 'DC2': val(dc2),
    'ATTRI1': val(attri), 'Fiche Contacts': val(contacts),
  };
}

// ─── Styles Excel ─────────────────────────────────────────────────────────────

const ST = {
  header: (ci) => ({
    fill: { patternType: 'solid', fgColor: { rgb: ci === 0 ? '1B3A5C' : '2A5C8A' } },
    font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 11, name: 'Calibri' },
    alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
    border: { bottom: { style: 'medium', color: { rgb: 'E87722' } }, top: { style: 'thin', color: { rgb: '1B3A5C' } }, left: { style: 'thin', color: { rgb: '1B3A5C' } }, right: { style: 'thin', color: { rgb: '1B3A5C' } } },
  }),
  question: (even) => ({
    fill: { patternType: 'solid', fgColor: { rgb: even ? 'EBF3FF' : 'FFFFFF' } },
    font: { sz: 10, name: 'Calibri', color: { rgb: '1A1A2E' } },
    alignment: { horizontal: 'left', vertical: 'top', wrapText: true },
    border: { top: { style: 'thin', color: { rgb: 'CCDDEE' } }, bottom: { style: 'thin', color: { rgb: 'CCDDEE' } }, left: { style: 'thin', color: { rgb: 'CCDDEE' } }, right: { style: 'thin', color: { rgb: 'CCDDEE' } } },
  }),
  answer: (even) => ({
    fill: { patternType: 'solid', fgColor: { rgb: even ? 'EBF3FF' : 'FFFFFF' } },
    font: { sz: 10, name: 'Calibri', color: { rgb: '333333' } },
    alignment: { horizontal: 'left', vertical: 'top', wrapText: true },
    border: { top: { style: 'thin', color: { rgb: 'CCDDEE' } }, bottom: { style: 'thin', color: { rgb: 'CCDDEE' } }, left: { style: 'thin', color: { rgb: 'CCDDEE' } }, right: { style: 'thin', color: { rgb: 'CCDDEE' } } },
  }),
  ok:      { fill: { patternType: 'solid', fgColor: { rgb: 'DCFCE7' } }, font: { bold: true, color: { rgb: '15803D' }, sz: 10, name: 'Calibri' }, alignment: { horizontal: 'center' } },
  partial: { fill: { patternType: 'solid', fgColor: { rgb: 'FEF9C3' } }, font: { bold: true, color: { rgb: '92400E' }, sz: 10, name: 'Calibri' }, alignment: { horizontal: 'center' } },
  empty:   { fill: { patternType: 'solid', fgColor: { rgb: 'FEF2F2' } }, font: { bold: true, color: { rgb: 'BE185D' }, sz: 10, name: 'Calibri' }, alignment: { horizontal: 'center' } },
};

function styledSheet(aoa, colWidths, { rowHeight = 40, freezeCol = false } = {}) {
  const ws = {};
  const nRows = aoa.length;
  const nCols = aoa[0]?.length || 0;
  aoa.forEach((row, ri) => {
    const isHeader = ri === 0;
    const even = ri % 2 === 0;
    row.forEach((val, ci) => {
      const ref = XLSX.utils.encode_cell({ r: ri, c: ci });
      ws[ref] = {
        v: val == null ? '' : String(val), t: 's',
        s: isHeader ? ST.header(ci) : ci === 0 ? ST.question(even) : ST.answer(even),
      };
    });
  });
  const range = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: nRows - 1, c: nCols - 1 } });
  ws['!ref'] = range;
  ws['!cols'] = colWidths.map(wch => ({ wch }));
  ws['!rows'] = [{ hpt: rowHeight }];
  ws['!autofilter'] = { ref: range };
  ws['!freeze'] = freezeCol
    ? { xSplit: 1, ySplit: 1, topLeftCell: 'B2' }
    : { xSplit: 0, ySplit: 1, topLeftCell: 'A2' };
  return ws;
}

// ─── Exports Excel ────────────────────────────────────────────────────────────

function buildXlsx(rows) {
  const ws = XLSX.utils.aoa_to_sheet([
    ['Nom fournisseur', ...DOC_LABELS],
    ...rows.map(r => [r['Nom fournisseur'], ...DOC_LABELS.map(l => r[l] || '')]),
  ]);
  ws['!cols'] = [{ wch: 36 }, ...DOC_LABELS.map(() => ({ wch: 12 }))];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'ANNUAIRE');
  return XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
}

function buildQTXlsx(qtData) {
  const wb = XLSX.utils.book_new();

  const recapAoa = [['Lot', 'Fournisseur', 'Statut', 'Questions répondues']];
  for (const [lot, { supStatus, questions }] of Object.entries(qtData)) {
    for (const [sup, status] of Object.entries(supStatus)) {
      recapAoa.push([`LOT ${lot}`, sup,
        status === 'ok' ? 'Complet ✓' : status === 'partial' ? 'Partiel' : 'Vide',
        status === 'ok' ? `${questions.length}/${questions.length}` : '?',
      ]);
    }
  }
  const recapWs = styledSheet(recapAoa, [12, 42, 16, 20], { rowHeight: 28 });
  recapAoa.forEach((row, ri) => {
    if (ri === 0) return;
    const ref = XLSX.utils.encode_cell({ r: ri, c: 2 });
    const s = row[2];
    recapWs[ref] = { v: s, t: 's', s: s.includes('Complet') ? ST.ok : s.includes('Partiel') ? ST.partial : ST.empty };
  });
  XLSX.utils.book_append_sheet(wb, recapWs, 'Récapitulatif');

  for (const [lot, { compiled }] of Object.entries(qtData)) {
    if (!compiled?.length) continue;
    const nSup = compiled[0].length - 1;
    const ws = styledSheet(compiled, [52, ...Array(nSup).fill(40)], { rowHeight: 36, freezeCol: true });
    XLSX.utils.book_append_sheet(wb, ws, `QT LOT ${lot}`);
  }

  return XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
}

// Template vierge : questions pré-remplies, col C vide
function buildTemplateXlsx(qtData) {
  const wb = XLSX.utils.book_new();
  for (const [lot, { questions }] of Object.entries(qtData)) {
    const aoa = [
      ['Question', 'Détail', 'Réponse candidat'],
      ...questions.map(q => [q, '', '']),
    ];
    const ws = styledSheet(aoa, [55, 25, 55], { rowHeight: 36, freezeCol: false });
    XLSX.utils.book_append_sheet(wb, ws, `QT LOT ${lot}`);
  }
  return XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
}

// ZIP des fichiers standardisés par fournisseur (un xlsx par fournisseur, une feuille par lot)
async function buildStandardizedZip(qtData) {
  const zip = new JSZip();

  // Collecter tous les fournisseurs positionnés
  const allSups = new Set();
  for (const { supData } of Object.values(qtData)) {
    if (supData) Object.keys(supData).filter(s => supData[s]?.some(r => r.a)).forEach(s => allSups.add(s));
  }

  for (const sup of allSups) {
    const wb = XLSX.utils.book_new();
    for (const [lot, { questions, supData }] of Object.entries(qtData)) {
      const rows = supData?.[sup];
      if (!rows?.some(r => r.a)) continue;
      const aoa = [
        ['Question', 'Détail', 'Réponse candidat'],
        ...questions.map((q, qi) => [q, '', rows[qi]?.a || rows.find(r => r.q === q)?.a || '']),
      ];
      const ws = styledSheet(aoa, [55, 25, 55], { rowHeight: 36, freezeCol: false });
      XLSX.utils.book_append_sheet(wb, ws, `QT LOT ${lot}`);
    }
    if (!wb.SheetNames.length) continue;
    const data = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
    zip.file(`${sup}_QT_standardise.xlsx`, data);
  }

  return zip.generateAsync({ type: 'uint8array' });
}

function download(data, filename, type = 'application/octet-stream') {
  const url = URL.createObjectURL(new Blob([data], { type }));
  Object.assign(document.createElement('a'), { href: url, download: filename }).click();
  URL.revokeObjectURL(url);
}

// ─── Composant principal ──────────────────────────────────────────────────────

export default function AnalyseUnicancer() {
  const [tab, setTab] = useState(0);
  const [reponsesDirHandle, setReponsesDirHandle] = useState(null);
  const [reponsesDirPath, setReponsesDirPath] = useState('');
  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState('');
  const [annuaire, setAnnuaire] = useState([]);
  const [edits, setEdits] = useState({});
  const [lotsSelected, setLotsSelected] = useState([1, 2, 3]);
  const [compilingQt, setCompilingQt] = useState(false);
  const [qtData, setQtData] = useState({});
  const [dirWarning, setDirWarning] = useState('');
  const [generatingZip, setGeneratingZip] = useState(false);

  const supportsApi = typeof window !== 'undefined' && 'showDirectoryPicker' in window;

  async function pickDir() {
    try {
      const root = await window.showDirectoryPicker();
      setAnnuaire([]); setEdits({}); setDirWarning('');
      const found = await findReponsesDir(root);
      if (found) {
        setReponsesDirHandle(found.handle);
        setReponsesDirPath(`${root.name} / ${found.name}`);
      } else {
        setReponsesDirHandle(root);
        setReponsesDirPath(root.name);
        setDirWarning('Sous-dossier "Reponses" non trouvé — scan depuis la racine.');
      }
    } catch (e) { if (e.name !== 'AbortError') console.error(e); }
  }

  async function scan() {
    if (!reponsesDirHandle) return;
    setScanning(true); setAnnuaire([]); setEdits({});
    try {
      const subdirs = await getSubdirs(reponsesDirHandle);
      const rows = [];
      for (let i = 0; i < subdirs.length; i++) {
        const { name, handle } = subdirs[i];
        setScanProgress(`${i + 1}/${subdirs.length} — ${name}`);
        rows.push({ 'Nom fournisseur': name, ...await detectSupplier(handle) });
      }
      setAnnuaire(rows);
    } catch (e) { console.error(e); }
    setScanning(false); setScanProgress('');
  }

  const getRows = () => annuaire.map((row, i) => ({ ...row, ...(edits[i] || {}) }));
  const setCell = (ri, col, value) => setEdits(e => ({ ...e, [ri]: { ...(e[ri] || {}), [col]: value } }));

  async function compileQT() {
    if (!reponsesDirHandle || !lotsSelected.length) return;
    setCompilingQt(true);
    try {
      // Cherche le dossier Standardisés/ dans Réponses/
      const stdDir = await findStandardisesDir(reponsesDirHandle);
      if (!stdDir) {
        setDirWarning('Dossier "Standardisés" introuvable. Lancez d\'abord la standardisation Python.');
        setCompilingQt(false);
        return;
      }
      setDirWarning('');

      // Liste tous les xlsx du dossier Standardisés/
      const xlsxFiles = [];
      for await (const [name, handle] of stdDir.handle.entries()) {
        if (handle.kind === 'file' && /\.xlsx$/i.test(name) && !name.startsWith('~')) {
          // Nom fournisseur = nom de fichier sans le suffixe _QT_standardisé.xlsx
          const supName = name.replace(/_QT_standardis[eé]\.xlsx$/i, '').trim();
          xlsxFiles.push({ name, handle, supName });
        }
      }
      xlsxFiles.sort((a, b) => a.supName.localeCompare(b.supName));

      const result = {};

      for (const lot of lotsSelected) {
        const lotSheetName = `QT LOT ${lot}`;
        const supData = {};

        for (const { handle, supName } of xlsxFiles) {
          const wb = await readXlsxHandle(handle);
          // Si le fichier n'a pas de feuille pour ce lot → fournisseur non positionné
          if (!wb.SheetNames.includes(lotSheetName)) continue;

          const raw = XLSX.utils.sheet_to_json(wb.Sheets[lotSheetName], { header: 1, defval: '' });
          // Format standard : ligne 0 = en-têtes, col 0 = question, col 2 = réponse candidat
          const rows = raw.slice(1).filter(r => String(r[0] || '').trim());
          supData[supName] = rows.map(r => ({
            q: String(r[0] || '').trim(),
            a: String(r[2] || '').trim(),
          }));
        }

        if (!Object.keys(supData).length) continue;

        // Questions de référence (depuis n'importe quel fournisseur)
        const questions = Object.values(supData)[0].map(d => d.q);

        // Fournisseurs avec au moins une vraie réponse
        const supNames = Object.keys(supData).filter(sup => supData[sup].some(r => r.a));

        const compiled = [['Question', ...supNames]];
        questions.forEach((q, qi) => {
          compiled.push([q, ...supNames.map(sup => {
            const rows = supData[sup];
            return rows[qi]?.a || rows.find(r => r.q === q)?.a || '';
          })]);
        });

        // Statut : questions répondues par au moins un fournisseur
        const realQIdx = questions
          .map((_, qi) => supNames.some(sup => supData[sup][qi]?.a) ? qi : -1)
          .filter(i => i >= 0);
        const totalReal = realQIdx.length || questions.length;

        const supStatus = {};
        supNames.forEach(sup => {
          const filled = realQIdx.filter(qi => supData[sup][qi]?.a).length;
          supStatus[sup] = filled === totalReal ? 'ok' : filled > 0 ? 'partial' : 'empty';
        });

        result[lot] = { compiled, supStatus, questions, supData };
      }
      setQtData(result);
    } catch (e) { console.error(e); }
    setCompilingQt(false);
  }

  async function handleDownloadZip() {
    setGeneratingZip(true);
    try {
      const data = await buildStandardizedZip(qtData);
      download(data, 'QT_standardises.zip', 'application/zip');
    } catch (e) { console.error(e); }
    setGeneratingZip(false);
  }

  const rows = getRows();
  const nbF = annuaire.length;
  const hasQT = Object.keys(qtData).length > 0;

  return (
    <Layout title="AO Recrutement Personnel 2026" sub="— Analyse des offres">

      <div style={{ background: 'linear-gradient(135deg,#1B3A5C 0%,#2A5C8A 100%)', borderRadius: 10, padding: '18px 24px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 16 }}>
        <span style={{ fontSize: 32 }}>📋</span>
        <div>
          <div style={{ color: '#E87722', fontWeight: 700, fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 4 }}>Unicancer</div>
          <div style={{ color: '#fff', fontWeight: 700, fontSize: 15 }}>Traçabilité &amp; Compilation — AO Recrutement de Personnel 2026</div>
          <div style={{ color: 'rgba(255,255,255,.6)', fontSize: 12, marginTop: 4 }}>Détection automatique · Compilation QT · Standardisation</div>
        </div>
      </div>

      {!supportsApi && (
        <div style={{ background: '#fef3c7', border: '1px solid #f59e0b', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13 }}>
          ⚠️ <strong>Navigateur non compatible</strong> — Cette fonctionnalité nécessite Chrome ou Edge.
        </div>
      )}

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-header"><span className="card-title">📁 Dossier de l&apos;AO</span></div>
        <div className="card-body">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <button className="btn btn-outline" onClick={pickDir} disabled={!supportsApi}>📂 Sélectionner le dossier…</button>
            {reponsesDirPath && (
              <>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>Dossier fournisseurs :</div>
                  <code style={{ background: 'var(--bg)', border: '1px solid var(--border)', padding: '4px 10px', borderRadius: 5, fontSize: 12 }}>{reponsesDirPath}</code>
                </div>
                <button className="btn btn-primary" onClick={scan} disabled={scanning}>
                  {scanning ? `⏳ ${scanProgress}` : '🔍 Analyser'}
                </button>
              </>
            )}
            {nbF > 0 && !scanning && (
              <span style={{ fontSize: 12, color: '#15803d', fontWeight: 600 }}>✅ {nbF} fournisseur{nbF > 1 ? 's' : ''} détecté{nbF > 1 ? 's' : ''}</span>
            )}
          </div>
          {dirWarning && <div style={{ marginTop: 8, fontSize: 12, color: '#d97706' }}>⚠️ {dirWarning}</div>}
        </div>
      </div>

      <div className="tabs" style={{ marginBottom: 16 }}>
        {['📊 Annuaire documents', '📋 Compilation QT', '🔍 Détail QT', '🔧 Outils'].map((t, i) => (
          <div key={i} className={'tab' + (tab === i ? ' active' : '')} onClick={() => setTab(i)}>{t}</div>
        ))}
      </div>

      {/* ─── Onglet 0 : Annuaire ─── */}
      {tab === 0 && (
        <div className="fade-in">
          {rows.length > 0 ? (
            <>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
                <button className="btn btn-primary btn-sm" onClick={() => download(buildXlsx(rows), 'ANNUAIRE_documents_fournisseurs.xlsx')}>📥 Exporter Excel</button>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Tapez <strong>x</strong> si présent, laissez vide sinon.</span>
              </div>
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th style={{ minWidth: 180 }}>Fournisseur</th>
                      {DOC_LABELS.map(l => <th key={l} className="td-center" style={{ fontSize: 10, padding: '6px 3px', minWidth: 58 }}>{l}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, ri) => (
                      <tr key={ri}>
                        <td style={{ fontWeight: 600, fontSize: 12 }}>{row['Nom fournisseur']}</td>
                        {DOC_LABELS.map(col => {
                          const v = row[col] || '';
                          const isX = v.toLowerCase() === 'x';
                          return (
                            <td key={col} className="td-center" style={{ padding: '3px 2px' }}>
                              <input value={v} onChange={e => setCell(ri, col, e.target.value)}
                                style={{ width: 40, textAlign: 'center', border: '1px solid var(--border)', borderRadius: 4, padding: '2px 4px', fontSize: 12,
                                  background: isX ? '#dcfce7' : v ? '#fef9c3' : '#fef2f2',
                                  color: isX ? '#15803d' : v ? '#92400e' : '#be185d', fontWeight: isX ? 700 : 400 }} />
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={{ marginTop: 20 }}>
                <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8 }}>Récapitulatif — documents manquants</div>
                <div className="table-container">
                  <table>
                    <thead><tr><th>Fournisseur</th><th className="td-center">Reçus</th><th>Manquants</th></tr></thead>
                    <tbody>
                      {rows.map((row, ri) => {
                        const present = DOC_LABELS.filter(l => row[l]?.trim());
                        const manquants = DOC_LABELS.filter(l => !row[l]?.trim());
                        return (
                          <tr key={ri}>
                            <td style={{ fontWeight: 600, fontSize: 12 }}>{row['Nom fournisseur']}</td>
                            <td className="td-center">
                              <span className="score-chip" style={{ background: present.length === DOC_LABELS.length ? '#dcfce7' : '#fef2f2', color: present.length === DOC_LABELS.length ? '#15803d' : '#be185d' }}>
                                {present.length}/{DOC_LABELS.length}
                              </span>
                            </td>
                            <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>{manquants.join(', ') || '—'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : (
            <div className="empty-state">
              <div className="empty-icon">📁</div>
              <div className="empty-title">Aucune donnée</div>
              <div className="empty-sub">Sélectionnez le dossier de l&apos;AO et cliquez sur Analyser.</div>
            </div>
          )}
        </div>
      )}

      {/* ─── Onglet 1 : Compilation QT ─── */}
      {tab === 1 && (
        <div className="fade-in">
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-header"><span className="card-title">⚙️ Lots à compiler</span></div>
            <div className="card-body" style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
              {[1, 2, 3].map(lot => (
                <label key={lot} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13 }}>
                  <input type="checkbox" checked={lotsSelected.includes(lot)}
                    onChange={e => setLotsSelected(s => e.target.checked ? [...s, lot].sort() : s.filter(l => l !== lot))} />
                  LOT {lot}
                </label>
              ))}
              <button className="btn btn-primary" style={{ marginLeft: 8 }} onClick={compileQT}
                disabled={compilingQt || !reponsesDirHandle || !lotsSelected.length}>
                {compilingQt ? 'Compilation…' : '⚙️ Compiler les QT (Standardisés/)'}
              </button>
              {hasQT && (
                <button className="btn btn-outline" onClick={() => download(buildQTXlsx(qtData), 'Compilation_QT_recrutement.xlsx')}>
                  📥 Exporter Excel
                </button>
              )}
            </div>
          </div>

          {hasQT ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 12 }}>
              {Object.entries(qtData).map(([lot, { questions, supStatus }]) => (
                <div key={lot} className="card">
                  <div className="card-header">
                    <span className="card-title">LOT {lot}</span>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 8 }}>{questions.length} questions</span>
                  </div>
                  <div className="card-body">
                    {Object.entries(supStatus).map(([sup, status]) => (
                      <div key={sup} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '4px 0', borderBottom: '1px solid var(--border)' }}>
                        <span style={{ fontWeight: 500 }}>{sup}</span>
                        <span style={{ color: status === 'ok' ? '#15803d' : status === 'partial' ? '#d97706' : '#64748b', fontWeight: 600 }}>
                          {status === 'ok' ? '✅ Complet' : status === 'partial' ? '⚠️ Partiel' : '⛔ Vide'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-icon">📋</div>
              <div className="empty-title">Aucune compilation</div>
              <div className="empty-sub">Sélectionnez le dossier de l&apos;AO puis compilez.</div>
            </div>
          )}
        </div>
      )}

      {/* ─── Onglet 2 : Détail QT ─── */}
      {tab === 2 && (
        <div className="fade-in">
          {hasQT ? (
            <div className="table-container">
              <table>
                <thead>
                  <tr><th>Fournisseur</th><th className="td-center">Lot</th><th className="td-center">Statut</th></tr>
                </thead>
                <tbody>
                  {Object.entries(qtData).flatMap(([lot, { supStatus }]) =>
                    Object.entries(supStatus).map(([sup, status]) => (
                      <tr key={lot + sup}>
                        <td style={{ fontWeight: 600, fontSize: 12 }}>{sup}</td>
                        <td className="td-center"><span className="score-chip" style={{ background: '#e0e7ff', color: '#3730a3' }}>LOT {lot}</span></td>
                        <td className="td-center">
                          <span style={{ color: status === 'ok' ? '#15803d' : status === 'partial' ? '#d97706' : '#64748b', fontWeight: 600, fontSize: 12 }}>
                            {status === 'ok' ? '✅ Complet' : status === 'partial' ? '⚠️ Partiel' : '⛔ Vide'}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-icon">🔍</div>
              <div className="empty-title">Aucune donnée QT</div>
              <div className="empty-sub">Lancez d&apos;abord la compilation QT.</div>
            </div>
          )}
        </div>
      )}

      {/* ─── Onglet 3 : Outils ─── */}
      {tab === 3 && (
        <div className="fade-in">
          {/* Format standard */}
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-header"><span className="card-title">📐 Format standard attendu</span></div>
            <div className="card-body" style={{ fontSize: 13 }}>
              <p style={{ marginBottom: 8 }}>Pour que la compilation fonctionne de façon fiable, les fichiers Annexe 1 QT doivent respecter ce format :</p>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ background: '#1B3A5C', color: '#fff' }}>
                    <th style={{ padding: '6px 10px', border: '1px solid #ddd' }}>Col A — Question</th>
                    <th style={{ padding: '6px 10px', border: '1px solid #ddd' }}>Col B — Détail</th>
                    <th style={{ padding: '6px 10px', border: '1px solid #ddd', background: '#E87722' }}>Col C — Réponse candidat</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ background: '#EBF3FF' }}>
                    <td style={{ padding: '5px 10px', border: '1px solid #ddd' }}>Présentation de la société</td>
                    <td style={{ padding: '5px 10px', border: '1px solid #ddd', color: '#888' }}>info</td>
                    <td style={{ padding: '5px 10px', border: '1px solid #ddd', fontStyle: 'italic', color: '#15803d' }}>← réponse du fournisseur ici</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '5px 10px', border: '1px solid #ddd' }}>Description du portefeuille client…</td>
                    <td style={{ padding: '5px 10px', border: '1px solid #ddd' }}></td>
                    <td style={{ padding: '5px 10px', border: '1px solid #ddd', fontStyle: 'italic', color: '#15803d' }}>← réponse du fournisseur ici</td>
                  </tr>
                </tbody>
              </table>
              <ul style={{ marginTop: 12, paddingLeft: 20, lineHeight: 1.8 }}>
                <li>Feuilles nommées <strong>QT LOT 1</strong>, <strong>QT LOT 2</strong>, <strong>QT LOT 3</strong></li>
                <li>1ère ligne avec en-têtes : <code>Question</code> | <code>Détail</code> | <code>Réponse candidat</code></li>
                <li><strong>Col C = réponse du fournisseur</strong> — toujours</li>
              </ul>
            </div>
          </div>

          {/* Template vierge */}
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-header"><span className="card-title">📄 Template vierge à envoyer aux fournisseurs</span></div>
            <div className="card-body">
              <p style={{ fontSize: 13, marginBottom: 12 }}>
                Génère un fichier Excel standardisé avec les questions pré-remplies et la colonne <strong>Réponse candidat</strong> vide — à envoyer à chaque fournisseur.
              </p>
              <button className="btn btn-primary" onClick={() => download(buildTemplateXlsx(qtData), 'Template_QT_vierge.xlsx')} disabled={!hasQT}>
                📥 Télécharger le template vierge
              </button>
              {!hasQT && <span style={{ marginLeft: 12, fontSize: 12, color: 'var(--text-muted)' }}>Compilez d&apos;abord les QT pour générer le template.</span>}
            </div>
          </div>

          {/* Standardisation */}
          <div className="card">
            <div className="card-header"><span className="card-title">🔄 Standardiser les fichiers existants</span></div>
            <div className="card-body">
              <p style={{ fontSize: 13, marginBottom: 12 }}>
                Reformat les fichiers QT de tous les fournisseurs positionnés dans le format standard (col C = réponse).
                Génère un <strong>.zip</strong> avec un fichier Excel par fournisseur.
              </p>
              <button className="btn btn-primary" onClick={handleDownloadZip} disabled={!hasQT || generatingZip}>
                {generatingZip ? '⏳ Génération…' : '📦 Télécharger les QT standardisés (.zip)'}
              </button>
              {!hasQT && <span style={{ marginLeft: 12, fontSize: 12, color: 'var(--text-muted)' }}>Compilez d&apos;abord les QT.</span>}
            </div>
          </div>
        </div>
      )}

    </Layout>
  );
}
