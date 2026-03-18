import { useState } from 'react';
import * as XLSX from 'xlsx';
import Layout from '../components/Layout';

const DOC_LABELS = [
  'Lot 1 MAD Personnel', 'Lot 2 Recrutement', 'Lot 3 Freelance',
  'BPU (Annexe 5)', 'Optim. Tarifaire', 'QT (Annexe 1)',
  'BPU Chiffrage (Annexe 3)', 'Questionnaire RSE', 'CCAP sign\u00e9',
  'CCTP sign\u00e9', 'DC1', 'DC2', 'ATTRI1', 'Fiche Contacts',
];

// ── Helpers d\u00e9tection ─────────────────────────────────────────────────────────

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

async function detectSupplier(dirHandle) {
  const files = await getAllFiles(dirHandle);

  // BPU / Annexe 5
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

  // BPU Chiffrage / Annexe 3
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
  const dc1 = fn.some(n => /(\/|^)dc1/.test(n));
  const dc2 = fn.some(n => /(\/|^)dc2/.test(n));
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
    'CCAP sign\u00e9': val(ccap),
    'CCTP sign\u00e9': val(cctp),
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
  const EXCL = ['annexe 3', 'annexe_3', 'annexe 5', 'annexe_5', 'bpu', 'attri', 'chiffrage', 'rse'];
  const files = await getAllFiles(dirHandle);
  const cands = files.filter(f => {
    const n = f.path.toLowerCase();
    if (!/\.(xls|xlsx)$/i.test(f.name)) return false;
    if (EXCL.some(e => n.includes(e))) return false;
    const hasLot = n.includes(`lot_${lot}`) || n.includes(`lot ${lot}`) || n.includes(`lot${lot}`);
    const isQt = n.includes('qt') || (n.includes('annexe') && n.includes('1') && n.includes('cctp'));
    return hasLot && isQt;
  });
  return cands[0] || null;
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

function buildQTXlsx(qtData) {
  const wb = XLSX.utils.book_new();
  for (const [lot, { compiled }] of Object.entries(qtData)) {
    if (!compiled?.length) continue;
    const ws = XLSX.utils.aoa_to_sheet(compiled);
    ws['!cols'] = [{ wch: 55 }, ...compiled[0].slice(1).map(() => ({ wch: 38 }))];
    XLSX.utils.book_append_sheet(wb, ws, `QT LOT ${lot}`);
  }
  return XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
}

function download(data, filename) {
  const url = URL.createObjectURL(new Blob([data], { type: 'application/octet-stream' }));
  Object.assign(document.createElement('a'), { href: url, download: filename }).click();
  URL.revokeObjectURL(url);
}

// ── Composant principal ───────────────────────────────────────────────────────

export default function AnalyseUnicancer() {
  const [tab, setTab] = useState(0);
  // Dossier r\u00e9ponses
  const [reponsesDir, setReponsesDir] = useState(null);
  const [reponsesDirName, setReponsesDirName] = useState('');
  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState('');
  // Annuaire
  const [annuaire, setAnnuaire] = useState([]);
  const [edits, setEdits] = useState({});
  // QT
  const [dceHandle, setDceHandle] = useState(null);
  const [dceName, setDceName] = useState('');
  const [lotsSelected, setLotsSelected] = useState([1, 2, 3]);
  const [compilingQt, setCompilingQt] = useState(false);
  const [qtData, setQtData] = useState({});

  const supportsApi = typeof window !== 'undefined' && 'showDirectoryPicker' in window;

  async function pickDir() {
    try {
      const dir = await window.showDirectoryPicker();
      setReponsesDir(dir);
      setReponsesDirName(dir.name);
      setAnnuaire([]);
      setEdits({});
    } catch (e) { if (e.name !== 'AbortError') console.error(e); }
  }

  async function pickDce() {
    try {
      const [h] = await window.showOpenFilePicker({
        types: [{ description: 'Fichier Excel DCE', accept: { 'application/vnd.ms-excel': ['.xls', '.xlsx'] } }],
      });
      setDceHandle(h);
      setDceName(h.name);
    } catch (e) { if (e.name !== 'AbortError') console.error(e); }
  }

  async function scan() {
    if (!reponsesDir) return;
    setScanning(true);
    setAnnuaire([]);
    setEdits({});
    try {
      const subdirs = await getSubdirs(reponsesDir);
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
    if (!reponsesDir || !dceHandle || !lotsSelected.length) return;
    setCompilingQt(true);
    try {
      const dceWb = await readXlsxHandle(dceHandle);
      const subdirs = await getSubdirs(reponsesDir);
      const result = {};
      for (const lot of lotsSelected) {
        const sheetName = `QT LOT ${lot}`;
        const ws = dceWb.Sheets[sheetName];
        if (!ws) continue;
        const template = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
        const questions = template.filter(r => r[0] && String(r[0]).trim()).map(r => String(r[0]).trim());
        const supStatus = {};
        const compiled = [['Question', ...subdirs.map(d => d.name.replace(/ ok$/i, '').trim().toUpperCase())]];
        const allAnswers = {};
        for (const { name, handle } of subdirs) {
          const sup = name.replace(/ ok$/i, '').trim().toUpperCase();
          const qtFile = await findQTFile(handle, lot);
          if (!qtFile) { supStatus[sup] = 'absent'; allAnswers[sup] = []; continue; }
          try {
            const wb = await readXlsxHandle(qtFile.handle);
            const data = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, defval: '' });
            allAnswers[sup] = data.map(r => String(r[2] || '').trim());
            const filled = questions.filter((_, qi) => allAnswers[sup][qi]).length;
            supStatus[sup] = filled === questions.length ? 'ok' : filled > 0 ? 'partial' : 'empty';
          } catch { supStatus[sup] = 'absent'; allAnswers[sup] = []; }
        }
        questions.forEach((q, qi) => {
          compiled.push([q, ...subdirs.map(d => {
            const sup = d.name.replace(/ ok$/i, '').trim().toUpperCase();
            return allAnswers[sup]?.[qi] || '';
          })]);
        });
        result[lot] = { compiled, supStatus, questions };
      }
      setQtData(result);
    } catch (e) { console.error(e); }
    setCompilingQt(false);
  }

  const rows = getRows();
  const nbF = annuaire.length;

  // ── Rendu ─────────────────────────────────────────────────────────────────
  return (
    <Layout title="AO Recrutement Personnel 2026" sub="\u2014 Analyse des offres">

      {/* Bandeau */}
      <div style={{ background: 'linear-gradient(135deg,#1B3A5C 0%,#2A5C8A 100%)', borderRadius: 10, padding: '18px 24px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 16 }}>
        <span style={{ fontSize: 32 }}>\ud83d\udccb</span>
        <div>
          <div style={{ color: '#E87722', fontWeight: 700, fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 4 }}>Unicancer</div>
          <div style={{ color: '#fff', fontWeight: 700, fontSize: 15 }}>Tra\u00e7abilit\u00e9 &amp; Compilation \u2014 AO Recrutement de Personnel 2026</div>
          <div style={{ color: 'rgba(255,255,255,.6)', fontSize: 12, marginTop: 4 }}>D\u00e9tection automatique des documents fournisseurs \u00b7 Compilation des QT</div>
        </div>
      </div>

      {!supportsApi && (
        <div className="info-box" style={{ background: '#fef3c7', borderColor: '#f59e0b', marginBottom: 16 }}>
          <strong>\u26a0\ufe0f Navigateur non compatible</strong> \u2014 Cette fonctionnalit\u00e9 n\u00e9cessite Chrome ou Edge (File System Access API).
        </div>
      )}

      {/* Dossier source */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-header"><span className="card-title">\ud83d\udcc1 Dossier R\u00e9ponses</span></div>
        <div className="card-body" style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <button className="btn btn-outline" onClick={pickDir} disabled={!supportsApi}>
            \ud83d\udcc2 S\u00e9lectionner le dossier\u2026
          </button>
          {reponsesDirName && (
            <>
              <code style={{ background: 'var(--bg)', border: '1px solid var(--border)', padding: '4px 10px', borderRadius: 5, fontSize: 12 }}>{reponsesDirName}</code>
              <button className="btn btn-primary" onClick={scan} disabled={scanning}>
                {scanning ? `\u23f3 ${scanProgress}` : '\ud83d\udd0d Analyser'}
              </button>
            </>
          )}
          {nbF > 0 && !scanning && (
            <span style={{ fontSize: 12, color: '#15803d', fontWeight: 600 }}>\u2705 {nbF} fournisseur{nbF > 1 ? 's' : ''} d\u00e9tect\u00e9{nbF > 1 ? 's' : ''}</span>
          )}
        </div>
      </div>

      {/* Onglets */}
      <div className="tabs" style={{ marginBottom: 16 }}>
        {['\ud83d\udcca Annuaire documents', '\ud83d\udccb Compilation QT', '\ud83d\udd0d D\u00e9tail QT'].map((t, i) => (
          <div key={i} className={'tab' + (tab === i ? ' active' : '')} onClick={() => setTab(i)}>{t}</div>
        ))}
      </div>

      {/* ══ Onglet 0 : Annuaire ══ */}
      {tab === 0 && (
        <div className="fade-in">
          {rows.length > 0 ? (
            <>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
                <button className="btn btn-primary btn-sm" onClick={() => download(buildXlsx(rows), 'ANNUAIRE_documents_fournisseurs.xlsx')}>
                  \ud83d\udce5 Exporter Excel
                </button>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Tapez <strong>x</strong> si pr\u00e9sent, laissez vide sinon. Une annotation est possible.</span>
              </div>

              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th style={{ minWidth: 180 }}>Fournisseur</th>
                      {DOC_LABELS.map(l => (
                        <th key={l} className="td-center" style={{ fontSize: 10, padding: '6px 3px', minWidth: 60 }}>{l}</th>
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

              {/* R\u00e9cap manquants */}
              <div style={{ marginTop: 20 }}>
                <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8 }}>R\u00e9capitulatif \u2014 documents manquants par fournisseur</div>
                <div className="table-container">
                  <table>
                    <thead><tr><th>Fournisseur</th><th className="td-center">Re\u00e7us</th><th>Manquants</th></tr></thead>
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
                            <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>{manquants.join(', ') || '\u2014'}</td>
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
              <div className="empty-icon">\ud83d\udcc1</div>
              <div className="empty-title">Aucune donn\u00e9e</div>
              <div className="empty-sub">S\u00e9lectionnez le dossier R\u00e9ponses et cliquez sur Analyser.</div>
            </div>
          )}
        </div>
      )}

      {/* ══ Onglet 1 : Compilation QT ══ */}
      {tab === 1 && (
        <div className="fade-in">
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-header"><span className="card-title">\ud83d\udcc4 Fichier DCE template (Annexe 1 CCTP)</span></div>
            <div className="card-body" style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <button className="btn btn-outline" onClick={pickDce} disabled={!supportsApi}>\ud83d\udcc2 S\u00e9lectionner le fichier DCE\u2026</button>
              {dceName && <code style={{ background: 'var(--bg)', border: '1px solid var(--border)', padding: '4px 10px', borderRadius: 5, fontSize: 12 }}>{dceName}</code>}
            </div>
          </div>

          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-header"><span className="card-title">\u2699\ufe0f Lots \u00e0 compiler</span></div>
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
                disabled={compilingQt || !reponsesDir || !dceHandle || !lotsSelected.length}
              >
                {compilingQt ? '\u23f3 Compilation\u2026' : '\u2699\ufe0f Compiler les QT'}
              </button>
              {Object.keys(qtData).length > 0 && (
                <button className="btn btn-outline" onClick={() => download(buildQTXlsx(qtData), 'Compilation_QT_recrutement.xlsx')}>
                  \ud83d\udce5 Exporter Excel
                </button>
              )}
            </div>
          </div>

          {Object.keys(qtData).length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px,1fr))', gap: 12 }}>
              {Object.entries(qtData).map(([lot, { questions, supStatus }]) => (
                <div key={lot} className="card">
                  <div className="card-header"><span className="card-title">LOT {lot}</span><span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 8 }}>{questions.length} questions</span></div>
                  <div className="card-body">
                    {Object.entries(supStatus).map(([sup, status]) => (
                      <div key={sup} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '4px 0', borderBottom: '1px solid var(--border)' }}>
                        <span style={{ fontWeight: 500 }}>{sup}</span>
                        <span style={{ color: status === 'ok' ? '#15803d' : status === 'absent' ? '#dc2626' : status === 'partial' ? '#d97706' : '#64748b', fontWeight: 600 }}>
                          {status === 'ok' ? '\u2705 Complet' : status === 'absent' ? '\u274c Absent' : status === 'partial' ? '\u26a0\ufe0f Partiel' : '\u26d4 Vide'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {!Object.keys(qtData).length && (
            <div className="empty-state">
              <div className="empty-icon">\ud83d\udccb</div>
              <div className="empty-title">Aucune compilation</div>
              <div className="empty-sub">S\u00e9lectionnez le dossier R\u00e9ponses, le fichier DCE, puis lancez la compilation.</div>
            </div>
          )}
        </div>
      )}

      {/* ══ Onglet 2 : D\u00e9tail QT ══ */}
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
                            {status === 'ok' ? '\u2705 Complet' : status === 'absent' ? '\u274c Absent' : status === 'partial' ? '\u26a0\ufe0f Partiel' : '\u26d4 Vide'}
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
              <div className="empty-icon">\ud83d\udd0d</div>
              <div className="empty-title">Aucune donn\u00e9e QT</div>
              <div className="empty-sub">Lancez d\u2019abord la compilation QT.</div>
            </div>
          )}
        </div>
      )}

    </Layout>
  );
}
