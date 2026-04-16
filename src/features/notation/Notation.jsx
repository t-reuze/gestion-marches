import { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell, Legend as RechartsLegend } from 'recharts';

import Layout from '../../components/Layout';
import { marches } from '../../data/mockData';
import { useNotation } from '../../context/NotationContext';
import MarcheNavTabs from '../../components/MarcheNavTabs';
import WorkflowStepToggle from '../../components/WorkflowStepToggle';
import SmartExcelImport from './SmartExcelImport';

const VENDOR_COLORS = ['#B91C1C','#1A6B3A','#7C3AED','#1A4FA8','#0F7285','#9D3FAF'];
const MEDALS = ['1er','2e','3e','4e','5e','6e'];

function noteColor(n) {
  if (n >= 4.25) return '#10B981';
  if (n >= 3.5)  return '#F59E0B';
  return '#EF4444';
}

function parseExcel(wb, fileName) {
  const sheetName = wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];
  const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
  const hdrRow = raw[3] || [];
  const vendorCols = [3,4,5,6,7,8];
  const noteCols  = [9,10,11,12,13,14];
  const vendors = vendorCols.map((ci, vi) => {
    const h = String(hdrRow[ci] || '').trim();
    const parts = h.split('\n').map(s => s.trim()).filter(Boolean);
    return {
      idx: vi, colResp: ci, colNote: noteCols[vi],
      name: parts[0] || ('F' + (vi+1)),
      label: parts[0] || ('F' + (vi+1)),
      color: VENDOR_COLORS[vi] || '#64748B',
      initials: (parts[0] || '?').split(/[\s(]/)[0].substring(0,2).toUpperCase(),
    };
  });
  const questions = [];
  for (let ri = 4; ri < raw.length; ri++) {
    const row = raw[ri];
    if (!row || !String(row[1] || '').trim()) break;
    const question = String(row[1]).trim();
    const num = row[0] || (questions.length + 1);
    const methode = String(row[2] || '').trim();
    const answers = {}, notes = {}, comments = {};
    vendors.forEach(v => {
      answers[v.name] = String(row[v.colResp] || '—').trim() || '—';
      const rn = row[v.colNote];
      notes[v.name] = (rn !== '' && rn != null) ? (parseFloat(rn) || null) : null;
      comments[v.name] = '';
    });
    questions.push({ num, question, methode, answers, notes, comments, skipped: {}, xlsxRowIdx: ri });
  }
  if (!questions.length) throw new Error('Aucune question trouvée (lignes 5+ colonne B)');
  return { fileName, sheetName, vendors, questions };
}

export default function Notation() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getSession, setSession, clearSession } = useNotation();
  const marche = marches.find(m => m.id === id);
  const session = getSession(id);

  const [activeQ, setActiveQ] = useState(0);
  const [selectedLot, setSelectedLot] = useState(null);
  const [tab, setTab] = useState('notation');
  const [exporting, setExporting] = useState(false);
  const origBin = useRef(null);

  function handleSmartImport({ wb, fileName, buf }) {
    try {
      const data = parseExcel(wb, fileName);
      origBin.current = buf.slice(0);
      try {
        const saved = JSON.parse(localStorage.getItem('gm-notation-' + id) || 'null');
        if (saved?.fileName === fileName) {
          data.questions.forEach(q => {
            if (saved.notes?.[q.xlsxRowIdx]) {
              data.vendors.forEach(v => {
                const n = saved.notes[q.xlsxRowIdx][v.name];
                if (n !== undefined) q.notes[v.name] = n;
              });
            }
            if (saved.skipped?.[q.xlsxRowIdx]) {
              data.vendors.forEach(v => {
                if (saved.skipped[q.xlsxRowIdx]?.[v.name]) q.skipped[v.name] = true;
              });
            }
          });
        }
      } catch(_) {}
      setSession(id, data);
      setActiveQ(0);
      setTab('notation');
    } catch(_) {}
  }

  function persist(data) {
    try {
      const notes = {}, skipped = {};
      data.questions.forEach(q => {
        notes[q.xlsxRowIdx] = q.notes;
        const sk = {};
        data.vendors.forEach(v => { if (q.skipped[v.name]) sk[v.name] = true; });
        if (Object.keys(sk).length) skipped[q.xlsxRowIdx] = sk;
      });
      localStorage.setItem('gm-notation-' + id, JSON.stringify({ fileName: data.fileName, notes, skipped }));
    } catch(_) {}
  }

  function setNote(qIdx, vName, val) {
    if (!session) return;
    const qs = session.questions.map((q, i) =>
      i === qIdx ? { ...q, notes: { ...q.notes, [vName]: parseFloat(val) } } : q
    );
    const ns = { ...session, questions: qs };
    setSession(id, ns); persist(ns);
  }

  function setComment(qIdx, vName, txt) {
    if (!session) return;
    const qs = session.questions.map((q, i) =>
      i === qIdx ? { ...q, comments: { ...q.comments, [vName]: txt } } : q
    );
    const ns = { ...session, questions: qs };
    setSession(id, ns); persist(ns);
  }

  function toggleSkip(qIdx, vName) {
    if (!session) return;
    const qs = session.questions.map((q, i) =>
      i === qIdx ? { ...q, skipped: { ...q.skipped, [vName]: !q.skipped[vName] } } : q
    );
    const ns = { ...session, questions: qs };
    setSession(id, ns); persist(ns);
  }

  function avg(v) {
    if (!session) return null;
    const vals = session.questions
      .filter(q => !q.skipped[v.name])
      .map(q => q.notes[v.name])
      .filter(n => n !== null && n !== undefined && !isNaN(n));
    return vals.length ? vals.reduce((a,b) => a+b, 0) / vals.length : null;
  }

  function doExport() {
    if (!session || !origBin.current) return;
    setExporting(true);
    try {
      const { vendors, questions, sheetName } = session;
      const wb = XLSX.read(new Uint8Array(origBin.current), { type: 'array' });
      const ws = wb.Sheets[sheetName];
      questions.forEach(q => {
        vendors.forEach(v => {
          if (q.skipped[v.name]) return;
          const note = q.notes[v.name];
          if (note !== null && note !== undefined && !isNaN(note)) {
            ws[XLSX.utils.encode_cell({ r: q.xlsxRowIdx, c: v.colNote })] = { v: note, t: 'n' };
          }
        });
      });
      vendors.forEach(v => {
        const a = avg(v);
        if (a !== null) ws[XLSX.utils.encode_cell({ r: 2, c: v.colNote })] = { v: +a.toFixed(3), t: 'n' };
      });
      const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
      const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'sortie_' + session.fileName;
      a.click();
    } catch(err) { alert('Erreur export : ' + err.message); }
    setExporting(false);
  }


  if (!marche) return (
    <Layout title="Marché introuvable">
      <div className="empty-state"><div className="empty-title">Marché introuvable</div></div>
    </Layout>
  );

  const title = marche.reference + ' — ' + marche.nom;

  if (!session) {
    return (
      <Layout title={title} sub="— Notation des offres">
        <MarcheNavTabs />
        <SmartExcelImport onImport={handleSmartImport} marcheReference={marche.reference} />
      </Layout>
    );
  }

  const { vendors, questions } = session;
  // Lots disponibles dans la session (depuis q.lotNum)
  const availableLots = Array.from(new Set(questions.map(q => q.lotNum).filter(n => n != null))).sort((a, b) => a - b);
  // Indices des questions visibles (filtre par lot sélectionné)
  const visibleIdx = selectedLot == null
    ? questions.map((_, i) => i)
    : questions.map((q, i) => q.lotNum === selectedLot ? i : -1).filter(i => i >= 0);
  const safeVisible = visibleIdx.length ? visibleIdx : questions.map((_, i) => i);
  const localPos = Math.max(0, Math.min(activeQ, safeVisible.length - 1));
  const qi = safeVisible[localPos];
  const q = questions[qi];
  const totalNoted = questions.filter(qq =>
    vendors.every(v => qq.skipped[v.name] || (qq.notes[v.name] !== null && !isNaN(qq.notes[v.name])))
  ).length;
  const ranking = [...vendors].map(v => ({ ...v, avgScore: avg(v) })).sort((a,b) => (b.avgScore||0) - (a.avgScore||0));

  return (
    <Layout
      title={title}
      sub="— Notation des offres"
      actions={
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{totalNoted}/{questions.length} critères notés</span>
          <button className="btn btn-success btn-sm" onClick={doExport} disabled={exporting || !origBin.current}>
            &#x2B07; Exporter XLSX
          </button>
          <button
            className="btn btn-outline btn-sm"
            onClick={() => { if (window.confirm('Supprimer la session de notation pour ' + marche.reference + ' ?')) { clearSession(id); origBin.current = null; } }}
          >
            Réinitialiser
          </button>
        </div>
      }
    >
      <MarcheNavTabs />
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        <WorkflowStepToggle marcheId={id} stepKey="notation" />
      </div>
      <div className="notation-summary-bar">
        {vendors.map(v => {
          const a = avg(v);
          return (
            <div key={v.name} className="notation-vendor-chip">
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: v.color, flexShrink: 0 }}></div>
              <span style={{ fontWeight: 700, color: v.color }}>{v.label.split('(')[0].trim()}</span>
              <span style={{ fontWeight: 700, color: a !== null ? noteColor(a) : 'var(--text-muted)' }}>
                {a !== null ? a.toFixed(2) : '—'}
              </span>
            </div>
          );
        })}
      </div>

      <div className="tabs">
        <div className={'tab' + (tab === 'notation' ? ' active' : '')} onClick={() => setTab('notation')}>Notation</div>
        <div className={'tab' + (tab === 'synthese' ? ' active' : '')} onClick={() => setTab('synthese')}>Synthèse</div>
      </div>

      {tab === 'notation' && (
        <div className="fade-in">
          {availableLots.length > 0 && (
            <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>Filtrer par lot :</span>
              <button
                className={'btn btn-sm ' + (selectedLot == null ? 'btn-primary' : 'btn-outline')}
                onClick={() => { setSelectedLot(null); setActiveQ(0); }}
              >Tous</button>
              {availableLots.map(lot => (
                <button
                  key={lot}
                  className={'btn btn-sm ' + (selectedLot === lot ? 'btn-primary' : 'btn-outline')}
                  onClick={() => { setSelectedLot(lot); setActiveQ(0); }}
                >Lot {lot}</button>
              ))}
            </div>
          )}
          <div className="fq-nav-controls">
            <button className="btn btn-outline btn-sm" onClick={() => setActiveQ(p => Math.max(0, p-1))} disabled={localPos === 0}>&#x2190; Précédent</button>
            <div className="fq-progress">
              <div style={{ marginBottom: 6 }}>Question {localPos+1} / {safeVisible.length}</div>
              <div className="fq-progress-dots">
                {safeVisible.map((origIdx, i) => {
                  const qq = questions[origIdx];
                  const lotV = qq.lotVendors ? vendors.filter(v => qq.lotVendors.includes(v.name)) : vendors;
                  const done = lotV.every(v => qq.skipped[v.name] || (qq.notes[v.name] !== null && !isNaN(qq.notes[v.name])));
                  return (
                    <div
                      key={origIdx} className="fq-dot" onClick={() => setActiveQ(i)}
                      style={{ background: i === localPos ? 'var(--blue)' : done ? 'var(--green)' : 'var(--border)', color: (i === localPos || done) ? '#fff' : 'var(--text-muted)' }}
                      title={'Question ' + (i+1)}
                    >{i+1}</div>
                  );
                })}
              </div>
            </div>
            <button className="btn btn-primary btn-sm" onClick={() => setActiveQ(p => Math.min(safeVisible.length-1, p+1))} disabled={localPos === safeVisible.length-1}>Suivant &#x2192;</button>
          </div>

          <div className="fq-card">
            <div className="fq-header">
              <div className="fq-header-num">{q.num}</div>
              <div className="fq-header-text">
                {q.lotLabel && (
                  <div style={{ display: 'inline-block', background: 'var(--blue)', color: '#fff', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 4, marginBottom: 4 }}>
                    {q.lotLabel}
                  </div>
                )}
                <div className="fq-header-q">{q.question}</div>
                {q.methode && q.methode !== '—' && <div className="fq-header-m">Méthodologie : {q.methode}</div>}
              </div>
            </div>
            <div className="fq-body">
              <div className="table-container" style={{ border: 'none' }}>
                <table>
                  <thead>
                    <tr>
                      <th>Fournisseur</th>
                      <th style={{ textAlign: 'left' }}>Réponse</th>
                      <th>Note /5</th>
                      <th style={{ minWidth: 160 }}>Commentaire</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(q.lotVendors ? vendors.filter(v => q.lotVendors.includes(v.name)) : vendors).map((v) => {
                      const ans = q.answers[v.name] || '—';
                      const note = q.notes[v.name];
                      const hasNote = note !== null && note !== undefined && !isNaN(note);
                      const noteVal = hasNote ? note : 3;
                      const comment = q.comments[v.name] || '';
                      const isSkipped = !!q.skipped[v.name];
                      return (
                        <tr key={v.name} style={isSkipped ? { opacity: .55, background: 'repeating-linear-gradient(135deg,transparent,transparent 4px,rgba(0,0,0,.02) 4px,rgba(0,0,0,.02) 8px)' } : {}}>
                          <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                            <div className="vendor-pill" style={{ background: v.color }}>{v.initials}</div>
                            <div style={{ fontSize: 9, color: v.color, fontWeight: 700, marginTop: 3 }}>{v.label.split('(')[0].trim()}</div>
                          </td>
                          <td>
                            <div className="fq-ans" title={ans}>{ans.length > 150 ? ans.substring(0,150) + '…' : ans}</div>
                          </td>
                          <td className="fq-note-cell">
                            <button className={'skip-btn' + (isSkipped ? ' active' : '')} onClick={() => toggleSkip(qi, v.name)}>
                              {isSkipped ? '↩ Réactiver' : '— Non noté'}
                            </button>
                            {isSkipped
                              ? <div className="fq-score-disp" style={{ color: 'var(--text-muted)', marginTop: 4 }}>N/N</div>
                              : <>
                                  <div className="fq-score-disp" style={{ color: hasNote ? noteColor(noteVal) : 'var(--text-muted)' }}>
                                    {hasNote ? noteVal.toFixed(2) : '—'}
                                  </div>
                                  <input
                                    type="range" className="fq-slider" min="0" max="5" step="0.25"
                                    value={noteVal} style={{ accentColor: v.color }}
                                    onChange={e => setNote(qi, v.name, parseFloat(e.target.value))}
                                  />
                                  <div className="fq-stars">
                                    {[1,2,3,4,5].map(n => (
                                      <span key={n} className={'fq-star' + (hasNote && noteVal >= n ? ' on' : '')} onClick={() => setNote(qi, v.name, n)}>&#x2605;</span>
                                    ))}
                                  </div>
                                </>
                            }
                          </td>
                          <td style={{ verticalAlign: 'top', padding: 10 }}>
                            <textarea className="fq-comment" placeholder="Commentaire…" value={comment} onChange={e => setComment(qi, v.name, e.target.value)} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="fq-nav-controls" style={{ marginTop: 12 }}>
            <button className="btn btn-outline btn-sm" onClick={() => setActiveQ(p => Math.max(0, p-1))} disabled={localPos === 0}>&#x2190; Précédent</button>
            <div style={{ fontSize: 11 }}>
              {vendors.map(v => {
                const a = avg(v);
                return (
                  <span key={v.name} style={{ margin: '0 6px', color: v.color, fontWeight: 700 }}>
                    {v.initials}: <span style={{ color: a !== null ? noteColor(a) : 'var(--text-muted)' }}>{a !== null ? a.toFixed(2) : '—'}</span>
                  </span>
                );
              })}
            </div>
            <button className="btn btn-primary btn-sm" onClick={() => setActiveQ(p => Math.min(safeVisible.length-1, p+1))} disabled={localPos === safeVisible.length-1}>Suivant &#x2192;</button>
          </div>
        </div>
      )}

      {tab === 'synthese' && (
        <div className="fade-in">
          {ranking[0]?.avgScore !== null && ranking[0]?.avgScore !== undefined && (
            <div className="info-box green" style={{ marginBottom: 16 }}>
              <strong>Meilleure offre provisoire — {ranking[0].label.split('(')[0].trim()}</strong>
              <span style={{ marginLeft: 8, fontWeight: 700 }}>
                {ranking[0].avgScore?.toFixed(3)} / 5
              </span>
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 12, marginBottom: 20 }}>
            {ranking.map((v, r) => (
              <div key={v.name} className="card">
                <div className="card-header" style={{ background: `linear-gradient(135deg,${v.color} 0%,${v.color}bb 100%)` }}>
                  <span style={{ fontSize: 20 }}>{MEDALS[r] || (r+1)}</span>
                  <div style={{ fontWeight: 700, fontSize: 13, color: '#fff' }}>{v.label.split('(')[0].trim()}</div>
                  <div style={{ marginLeft: 'auto', fontWeight: 800, fontSize: 18, color: '#fff' }}>
                    {v.avgScore !== null && v.avgScore !== undefined ? v.avgScore.toFixed(3) : '—'}
                  </div>
                </div>
                <div className="card-body" style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  {questions.filter(qq => !qq.skipped[v.name] && qq.notes[v.name] !== null && !isNaN(qq.notes[v.name])).length} / {questions.length} critères notés
                </div>
              </div>
            ))}
          </div>
          {(() => {
            // Regroupe les questions par thème/catégorie et calcule la moyenne par vendor
            const themes = new Map();
            for (const q of questions) {
              const t = (q.theme || '').trim() || 'Sans catégorie';
              if (!themes.has(t)) themes.set(t, []);
              themes.get(t).push(q);
            }
            // Ne montre le graphe par catégorie que s'il y a au moins 2 catégories
            const themeKeys = Array.from(themes.keys());
            if (themeKeys.length < 2) return null;
            const chartData = themeKeys.map(t => {
              const qs = themes.get(t);
              const entry = { category: t.length > 35 ? t.substring(0, 32) + '…' : t };
              vendors.forEach(v => {
                const noted = qs.filter(q => !q.skipped[v.name] && q.notes[v.name] !== null && q.notes[v.name] !== undefined && !isNaN(q.notes[v.name]));
                entry[v.name] = noted.length > 0 ? +(noted.reduce((s, q) => s + q.notes[v.name], 0) / noted.length).toFixed(2) : null;
              });
              return entry;
            });
            return (
              <div className="card" style={{ marginBottom: 20 }}>
                <div className="card-header"><span className="card-title">Moyenne par catégorie</span></div>
                <div className="card-body" style={{ height: Math.max(280, themeKeys.length * 40) }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" domain={[0, 5]} ticks={[0,1,2,3,4,5]} tick={{ fontSize: 10 }} />
                      <YAxis type="category" dataKey="category" tick={{ fontSize: 10 }} width={140} />
                      <RechartsTooltip />
                      <RechartsLegend wrapperStyle={{ fontSize: 10 }} />
                      {vendors.map(v => (
                        <Bar key={v.name} dataKey={v.name} name={v.label.split('(')[0].trim()} fill={v.color + 'BB'} stroke={v.color} strokeWidth={1} radius={[0,3,3,0]} />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            );
          })()}
          <div className="card">
            <div className="card-header"><span className="card-title">Détail par critère</span></div>
            <div className="table-container" style={{ border: 'none', borderRadius: 0 }}>
              <table>
                <thead>
                  <tr>
                    <th>#</th><th>Critère</th>
                    {vendors.map(v => <th key={v.name} className="td-center" style={{ color: v.color }}>{v.initials}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {questions.map((qq, i) => (
                    <tr key={i}>
                      <td className="td-mono" style={{ fontSize: 11 }}>{qq.num}</td>
                      <td style={{ fontSize: 11, maxWidth: 300 }}>{qq.question.length > 60 ? qq.question.substring(0,60) + '…' : qq.question}</td>
                      {vendors.map(v => {
                        const isSkip = !!qq.skipped[v.name];
                        const n = qq.notes[v.name];
                        const hasN = n !== null && n !== undefined && !isNaN(n);
                        return (
                          <td key={v.name} className="td-center">
                            {isSkip
                              ? <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>N/N</span>
                              : hasN
                                ? <span className="score-chip" style={{ background: noteColor(n)+'18', color: noteColor(n), fontSize: 11 }}>{n.toFixed(2)}</span>
                                : <span style={{ color: 'var(--text-muted)' }}>—</span>
                            }
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
