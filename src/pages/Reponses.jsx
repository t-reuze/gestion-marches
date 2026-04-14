import { useState } from 'react';
import { useParams } from 'react-router-dom';
import Layout from '../components/Layout';
import MarcheNavTabs from '../components/MarcheNavTabs';
import EmptyState from '../components/EmptyState';
import { marches } from '../data/mockData';
import { useNotation } from '../context/NotationContext';

function noteColor(n) {
  if (n >= 4.25) return '#10B981';
  if (n >= 3.5)  return '#F59E0B';
  return '#EF4444';
}

export default function Reponses() {
  const { id } = useParams();
  const { getSession } = useNotation();
  const marche = marches.find(m => m.id === id);
  const session = getSession(id);
  const [activeV, setActiveV] = useState(0);

  if (!marche) return (
    <Layout title="Erreur">
      <EmptyState title="Marche introuvable" />
    </Layout>
  );

  const title = marche.reference + ' — ' + marche.nom;

  if (!session) return (
    <Layout title={title} sub="— Réponses fournisseurs">
      <MarcheNavTabs />
      <EmptyState
        title="Aucun fichier charge"
        sub="Chargez un fichier Excel via l'onglet Notation pour voir les réponses fournisseurs."
      />
    </Layout>
  );

  const { vendors, questions } = session;
  const v = vendors[activeV] || vendors[0];

  function avg(vendor) {
    const vals = questions
      .filter(q => !q.skipped[vendor.name])
      .map(q => q.notes[vendor.name])
      .filter(n => n !== null && n !== undefined && !isNaN(n));
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
  }

  const notedCount = questions.filter(q =>
    !q.skipped[v.name] && q.notes[v.name] !== null && !isNaN(q.notes[v.name])
  ).length;

  return (
    <Layout title={title} sub="— Réponses fournisseurs">
      <MarcheNavTabs />

      {/* Vendor selector */}
      <div className="vendor-selector">
        {vendors.map((vv, i) => {
          const a = avg(vv);
          return (
            <div
              key={vv.name}
              className={'vendor-tab' + (i === activeV ? ' active' : '')}
              style={{ '--vcolor': vv.color }}
              onClick={() => setActiveV(i)}
            >
              <div className="vendor-tab-pill" style={{ background: vv.color }}>{vv.initials}</div>
              <div className="vendor-tab-info">
                <div className="vendor-tab-name">{vv.label.split('(')[0].trim()}</div>
                <div className="vendor-tab-score" style={{ color: a !== null ? noteColor(a) : 'var(--text-muted)' }}>
                  {a !== null ? a.toFixed(2) + ' / 5' : 'non noté'}
                </div>
              </div>
              {i === activeV && <div className="vendor-tab-bar" style={{ background: vv.color }}></div>}
            </div>
          );
        })}
      </div>

      {/* Vendor header */}
      <div className="reponses-header" style={{ borderLeft: '4px solid ' + v.color }}>
        <div className="vendor-pill" style={{ background: v.color, width: 36, height: 36, fontSize: 12 }}>{v.initials}</div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15 }}>{v.label.split('(')[0].trim()}</div>
          {v.sub && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{v.sub}</div>}
        </div>
        <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
          <div style={{ fontWeight: 800, fontSize: 20, color: avg(v) !== null ? noteColor(avg(v)) : 'var(--text-muted)' }}>
            {avg(v) !== null ? avg(v).toFixed(3) : '—'}
          </div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{notedCount} / {questions.length} critères notés</div>
        </div>
      </div>

      {/* Questions table */}
      <div className="card" style={{ marginTop: 16 }}>
        <div className="table-container" style={{ border: 'none' }}>
          <table>
            <thead>
              <tr>
                <th style={{ width: 36 }}>#</th>
                <th>Critère</th>
                <th style={{ minWidth: 300 }}>Réponse du fournisseur</th>
                <th style={{ width: 90, textAlign: 'center' }}>Note /5</th>
              </tr>
            </thead>
            <tbody>
              {questions.map((q, i) => {
                const ans = q.answers[v.name] || '—';
                const note = q.notes[v.name];
                const hasNote = note !== null && note !== undefined && !isNaN(note);
                const isSkipped = !!q.skipped[v.name];
                return (
                  <tr key={i} style={isSkipped ? { opacity: .5 } : {}}>
                    <td className="td-mono" style={{ fontSize: 11, color: 'var(--text-muted)' }}>{q.num}</td>
                    <td style={{ fontSize: 11, fontWeight: 600, maxWidth: 220 }}>
                      <div style={{ lineHeight: 1.45 }}>{q.question}</div>
                      {q.methode && q.methode !== '—' && (
                        <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{q.methode}</div>
                      )}
                    </td>
                    <td>
                      {isSkipped
                        ? <span style={{ fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic' }}>Non noté — exclu du calcul</span>
                        : <div className="reponse-text">{ans}</div>
                      }
                      {!isSkipped && q.comments?.[v.name] && (
                        <div className="reponse-comment">{q.comments[v.name]}</div>
                      )}
                    </td>
                    <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                      {isSkipped
                        ? <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>N/N</span>
                        : hasNote
                          ? <span className="score-chip" style={{ background: noteColor(note) + '18', color: noteColor(note), fontSize: 13, fontWeight: 800 }}>
                              {note.toFixed(2)}
                            </span>
                          : <span style={{ color: 'var(--text-muted)' }}>—</span>
                      }
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  );
}
