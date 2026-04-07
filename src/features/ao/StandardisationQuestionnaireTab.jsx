/**
 * StandardisationQuestionnaireTab.jsx
 * UI semi-auto pour standardiser les questionnaires (QT et RSE).
 * Réutilise le pipeline questionnaire générique.
 */
import React, { useState } from 'react';
import { processQuestionnaireFolder } from '../../utils/analysePipeline/index.js';

export default function StandardisationQuestionnaireTab({ dirHandle, marcheId, subdir, docType, label }) {
  const [results, setResults] = useState([]);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState('');
  const [openIdx, setOpenIdx] = useState(null);

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
        </div>
        {error && <div style={{ color: '#dc2626', padding: 12, fontSize: 13 }}>⚠ {error}</div>}
      </div>

      {results.length > 0 && (
        <div className="card">
          <div className="card-body">
            <table className="table" style={{ fontSize: 13 }}>
              <thead>
                <tr>
                  <th>Fournisseur</th>
                  <th>Sections</th>
                  <th>Questions répondues</th>
                  <th>Confiance</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {results.map((r, i) => {
                  const sects = Object.values(r.sections || {});
                  const totalQ = sects.reduce((s, x) => s + (x.stats?.total || 0), 0);
                  const ans = sects.reduce((s, x) => s + (x.stats?.answered || 0), 0);
                  const pct = totalQ > 0 ? Math.round((ans / totalQ) * 100) : 0;
                  const color = pct >= 90 ? '#10b981' : pct >= 50 ? '#f59e0b' : '#ef4444';
                  return (
                    <tr key={i}>
                      <td><strong>{r.fournisseur}</strong></td>
                      <td>{sects.map(s => s.sheetSource).join(', ') || '—'}</td>
                      <td style={{ color, fontWeight: 600 }}>
                        {totalQ > 0 ? `${ans}/${totalQ} (${pct}%)` : '—'}
                      </td>
                      <td>{(r.meta.overallConfidence * 100).toFixed(0)}%</td>
                      <td>
                        <button className="btn btn-sm" onClick={() => setOpenIdx(i)}>Inspecter</button>
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
        Source : {data.sourceFile} · Type : <strong>{data.docType}</strong>
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
