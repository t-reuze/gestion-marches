/**
 * StandardisationQuestionnaireTab.jsx
 * UI semi-auto pour standardiser les questionnaires (QT et RSE).
 * Réutilise le pipeline questionnaire générique.
 */
import React, { useState, useEffect } from 'react';

const __qResultsCache = new Map();
const __qKey = (m, d) => `${m}::${d}`;
import { useNavigate } from 'react-router-dom';
import { processQuestionnaireFolder } from '../../utils/analysePipeline/index.js';
import { useNotation } from '../../context/NotationContext';

const VENDOR_COLORS = ['#B91C1C','#1A6B3A','#7C3AED','#1A4FA8','#0F7285','#9D3FAF','#C2410C','#0E7490'];

/** Construit une session de notation à partir des résultats standardisés QT. */
function buildNotationSession(results, docType) {
  // Vendors = fournisseurs avec au moins une réponse
  const valid = results.filter(r =>
    Object.values(r.sections || {}).some(s => (s.stats?.answered || 0) > 0)
  );
  if (!valid.length) return null;

  const vendors = valid.map((r, i) => ({
    idx: i,
    colResp: 3 + i,
    colNote: 3 + valid.length + i,
    name: r.fournisseur,
    label: r.fournisseur,
    color: VENDOR_COLORS[i % VENDOR_COLORS.length],
    initials: r.fournisseur.split(/[\s(]/)[0].substring(0, 2).toUpperCase(),
  }));

  // Regroupe par lot : pour chaque lot, dédupe les questions et liste les vendors positionnés
  // Structure intermédiaire : lotNum -> Map(question -> { question, theme, answers, vendors:Set })
  // Clé de dédup normalisée : insensible à la casse, accents, ponctuation et whitespace
  const qKey = s => String(s || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

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

  // Aplatit : questions ordonnées par lot puis ordre d'apparition
  const questions = [];
  const sortedLots = Array.from(byLot.keys()).sort((a, b) => a - b);
  let num = 1;
  for (const lotNum of sortedLots) {
    for (const entry of byLot.get(lotNum).values()) {
      const answers = {}, notes = {}, comments = {}, skipped = {};
      for (const v of vendors) {
        answers[v.name] = entry.answers[v.name] || '—';
        notes[v.name] = null;
        comments[v.name] = '';
        // Marque comme "skipped" les vendors non positionnés sur ce lot pour ne pas fausser la moyenne
        if (!entry.vendors.has(v.name)) skipped[v.name] = true;
      }
      questions.push({
        num: num++,
        lotNum,
        lotLabel: `Lot ${lotNum}`,
        question: entry.question,
        methode: entry.theme,
        lotVendors: Array.from(entry.vendors),
        answers, notes, comments, skipped,
        xlsxRowIdx: num + 3,
      });
    }
  }

  return {
    fileName: `${docType} compilé (pipeline)`,
    sheetName: docType,
    vendors,
    questions,
  };
}

export default function StandardisationQuestionnaireTab({ dirHandle, marcheId, subdir, docType, label }) {
  const navigate = useNavigate();
  const { setSession } = useNotation();
  const [results, setResults] = useState(() => __qResultsCache.get(__qKey(marcheId, docType)) || []);
  useEffect(() => { __qResultsCache.set(__qKey(marcheId, docType), results); }, [marcheId, docType, results]);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState('');
  const [openIdx, setOpenIdx] = useState(null);
  const [importMsg, setImportMsg] = useState('');

  async function run() {
    if (!dirHandle) return;
    setRunning(true); setError(''); setResults([]);
    try {
      const out = await processQuestionnaireFolder(dirHandle, subdir, docType, marcheId, setProgress);
      setResults(out);
    } catch (e) { setError(String(e.message || e)); }
    setRunning(false); setProgress('');
  }

  return (
    <div className="fade-in">
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-body" style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <button className="btn btn-primary" onClick={run} disabled={running || !dirHandle}>
            {running ? 'Pipeline en cours…' : `Lancer le pipeline ${label}`}
          </button>
          {progress && <span style={{ color: '#6b7280', fontSize: 13 }}>{progress}</span>}
          {!dirHandle && <span style={{ color: '#9ca3af', fontSize: 13 }}>Sélectionne un dossier d'abord</span>}
          {docType === 'QT' && results.length > 0 && (
            <button
              className="btn btn-success"
              style={{ marginLeft: 'auto' }}
              onClick={() => {
                const session = buildNotationSession(results, docType);
                if (!session) { setImportMsg('Aucune réponse exploitable.'); return; }
                setSession(marcheId, session);
                try {
                  const notes = {}, skipped = {};
                  session.questions.forEach(q => { notes[q.xlsxRowIdx] = q.notes; });
                  localStorage.setItem('gm-notation-' + marcheId, JSON.stringify({
                    fileName: session.fileName, notes, skipped,
                  }));
                } catch(_) {}
                setImportMsg(`✓ ${session.questions.length} questions × ${session.vendors.length} fournisseurs importés`);
                setTimeout(() => navigate('/marche/' + marcheId + '/notation'), 600);
              }}
            >
              → Importer dans la notation
            </button>
          )}
        </div>
        {error && <div style={{ color: '#dc2626', padding: 12, fontSize: 13 }}>⚠ {error}</div>}
        {importMsg && <div style={{ color: '#10b981', padding: 12, fontSize: 13 }}>{importMsg}</div>}
      </div>

      {results.length > 0 && (() => {
        // Regroupe par lot : pour chaque lot, ne liste que les fournisseurs positionnés
        const byLot = new Map(); // lotNum -> [{result, section, idx}]
        for (let i = 0; i < results.length; i++) {
          const r = results[i];
          for (const sec of Object.values(r.sections || {})) {
            if ((sec.stats?.answered || 0) === 0) continue;
            const lot = sec.lotNum ?? 0;
            if (!byLot.has(lot)) byLot.set(lot, []);
            byLot.get(lot).push({ result: r, section: sec, idx: i });
          }
        }
        const lots = Array.from(byLot.keys()).sort((a, b) => a - b);
        if (!lots.length) return <div className="card"><div className="card-body" style={{ color: '#6b7280' }}>Aucun fournisseur positionné.</div></div>;
        return lots.map(lot => (
          <div className="card" key={lot} style={{ marginBottom: 16 }}>
            <div className="card-body">
              <h4 style={{ marginTop: 0 }}>Lot {lot} — {byLot.get(lot).length} fournisseur(s) positionné(s)</h4>
              <table className="table" style={{ fontSize: 13 }}>
                <thead>
                  <tr>
                    <th>Fournisseur</th>
                    <th>Questions répondues</th>
                    <th>Confiance</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {byLot.get(lot).map(({ result, section, idx }) => {
                    const totalQ = section.stats?.total || 0;
                    const ans = section.stats?.answered || 0;
                    const pct = totalQ > 0 ? Math.round((ans / totalQ) * 100) : 0;
                    const color = pct >= 90 ? '#10b981' : pct >= 50 ? '#f59e0b' : '#ef4444';
                    return (
                      <tr key={result.fournisseur + lot}>
                        <td><strong>{result.fournisseur}</strong></td>
                        <td style={{ color, fontWeight: 600 }}>{ans}/{totalQ} ({pct}%)</td>
                        <td>{(section.mappingConfidence * 100).toFixed(0)}%</td>
                        <td>
                          <button className="btn btn-sm" onClick={() => setOpenIdx(idx)}>Inspecter</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ));
      })()}

      {openIdx !== null && results[openIdx] && (
        <QuestionnaireDrawer data={results[openIdx]} onClose={() => setOpenIdx(null)} />
      )}
    </div>
  );
}

function QuestionnaireDrawer({ data, onClose }) {
  const sections = Object.entries(data.sections || {});
  const [activeSection, setActiveSection] = useState(sections[0]?.[0]);
  const sec = data.sections[activeSection];

  return (
    <div style={{
      position: 'fixed', top: 0, right: 0, bottom: 0, width: '70vw', maxWidth: 1100,
      background: 'white', boxShadow: '-4px 0 24px rgba(0,0,0,0.15)', zIndex: 1000,
      overflowY: 'auto', padding: 24,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>{data.fournisseur}</h2>
        <button className="btn" onClick={onClose}>✕ Fermer</button>
      </div>
      <p style={{ color: '#6b7280', fontSize: 13, marginTop: 0 }}>
        Type : <strong>{data.docType}</strong>
      </p>

      {sections.length > 1 && (
        <div className="tabs" style={{ marginBottom: 16 }}>
          {sections.map(([key, s]) => (
            <div key={key}
              className={'tab' + (activeSection === key ? ' active' : '')}
              onClick={() => setActiveSection(key)}>
              {s.sheetSource}
            </div>
          ))}
        </div>
      )}

      {sec && (
        <div className="card">
          <div className="card-body">
            <h4 style={{ marginTop: 0 }}>
              {sec.stats.answered}/{sec.stats.total} questions répondues
            </h4>
            <div style={{ overflowX: 'auto' }}>
              <table className="table" style={{ fontSize: 12 }}>
                <thead>
                  <tr>
                    {sec.items[0]?.theme !== undefined && sec.items.some(i => i.theme) && <th>Thème</th>}
                    <th>Question</th>
                    <th>Réponse</th>
                  </tr>
                </thead>
                <tbody>
                  {sec.items.map((item, i) => (
                    <tr key={i}>
                      {sec.items.some(it => it.theme) && <td style={{ color: '#6b7280' }}>{item.theme}</td>}
                      <td style={{ maxWidth: 300 }}>{item.question}</td>
                      <td style={{
                        maxWidth: 500,
                        color: item.reponse ? '#111827' : '#dc2626',
                        fontStyle: item.reponse ? 'normal' : 'italic',
                      }}>
                        {item.reponse || '(non répondu)'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
