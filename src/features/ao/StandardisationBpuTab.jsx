/**
 * StandardisationBpuTab.jsx
 * UI semi-auto pour le pipeline de standardisation BPU.
 *
 * Workflow :
 *   1. L'utilisateur clique "Lancer le pipeline BPU" → processBpuFolder()
 *   2. Liste des fournisseurs avec statut (auto OK / ambigu / raté / validé)
 *   3. Click sur fournisseur → drawer avec aperçu raw + selects de mapping
 *   4. Bouton "Valider" → saveMapping() → recompile ce fournisseur
 */
import React, { useState, useEffect } from 'react';

const __bpuCache = new Map();
import { useNavigate } from 'react-router-dom';
import { useNotation } from '../../context/NotationContext';
import { processQuestionnaireFolder } from '../../utils/analysePipeline/index.js';
import {
  processBpuFolder,
  processBpuFile,
  mapBpuHeaders,
  applyBpuMapping,
  saveMapping,
  deleteMapping,
  BPU_TARGET_FIELDS,
  BPU_REQUIRED_FIELDS,
} from '../../utils/analysePipeline/index.js';

const STATUS = {
  validated: { label: 'Validé', color: '#10b981', icon: '✓' },
  ok:        { label: 'Auto OK', color: '#3b82f6', icon: '●' },
  partial:   { label: 'Partiel', color: '#a855f7', icon: '◐' },
  ambiguous: { label: 'Ambigu', color: '#f59e0b', icon: '?' },
  failed:    { label: 'Échec', color: '#ef4444', icon: '!' },
  empty:     { label: 'Vide', color: '#6b7280', icon: '○' },
};

function statusOf(std) {
  if (!std.lots || Object.keys(std.lots).length === 0) return 'empty';
  if (std.meta.userValidated) return 'validated';
  const conf = std.meta.overallConfidence;
  const hasMissing = Object.values(std.lots).some(l => (l.meta.missingFields || []).length > 0);
  if (hasMissing) return 'failed';

  // Détection partiel : au moins un lot a des lignes sans prix rempli
  const lots = Object.values(std.lots);
  const totalFilled = lots.reduce((s, l) => s + (l.meta.stats?.filled || 0), 0);
  const totalLines = lots.reduce((s, l) => s + (l.meta.stats?.total || 0), 0);
  if (totalLines > 0 && totalFilled === 0) return 'failed';
  if (totalLines > 0 && totalFilled < totalLines) return 'partial';

  if (conf >= 0.85) return 'ok';
  return 'ambiguous';
}

function fillRatio(std) {
  const lots = Object.values(std.lots || {});
  const filled = lots.reduce((s, l) => s + (l.meta.stats?.filled || 0), 0);
  const total = lots.reduce((s, l) => s + (l.meta.stats?.total || 0), 0);
  return { filled, total };
}

const VENDOR_COLORS = ['#B91C1C','#1A6B3A','#7C3AED','#1A4FA8','#0F7285','#9D3FAF','#C2410C','#0E7490'];

function buildNotationSessionFromQt(qtResults) {
  const valid = qtResults.filter(r =>
    Object.values(r.sections || {}).some(s => (s.stats?.answered || 0) > 0)
  );
  if (!valid.length) return null;
  const vendors = valid.map((r, i) => ({
    idx: i, colResp: 3 + i, colNote: 3 + valid.length + i,
    name: r.fournisseur, label: r.fournisseur,
    color: VENDOR_COLORS[i % VENDOR_COLORS.length],
    initials: r.fournisseur.split(/[\s(]/)[0].substring(0, 2).toUpperCase(),
  }));
  const qKey = s => String(s || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim();
  // Regroupe par lot
  const byLot = new Map();
  for (const r of valid) {
    for (const sec of Object.values(r.sections || {})) {
      if ((sec.stats?.answered || 0) === 0) continue;
      const lotNum = sec.lotNum ?? 0;
      if (!byLot.has(lotNum)) byLot.set(lotNum, new Map());
      const qMap = byLot.get(lotNum);
      for (const item of sec.items || []) {
        const qOrig = (item.question || '').trim();
        if (!qOrig) continue;
        const k = qKey(qOrig);
        if (!k) continue;
        if (!qMap.has(k)) qMap.set(k, { question: qOrig, theme: item.theme || '', answers: {}, vendors: new Set() });
        const e = qMap.get(k);
        e.answers[r.fournisseur] = (item.reponse || '').trim() || '—';
        e.vendors.add(r.fournisseur);
      }
    }
  }
  const questions = [];
  let num = 1;
  for (const lotNum of Array.from(byLot.keys()).sort((a, b) => a - b)) {
    for (const entry of byLot.get(lotNum).values()) {
      const answers = {}, notes = {}, comments = {}, skipped = {};
      for (const v of vendors) {
        answers[v.name] = entry.answers[v.name] || '—';
        notes[v.name] = null; comments[v.name] = '';
        if (!entry.vendors.has(v.name)) skipped[v.name] = true;
      }
      questions.push({
        num: num++, lotNum, lotLabel: `Lot ${lotNum}`,
        question: entry.question, methode: entry.theme,
        lotVendors: Array.from(entry.vendors),
        answers, notes, comments, skipped, xlsxRowIdx: num + 3,
      });
    }
  }
  return { fileName: 'QT compilé (pipeline)', sheetName: 'QT', vendors, questions };
}

export default function StandardisationBpuTab({ dirHandle, marcheId }) {
  const navigate = useNavigate();
  const { setSession } = useNotation();
  const __c0 = __bpuCache.get(marcheId) || {};
  const [results, setResults] = useState(__c0.results || []);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState('');
  const [openIdx, setOpenIdx] = useState(null);
  const [qtResults, setQtResults] = useState(__c0.qtResults || []);
  useEffect(() => { __bpuCache.set(marcheId, { results, qtResults }); }, [marcheId, results, qtResults]);
  const [chainStatus, setChainStatus] = useState('');

  async function run() {
    if (!dirHandle) return;
    setRunning(true); setError(''); setResults([]); setQtResults([]); setChainStatus('');
    try {
      const out = await processBpuFolder(dirHandle, marcheId, setProgress);
      setResults(out);
    } catch (e) {
      setError(String(e.message || e));
    }
    setRunning(false); setProgress('');
  }

  async function runFullChain() {
    if (!dirHandle) return;
    setRunning(true); setError(''); setResults([]); setQtResults([]); setChainStatus('');
    try {
      setChainStatus('Étape 1/3 — Pipeline BPU…');
      const bpu = await processBpuFolder(dirHandle, marcheId, setProgress);
      setResults(bpu);
      setChainStatus('Étape 2/3 — Pipeline QT…');
      const qt = await processQuestionnaireFolder(dirHandle, 'QT', 'QT', marcheId, setProgress);
      setQtResults(qt);
      setChainStatus('Étape 3/3 — Import dans la notation…');
      const session = buildNotationSessionFromQt(qt);
      if (session) {
        setSession(marcheId, session);
        try {
          const notes = {};
          session.questions.forEach(q => { notes[q.xlsxRowIdx] = q.notes; });
          localStorage.setItem('gm-notation-' + marcheId, JSON.stringify({
            fileName: session.fileName, notes, skipped: {},
          }));
        } catch(_) {}
        setChainStatus(`✓ Pipeline complet — ${session.questions.length} questions × ${session.vendors.length} fournisseurs prêts pour notation`);
        setTimeout(() => navigate('/marche/' + marcheId + '/notation'), 1200);
      } else {
        setChainStatus('⚠ Pipeline terminé mais aucune réponse QT exploitable.');
      }
    } catch (e) {
      setError(String(e.message || e));
    }
    setRunning(false); setProgress('');
  }

  async function recomputeOne(idx) {
    const std = results[idx];
    if (!std) return;
    // Re-process the file from scratch (will pick up saved mapping)
    try {
      const files = [];
      let bpuDir = null;
      for await (const [name, h] of dirHandle.entries()) {
        if (h.kind === 'directory' && name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '') === 'bpu') {
          bpuDir = h; break;
        }
      }
      if (!bpuDir) return;
      for await (const [name, h] of bpuDir.entries()) {
        if (h.kind === 'file' && name === std.sourceFile) {
          const updated = await processBpuFile(h, name, marcheId);
          setResults(r => r.map((x, i) => i === idx ? updated : x));
          return;
        }
      }
    } catch (e) { console.error(e); }
  }

  return (
    <div className="fade-in">
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-body" style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <button className="btn btn-primary" onClick={run} disabled={running || !dirHandle}>
            {running ? 'Pipeline en cours…' : 'Lancer le pipeline BPU'}
          </button>
          <button className="btn btn-success" onClick={runFullChain} disabled={running || !dirHandle}
            title="BPU → QT → import automatique dans l'onglet Notation">
            {running ? '…' : '⚡ Pipeline complet → Notation'}
          </button>
          {progress && <span style={{ color: '#6b7280', fontSize: 13 }}>{progress}</span>}
          {chainStatus && <span style={{ color: '#1A4FA8', fontSize: 13, fontWeight: 600 }}>{chainStatus}</span>}
          {!dirHandle && <span style={{ color: '#9ca3af', fontSize: 13 }}>Sélectionne un dossier d'abord</span>}
        </div>
        {error && (
          <div className="card-body" style={{ color: '#ef4444', borderTop: '1px solid #fee2e2' }}>
            ⚠ {error}
          </div>
        )}
      </div>

      {results.length > 0 && (
        <PositioningMatrix results={results} />
      )}

      {results.length > 0 && (
        <div className="card" style={{ marginTop: 16 }}>
          <div className="card-body">
            <table className="table">
              <thead>
                <tr>
                  <th>Statut</th>
                  <th>Fournisseur</th>
                  <th>Fichier</th>
                  <th>Lots détectés</th>
                  <th>Lignes remplies</th>
                  <th>Confiance</th>
                  <th>Champs manquants</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {results.map((std, i) => {
                  const status = statusOf(std);
                  const cfg = STATUS[status];
                  const lotNums = Object.keys(std.lots).join(', ') || '—';
                  const ratio = fillRatio(std);
                  const ratioPct = ratio.total > 0 ? Math.round((ratio.filled / ratio.total) * 100) : 0;
                  const ratioColor = ratioPct === 100 ? '#10b981' : ratioPct >= 50 ? '#f59e0b' : '#ef4444';
                  const missing = [...new Set(
                    Object.values(std.lots).flatMap(l => l.meta.missingFields || [])
                  )].join(', ') || '—';
                  return (
                    <tr key={i}>
                      <td>
                        <span style={{
                          display: 'inline-block', width: 22, height: 22, borderRadius: 11,
                          background: cfg.color, color: 'white', textAlign: 'center',
                          lineHeight: '22px', fontSize: 12, fontWeight: 'bold',
                        }}>{cfg.icon}</span>
                        <span style={{ marginLeft: 8, fontSize: 12 }}>{cfg.label}</span>
                      </td>
                      <td><strong>{std.fournisseur}</strong></td>
                      <td style={{ fontSize: 12, color: '#6b7280' }}>{std.sourceFile}</td>
                      <td>{lotNums}</td>
                      <td style={{ fontSize: 12 }}>
                        {ratio.total > 0 ? (
                          <span style={{ color: ratioColor, fontWeight: 600 }}>
                            {ratio.filled}/{ratio.total} ({ratioPct}%)
                          </span>
                        ) : '—'}
                      </td>
                      <td>{(std.meta.overallConfidence * 100).toFixed(0)}%</td>
                      <td style={{ fontSize: 12, color: missing === '—' ? '#6b7280' : '#ef4444' }}>{missing}</td>
                      <td>
                        <button className="btn btn-sm" onClick={() => setOpenIdx(i)}>
                          Inspecter
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {openIdx !== null && results[openIdx] && (
        <MappingDrawer
          std={results[openIdx]}
          marcheId={marcheId}
          onClose={() => setOpenIdx(null)}
          onValidated={() => { recomputeOne(openIdx); setOpenIdx(null); }}
        />
      )}
    </div>
  );
}

function PositioningMatrix({ results }) {
  // Récupère tous les numéros de lot rencontrés
  const lotNums = [...new Set(results.flatMap(r => Object.keys(r.lots).map(Number)))].sort((a, b) => a - b);
  if (!lotNums.length) return null;

  function cellFor(std, lotNum) {
    const lot = std.lots[lotNum];
    if (!lot) return { status: 'absent', label: '—', color: '#9ca3af', bg: '#f3f4f6' };
    const stats = lot.meta.stats || { total: 0, filled: 0 };
    if (stats.total === 0) return { status: 'absent', label: '—', color: '#9ca3af', bg: '#f3f4f6' };
    if (stats.filled === 0) return {
      status: 'no-price', label: `0/${stats.total}`, color: '#b91c1c', bg: '#fee2e2',
    };
    if (stats.filled < stats.total) return {
      status: 'partial', label: `${stats.filled}/${stats.total}`, color: '#92400e', bg: '#fef3c7',
    };
    return {
      status: 'full', label: `✓ ${stats.filled}`, color: '#166534', bg: '#dcfce7',
    };
  }

  // Compteurs par lot
  const lotCounts = {};
  for (const lotNum of lotNums) {
    lotCounts[lotNum] = { full: 0, partial: 0, noPrice: 0, absent: 0 };
    for (const std of results) {
      const c = cellFor(std, lotNum);
      if (c.status === 'full') lotCounts[lotNum].full++;
      else if (c.status === 'partial') lotCounts[lotNum].partial++;
      else if (c.status === 'no-price') lotCounts[lotNum].noPrice++;
      else lotCounts[lotNum].absent++;
    }
  }

  return (
    <div className="card" style={{ marginTop: 16 }}>
      <div className="card-body">
        <h4 style={{ marginTop: 0, marginBottom: 4 }}>Positionnement par lot</h4>
        <p style={{ fontSize: 12, color: '#6b7280', marginTop: 0 }}>
          Pour chaque fournisseur × lot : nombre de lignes avec prix renseigné / total des lignes du lot.
        </p>
        <div style={{ overflowX: 'auto' }}>
          <table className="table" style={{ fontSize: 13 }}>
            <thead>
              <tr>
                <th style={{ minWidth: 200 }}>Fournisseur</th>
                {lotNums.map(n => (
                  <th key={n} className="td-center">Lot {n}</th>
                ))}
                <th className="td-center">Lots positionnés</th>
              </tr>
            </thead>
            <tbody>
              {results.map((std, i) => {
                const positioned = lotNums.filter(n => {
                  const c = cellFor(std, n);
                  return c.status === 'full' || c.status === 'partial';
                }).length;
                return (
                  <tr key={i}>
                    <td><strong>{std.fournisseur}</strong></td>
                    {lotNums.map(n => {
                      const c = cellFor(std, n);
                      return (
                        <td key={n} className="td-center" style={{ padding: '4px 6px' }}>
                          <span style={{
                            display: 'inline-block', minWidth: 50,
                            padding: '3px 8px', borderRadius: 4,
                            background: c.bg, color: c.color, fontWeight: 600, fontSize: 12,
                          }}>{c.label}</span>
                        </td>
                      );
                    })}
                    <td className="td-center">
                      <strong>{positioned}/{lotNums.length}</strong>
                    </td>
                  </tr>
                );
              })}
              <tr style={{ background: '#f9fafb', fontSize: 11 }}>
                <td><em>Total positionnés</em></td>
                {lotNums.map(n => {
                  const lc = lotCounts[n];
                  const totalPos = lc.full + lc.partial;
                  return (
                    <td key={n} className="td-center">
                      <strong>{totalPos}</strong>/{results.length}
                      <div style={{ color: '#6b7280' }}>
                        {lc.full}✓ · {lc.partial}◐ · {lc.noPrice}✗
                      </div>
                    </td>
                  );
                })}
                <td></td>
              </tr>
            </tbody>
          </table>
        </div>
        <div style={{ display: 'flex', gap: 16, fontSize: 11, color: '#6b7280', marginTop: 8 }}>
          <span><span style={{ display: 'inline-block', width: 10, height: 10, background: '#dcfce7', borderRadius: 2, marginRight: 4 }}/> Complet</span>
          <span><span style={{ display: 'inline-block', width: 10, height: 10, background: '#fef3c7', borderRadius: 2, marginRight: 4 }}/> Partiel</span>
          <span><span style={{ display: 'inline-block', width: 10, height: 10, background: '#fee2e2', borderRadius: 2, marginRight: 4 }}/> Aucun prix</span>
          <span><span style={{ display: 'inline-block', width: 10, height: 10, background: '#f3f4f6', borderRadius: 2, marginRight: 4 }}/> Non positionné</span>
        </div>
      </div>
    </div>
  );
}

function MappingDrawer({ std, marcheId, onClose, onValidated }) {
  const lotEntries = Object.entries(std.lots);
  const [activeLot, setActiveLot] = useState(lotEntries[0]?.[0]);
  const lot = std.lots[activeLot];
  const headers = lot?.meta.headers || [];
  const [mapping, setMapping] = useState(lot?.meta.mapping || {});

  React.useEffect(() => {
    setMapping(std.lots[activeLot]?.meta.mapping || {});
  }, [activeLot, std]);

  if (!lot) return null;

  function setField(field, colIdx) {
    setMapping(m => {
      const next = { ...m };
      if (colIdx === '' || colIdx === null) delete next[field];
      else next[field] = parseInt(colIdx, 10);
      return next;
    });
  }

  function validate() {
    saveMapping(marcheId, std.fournisseur, 'BPU', parseInt(activeLot, 10), mapping, headers);
    onValidated();
  }

  function reset() {
    deleteMapping(marcheId, std.fournisseur, 'BPU', parseInt(activeLot, 10));
    onValidated();
  }

  // Aperçu : 8 premières lignes déjà standardisées
  const preview = (lot.lignes || []).slice(0, 8);

  return (
    <div style={{
      position: 'fixed', top: 0, right: 0, bottom: 0, width: '60vw', maxWidth: 900,
      background: 'white', boxShadow: '-4px 0 24px rgba(0,0,0,0.15)', zIndex: 1000,
      overflowY: 'auto', padding: 24,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>{std.fournisseur}</h2>
        <button className="btn" onClick={onClose}>✕ Fermer</button>
      </div>
      <p style={{ color: '#6b7280', fontSize: 13, marginTop: 0 }}>
        Source : {std.sourceFile} · Type détecté : <strong>{std.meta.detectedType}</strong>
      </p>

      {lotEntries.length > 1 && (
        <div className="tabs" style={{ marginBottom: 16 }}>
          {lotEntries.map(([n]) => (
            <div key={n} className={'tab' + (activeLot === n ? ' active' : '')} onClick={() => setActiveLot(n)}>
              Lot {n}
            </div>
          ))}
        </div>
      )}

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-body">
          <h4 style={{ marginTop: 0 }}>Mapping des colonnes</h4>
          <p style={{ fontSize: 12, color: '#6b7280' }}>
            Feuille source : <code>{lot.meta.sheetSource}</code> · Confiance auto : {(lot.meta.mappingConfidence * 100).toFixed(0)}%
          </p>
          <table className="table" style={{ fontSize: 13 }}>
            <thead>
              <tr><th>Champ cible</th><th>Colonne fournisseur</th><th>Statut</th></tr>
            </thead>
            <tbody>
              {BPU_TARGET_FIELDS.map(field => {
                const required = BPU_REQUIRED_FIELDS.includes(field);
                const current = mapping[field];
                return (
                  <tr key={field}>
                    <td>
                      <strong>{field}</strong>
                      {required && <span style={{ color: '#ef4444' }}> *</span>}
                    </td>
                    <td>
                      <select
                        value={current ?? ''}
                        onChange={e => setField(field, e.target.value)}
                        style={{ width: '100%' }}
                      >
                        <option value="">— non mappé —</option>
                        {headers.map((h, i) => (
                          <option key={i} value={i}>
                            {i}: {h || '(vide)'}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td style={{ fontSize: 12 }}>
                      {current !== undefined ? '✓' : (required ? <span style={{ color: '#ef4444' }}>manquant</span> : '—')}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-body">
          <h4 style={{ marginTop: 0 }}>Aperçu lignes mappées (8 premières)</h4>
          <div style={{ overflowX: 'auto' }}>
            <table className="table" style={{ fontSize: 12 }}>
              <thead>
                <tr>
                  <th>ref</th><th>designation</th><th>unité</th>
                  <th>qté</th><th>PU HT</th><th>remise</th><th>total HT</th>
                </tr>
              </thead>
              <tbody>
                {preview.map((l, i) => (
                  <tr key={i}>
                    <td>{l.ref}</td>
                    <td>{l.designation}</td>
                    <td>{l.unite}</td>
                    <td>{l.quantite ?? ''}</td>
                    <td>{l.puHT ?? ''}</td>
                    <td>{l.remise ?? ''}</td>
                    <td>{l.totalHT ?? ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn btn-primary" onClick={validate}>💾 Valider et sauvegarder</button>
        <button className="btn" onClick={reset}>🗑 Supprimer mapping sauvé</button>
      </div>
    </div>
  );
}
