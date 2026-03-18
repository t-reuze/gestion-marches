import { useState } from 'react';
import XLSX from 'xlsx-js-style';
import Layout from '../components/Layout';

const DOC_LABELS = [
  'Lot 1 MAD Personnel', 'Lot 2 Recrutement', 'Lot 3 Freelance',
  'BPU (Annexe 5)', 'Optim. Tarifaire', 'QT (Annexe 1)',
  'BPU Chiffrage (Annexe 3)', 'Questionnaire RSE', 'CCAP signé',
  'CCTP signé', 'DC1', 'DC2', 'ATTRI1', 'Fiche Contacts',
];

// --- Détection helpers ---

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
    if (handle.kind === 'file') {
      files.push({ name, path: fullPath, handle });
    } else {
      files.push(...await getAllFiles(handle, fullPath));
    }
  }
  return files;
}

async function getSubdirs(dirHandle) {
  const dirs = [];
  for await (const [name, handle] of dirHandle.entries()) {
    if (handle.kind === 'directory' && !name.startsWith('.')) {
      dirs.push({ name, handle });
    }
  }
  return dirs.sort((a, b) => a.name.localeCompare(b.name));
}

// Trouve le sous-dossier "Reponses" (insensible à la casse) dans un répertoire
async function findReponsesDir(rootHandle) {
  for await (const [name, handle] of rootHandle.entries()) {
    if (handle.kind === 'directory' && name.toLowerCase() === 'reponses') {
      return { handle, name };
    }
  }
  return null;
}

async function detectSupplier(dirHandle) {
  const files = await getAllFiles(dirHandle);

  const bpuFiles = files.filter(f => {
    const n = f.path.toLowerCase();
    return isOffice(f.name)
      && !n.includes('annexe 3') && !n.includes('chiffrage')
      && (n.includes('annexe 5') || n.includes('bpu') || n.includes('bordereau de prix'));
  });
  const hasBpu = bpuFiles.length > 0;
  const lots = { 1: false, 2: false, 3: false, optim: false };
  bpuFiles.forEach(f => {
    lotFromFilename(f.path).forEach(l => { if ([1,2,3].includes(l)) lots[l] = true; });
    if (f.path.toLowerCase().includes('optim')) lots.optim = true;
  });
  if (hasBpu && !lots[1] && !lots[2] && !lots[3]) {
    files.forEach(f => lotFromFilename(f.path).forEach(l => { if ([1,2,3].includes(l)) lots[l] = true; }));
  }

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
    'Lot 1 MAD Personnel': val(lots[1]),
    'Lot 2 Recrutement': val(lots[2]),
    'Lot 3 Freelance': val(lots[3]),
    'BPU (Annexe 5)': val(hasBpu),
    'Optim. Tarifaire': val(lots.optim),
    'QT (Annexe 1)': val(qt),
    'BPU Chiffrage (Annexe 3)': val(chiffrage),
    'Questionnaire RSE': val(rse),
    'CCAP signé': val(ccap),
    'CCTP signé': val(cctp),
    'DC1': val(dc1),
    'DC2': val(dc2),
    'ATTRI1': val(attri),
    'Fiche Contacts': val(contacts),
  };
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

  // 1. Fichier avec numéro de lot + mention QT/Annexe 1
  const withLotQt = xlsx.filter(f => {
    const n = f.path.toLowerCase();
    const hasLot = n.includes(`lot_${lot}`) || n.includes(`lot ${lot}`) || n.includes(`lot${lot}`);
    const isQt = n.includes('qt') || (n.includes('annexe') && n.includes('1'));
    return hasLot && isQt;
  });
  if (withLotQt.length) return { ...withLotQt[0], lotSheet: null };

  // 2. Fichier Annexe 1 / CCTP / QT sans numéro de lot (fichier unique multi-lots)
  const annexe1 = xlsx.filter(f => {
    const n = f.path.toLowerCase();
    return (n.includes('annexe') && (n.includes('1') || n.includes('cctp'))) || n.includes('qt');
  });
  if (annexe1.length) return { ...annexe1[0], lotSheet: lot };

  return null;
}

// Trouve la feuille "QT LOT X" dans un classeur
function findLotSheet(wb, lot) {
  const match = wb.SheetNames.find(s => {
    const n = s.toLowerCase();
    return n.includes(`lot ${lot}`) || n.includes(`lot_${lot}`) || n.includes(`lot${lot}`);
  });
  return match || wb.SheetNames[0];
}

// Trouve la colonne réponse en cherchant "réponse"/"candidat" dans les en-têtes, sinon col C (index 2)
function findAnswerCol(data) {
  for (let ri = 0; ri < Math.min(8, data.length); ri++) {
    const row = data[ri];
    for (let ci = 1; ci < row.length; ci++) {
      const cell = String(row[ci] || '').toLowerCase();
      if (cell.includes('r\u00e9ponse') || cell.includes('reponse') || cell.includes('candidat')) {
        return ci;
      }
    }
  }
  return 2; // Col C par défaut (structure standard des QT Unicancer)
}

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
  summaryHeader: {
    fill: { patternType: 'solid', fgColor: { rgb: '1B3A5C' } },
    font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 11, name: 'Calibri' },
    alignment: { horizontal: 'center', vertical: 'center' },
    border: { bottom: { style: 'medium', color: { rgb: 'E87722' } } },
  },
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
  // Autofiltre sur la ligne d'en-tête
  ws['!autofilter'] = { ref: range };
  // Volet figé : ligne 1 + col A si demandé
  ws['!freeze'] = freezeCol
    ? { xSplit: 1, ySplit: 1, topLeftCell: 'B2' }
    : { xSplit: 0, ySplit: 1, topLeftCell: 'A2' };
  return ws;
}

function buildQTXlsx(qtData) {
  const wb = XLSX.utils.book_new();

  // --- Feuille Récapitulatif ---
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
  // Colorer la colonne Statut selon valeur
  recapAoa.forEach((row, ri) => {
    if (ri === 0) return;
    const ref = XLSX.utils.encode_cell({ r: ri, c: 2 });
    const status = row[2];
    const sty = status.includes('Complet') ? ST.ok : status.includes('Partiel') ? ST.partial : ST.empty;
    recapWs[ref] = { v: row[2], t: 's', s: sty };
  });
  XLSX.utils.book_append_sheet(wb, recapWs, 'Récapitulatif');

  // --- Feuilles QT par lot ---
  for (const [lot, { compiled }] of Object.entries(qtData)) {
    if (!compiled?.length) continue;
    const nSup = compiled[0].length - 1;
    const ws = styledSheet(compiled, [52, ...Array(nSup).fill(40)], { rowHeight: 36, freezeCol: true });
    XLSX.utils.book_append_sheet(wb, ws, `QT LOT ${lot}`);
  }

  return XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
}

function download(data, filename) {
  const url = URL.createObjectURL(new Blob([data], { type: 'application/octet-stream' }));
  Object.assign(document.createElement('a'), { href: url, download: filename }).click();
  URL.revokeObjectURL(url);
}

// --- Composant principal ---

export default function AnalyseUnicancer() {
  const [tab, setTab] = useState(0);
  const [rootDirName, setRootDirName] = useState('');
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

  const supportsApi = typeof window !== 'undefined' && 'showDirectoryPicker' in window;

  async function pickDir() {
    try {
      const root = await window.showDirectoryPicker();
      setRootDirName(root.name);
      setAnnuaire([]);
      setEdits({});
      setDirWarning('');

      const found = await findReponsesDir(root);
      if (found) {
        setReponsesDirHandle(found.handle);
        setReponsesDirPath(`${root.name} / ${found.name}`);
        setDirWarning('');
      } else {
        setReponsesDirHandle(root);
        setReponsesDirPath(root.name);
        setDirWarning('Sous-dossier "Reponses" non trouvé — scan depuis la racine.');
      }
    } catch (e) { if (e.name !== 'AbortError') console.error(e); }
  }

  async function scan() {
    if (!reponsesDirHandle) return;
    setScanning(true);
    setAnnuaire([]);
    setEdits({});
    try {
      const subdirs = await getSubdirs(reponsesDirHandle);
      const rows = [];
      for (let i = 0; i < subdirs.length; i++) {
        const { name, handle } = subdirs[i];
        setScanProgress(`${i + 1}/${subdirs.length} — ${name}`);
        const docs = await detectSupplier(handle);
        rows.push({ 'Nom fournisseur': name, ...docs });
      }
      setAnnuaire(rows);
    } catch (e) { console.error(e); }
    setScanning(false);
    setScanProgress('');
  }

  function getRows() {
    return annuaire.map((row, i) => ({ ...row, ...(edits[i] || {}) }));
  }

  function setCell(ri, col, value) {
    setEdits(e => ({ ...e, [ri]: { ...(e[ri] || {}), [col]: value } }));
  }

  async function compileQT() {
    if (!reponsesDirHandle || !lotsSelected.length) return;
    setCompilingQt(true);
    try {
      const subdirs = await getSubdirs(reponsesDirHandle);
      const result = {};

      for (const lot of lotsSelected) {
        const supData = {};

        for (const { name, handle } of subdirs) {
          const sup = name.replace(/ ok$/i, '').trim().toUpperCase();
          const qtFile = await findQTFile(handle, lot);
          if (!qtFile) { supData[sup] = null; continue; }
          try {
            const wb = await readXlsxHandle(qtFile.handle);
            const sheetName = qtFile.lotSheet ? findLotSheet(wb, qtFile.lotSheet) : wb.SheetNames[0];
            const raw = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1, defval: '' });
            const rows = raw.filter(r => r[0] && String(r[0]).trim());
            const ansCol = findAnswerCol(rows);
            supData[sup] = rows.map(r => ({
              q: String(r[0]).trim(),
              a: String(r[ansCol] || '').trim(),
            }));
          } catch { supData[sup] = null; }
        }

        const refEntry = Object.values(supData).find(d => d && d.length > 0);
        if (!refEntry) continue;
        const questions = refEntry.map(d => d.q);

        // Uniquement les fournisseurs avec au moins une réponse non vide
        const allSupNames = subdirs.map(d => d.name.replace(/ ok$/i, '').trim().toUpperCase());
        const supNames = allSupNames.filter(sup => supData[sup]?.some(r => r.a));

        const compiled = [['Question', ...supNames]];

        questions.forEach((q, qi) => {
          compiled.push([q, ...supNames.map(sup => {
            const rows = supData[sup];
            if (!rows) return '';
            return rows[qi]?.a || rows.find(r => r.q === q)?.a || '';
          })]);
        });

        // Questions "réelles" = celles où au moins un fournisseur a répondu (exclut titres de section)
        const realQIdx = questions.map((_, qi) => supNames.some(sup => supData[sup]?.[qi]?.a) ? qi : -1).filter(i => i >= 0);
        const totalReal = realQIdx.length || questions.length;

        const supStatus = {};
        supNames.forEach(sup => {
          const rows = supData[sup];
          if (!rows) { supStatus[sup] = 'absent'; return; }
          const filled = realQIdx.filter(qi => rows[qi]?.a).length;
          supStatus[sup] = filled === totalReal ? 'ok' : filled > 0 ? 'partial' : 'empty';
        });

        result[lot] = { compiled, supStatus, questions };
      }
      setQtData(result);
    } catch (e) { console.error(e); }
    setCompilingQt(false);
  }

  const rows = getRows();
  const nbF = annuaire.length;

  return (
    <Layout title="AO Recrutement Personnel 2026" sub="— Analyse des offres">

      {/* Bandeau */}
      <div style={{ background: 'linear-gradient(135deg,#1B3A5C 0%,#2A5C8A 100%)', borderRadius: 10, padding: '18px 24px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 16 }}>
        <span style={{ fontSize: 32 }}>📋</span>
        <div>
          <div style={{ color: '#E87722', fontWeight: 700, fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 4 }}>Unicancer</div>
          <div style={{ color: '#fff', fontWeight: 700, fontSize: 15 }}>Traçabilité &amp; Compilation — AO Recrutement de Personnel 2026</div>
          <div style={{ color: 'rgba(255,255,255,.6)', fontSize: 12, marginTop: 4 }}>Détection automatique des documents fournisseurs · Compilation des QT</div>
        </div>
      </div>

      {!supportsApi && (
        <div style={{ background: '#fef3c7', border: '1px solid #f59e0b', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13 }}>
          ⚠️ <strong>Navigateur non compatible</strong> — Cette fonctionnalité nécessite Chrome ou Edge.
        </div>
      )}

      {/* Dossier source */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-header"><span className="card-title">📁 Dossier de l&apos;AO</span></div>
        <div className="card-body">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <button className="btn btn-outline" onClick={pickDir} disabled={!supportsApi}>
              📂 Sélectionner le dossier…
            </button>
            {reponsesDirPath && (
              <>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>Dossier fournisseurs détecté :</div>
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
          {dirWarning && (
            <div style={{ marginTop: 8, fontSize: 12, color: '#d97706' }}>⚠️ {dirWarning}</div>
          )}
        </div>
      </div>

      {/* Onglets */}
      <div className="tabs" style={{ marginBottom: 16 }}>
        {['📊 Annuaire documents', '📋 Compilation QT', '🔍 Détail QT'].map((t, i) => (
          <div key={i} className={'tab' + (tab === i ? ' active' : '')} onClick={() => setTab(i)}>{t}</div>
        ))}
      </div>

      {/* Onglet 0 : Annuaire */}
      {tab === 0 && (
        <div className="fade-in">
          {rows.length > 0 ? (
            <>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
                <button className="btn btn-primary btn-sm" onClick={() => download(buildXlsx(rows), 'ANNUAIRE_documents_fournisseurs.xlsx')}>
                  📥 Exporter Excel
                </button>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Tapez <strong>x</strong> si présent, laissez vide sinon.</span>
              </div>
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th style={{ minWidth: 180 }}>Fournisseur</th>
                      {DOC_LABELS.map(l => (
                        <th key={l} className="td-center" style={{ fontSize: 10, padding: '6px 3px', minWidth: 58 }}>{l}</th>
                      ))}
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
                              <input
                                value={v}
                                onChange={e => setCell(ri, col, e.target.value)}
                                style={{
                                  width: 40, textAlign: 'center', border: '1px solid var(--border)',
                                  borderRadius: 4, padding: '2px 4px', fontSize: 12,
                                  background: isX ? '#dcfce7' : v ? '#fef9c3' : '#fef2f2',
                                  color: isX ? '#15803d' : v ? '#92400e' : '#be185d',
                                  fontWeight: isX ? 700 : 400,
                                }}
                              />
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div style={{ marginTop: 20 }}>
                <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8 }}>Récapitulatif — documents manquants par fournisseur</div>
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

      {/* Onglet 1 : Compilation QT */}
      {tab === 1 && (
        <div className="fade-in">
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-header"><span className="card-title">⚙️ Lots à compiler</span></div>
            <div className="card-body" style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
              {[1, 2, 3].map(lot => (
                <label key={lot} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13 }}>
                  <input
                    type="checkbox"
                    checked={lotsSelected.includes(lot)}
                    onChange={e => setLotsSelected(s => e.target.checked ? [...s, lot].sort() : s.filter(l => l !== lot))}
                  />
                  LOT {lot}
                </label>
              ))}
              <button
                className="btn btn-primary"
                style={{ marginLeft: 8 }}
                onClick={compileQT}
                disabled={compilingQt || !reponsesDirHandle || !lotsSelected.length}
              >
                {compilingQt ? 'Compilation…' : '⚙️ Compiler les QT'}
              </button>
              {Object.keys(qtData).length > 0 && (
                <button className="btn btn-outline" onClick={() => download(buildQTXlsx(qtData), 'Compilation_QT_recrutement.xlsx')}>
                  📥 Exporter Excel
                </button>
              )}
            </div>
          </div>

          {Object.keys(qtData).length > 0 ? (
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
                        <span style={{ color: status === 'ok' ? '#15803d' : status === 'absent' ? '#dc2626' : status === 'partial' ? '#d97706' : '#64748b', fontWeight: 600 }}>
                          {status === 'ok' ? '✅ Complet' : status === 'absent' ? '❌ Absent' : status === 'partial' ? '⚠️ Partiel' : '⛔ Vide'}
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

      {/* Onglet 2 : Détail QT */}
      {tab === 2 && (
        <div className="fade-in">
          {Object.keys(qtData).length > 0 ? (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Fournisseur</th>
                    <th className="td-center">Lot</th>
                    <th className="td-center">Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(qtData).flatMap(([lot, { supStatus }]) =>
                    Object.entries(supStatus).map(([sup, status]) => (
                      <tr key={lot + sup}>
                        <td style={{ fontWeight: 600, fontSize: 12 }}>{sup}</td>
                        <td className="td-center">
                          <span className="score-chip" style={{ background: '#e0e7ff', color: '#3730a3' }}>LOT {lot}</span>
                        </td>
                        <td className="td-center">
                          <span style={{ color: status === 'ok' ? '#15803d' : status === 'absent' ? '#dc2626' : status === 'partial' ? '#d97706' : '#64748b', fontWeight: 600, fontSize: 12 }}>
                            {status === 'ok' ? '✅ Complet' : status === 'absent' ? '❌ Absent' : status === 'partial' ? '⚠️ Partiel' : '⛔ Vide'}
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

    </Layout>
  );
}
