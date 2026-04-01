import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Chart, RadarController, BarController, RadialLinearScale, LinearScale, CategoryScale, PointElement, LineElement, BarElement, Tooltip, Legend } from 'chart.js';
Chart.register(RadarController, BarController, RadialLinearScale, LinearScale, CategoryScale, PointElement, LineElement, BarElement, Tooltip, Legend);

import Layout from '../../components/Layout';
import StatusBadge from '../../components/StatusBadge';
import KpiCard from '../../components/KpiCard';
import EmptyState from '../../components/EmptyState';
import { marches, getAnalyseData, getClassement, noteColor, formatDate } from '../../data/mockData';
import MarcheNavTabs from '../../components/MarcheNavTabs';

const MEDALS = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣', '6️⃣'];
const ONGLETS = ['Vue d\'ensemble', 'Classement', 'Détail par critère', 'Fournisseurs'];

export default function AnalyseOffres() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [onglet, setOnglet] = useState(0);
  const [filtreF, setFiltreF] = useState('tous');
  const barRef = useRef(null);
  const radarRef = useRef(null);
  const barChart = useRef(null);
  const radarChart = useRef(null);

  const marche = marches.find(m => m.id === id);
  const analyse = getAnalyseData(id);

  useEffect(() => {
    if (!analyse || onglet !== 0) return;
    const classement = getClassement(analyse.fournisseurs, analyse.criteres, analyse.notes);
    setTimeout(() => {
      if (barChart.current) { barChart.current.destroy(); barChart.current = null; }
      if (radarChart.current) { radarChart.current.destroy(); radarChart.current = null; }
      if (barRef.current) {
        barChart.current = new Chart(barRef.current.getContext('2d'), {
          type: 'bar',
          data: {
            labels: analyse.criteres.map(c => c.label.replace('Évaluation ', '')),
            datasets: classement.slice(0, 4).map(f => ({
              label: f.produit,
              data: analyse.criteres.map(c => {
                const n = analyse.notes.find(x => x.fournisseurId === f.id && x.critereId === c.id);
                return n ? +n.note.toFixed(2) : 0;
              }),
              backgroundColor: f.couleur + 'CC', borderColor: f.couleur, borderWidth: 1, borderRadius: 4,
            })),
          },
          options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { position: 'bottom', labels: { font: { size: 10 }, boxWidth: 10 } } },
            scales: { y: { min: 0, max: 5 }, x: { ticks: { font: { size: 10 } } } },
          },
        });
      }
      if (radarRef.current) {
        radarChart.current = new Chart(radarRef.current.getContext('2d'), {
          type: 'radar',
          data: {
            labels: analyse.criteres.map(c => c.icon + ' ' + c.label.replace('Évaluation ', '')),
            datasets: classement.slice(0, 4).map(f => ({
              label: f.produit,
              data: analyse.criteres.map(c => {
                const n = analyse.notes.find(x => x.fournisseurId === f.id && x.critereId === c.id);
                return n ? +n.note.toFixed(2) : 0;
              }),
              borderColor: f.couleur, backgroundColor: f.couleur + '22', borderWidth: 2, pointRadius: 3,
            })),
          },
          options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { position: 'bottom', labels: { font: { size: 10 }, boxWidth: 10 } } },
            scales: { r: { min: 0, max: 5, ticks: { stepSize: 1, font: { size: 9 } } } },
          },
        });
      }
    }, 50);
    return () => {
      if (barChart.current) { barChart.current.destroy(); barChart.current = null; }
      if (radarChart.current) { radarChart.current.destroy(); radarChart.current = null; }
    };
  }, [analyse, onglet]);

  if (!marche) return <Layout title="Erreur"><EmptyState icon="❌" title="Marché introuvable" /></Layout>;

  if (!analyse) return (
    <Layout title={marche.reference + ' — ' + marche.nom} sub="— Analyse des offres">
      <MarcheNavTabs />
      <EmptyState
        icon="🔍"
        title="Aucune analyse disponible"
        sub="Les offres de ce marché ne sont pas encore disponibles pour l'analyse. Revenez une fois les offres reçues et analysées."
        action={
          marche.hasReporting
            ? <button className="btn btn-primary" onClick={() => navigate('/marche/' + id + '/reporting')}>📈 Voir le reporting</button>
            : <button className="btn btn-outline" onClick={() => navigate('/')}>← Retour au tableau de bord</button>
        }
      />
    </Layout>
  );

  const classement = getClassement(analyse.fournisseurs, analyse.criteres, analyse.notes);
  const winner = classement[0];
  const nbNotes = analyse.notes.length;
  const nbPossible = analyse.fournisseurs.length * analyse.criteres.length;

  return (
    <Layout
      title={marche.reference + ' — ' + marche.nom}
      sub="— Analyse des offres"
      actions={
        <div style={{ display: 'flex', gap: 8 }}>
          <StatusBadge statut={marche.statut} />
          {marche.hasReporting && (
            <button className="btn btn-outline btn-sm" onClick={() => navigate('/marche/' + id + '/reporting')}>
              📈 Reporting
            </button>
          )}
        </div>
      }
    >
      <MarcheNavTabs />
      {/* KPIs */}
      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        <KpiCard label="Fournisseurs évalués" value={analyse.fournisseurs.length} color="#1A4FA8" icon="🏭" sub={marche.nbLots + ' lot(s)'} />
        <KpiCard label="Critères pondérés" value={analyse.criteres.length} color="#7C3AED" icon="⚖️" sub={analyse.criteres.map(c => c.poids + '%').join(' · ')} />
        <KpiCard label="Meilleure offre" value={winner.produit} color="#10B981" icon="🥇" sub={'Note : ' + winner.noteGlobale.toFixed(3) + '/5'} />
        <KpiCard label="Complétion" value={Math.round(analyse.completion * 100) + '%'} color="#F59E0B" icon="📊" sub={nbNotes + '/' + nbPossible + ' notes saisies'} />
      </div>

      {/* Onglets */}
      <div className="tabs">
        {ONGLETS.map((o, i) => (
          <div key={i} className={'tab' + (onglet === i ? ' active' : '')} onClick={() => setOnglet(i)}>{o}</div>
        ))}
      </div>

      {/* ── Onglet 0 : Vue d'ensemble ── */}
      {onglet === 0 && (
        <div className="fade-in">
          <div className="info-box green" style={{ marginBottom: 16 }}>
            <strong>Recommandation provisoire — {winner.produit} ({winner.nom})</strong>
            <span style={{ marginLeft: 8, fontFamily: 'DM Mono, monospace', fontWeight: 700 }}>{winner.noteGlobale.toFixed(3)}/5</span>
          </div>
          <div className="charts-grid">
            <div className="card">
              <div className="card-header"><span className="card-title">📊 Notes par critère</span></div>
              <div className="card-body" style={{ height: 260 }}>
                <canvas ref={barRef} />
              </div>
            </div>
            <div className="card">
              <div className="card-header"><span className="card-title">🕸 Radar multi-critères</span></div>
              <div className="card-body" style={{ height: 260 }}>
                <canvas ref={radarRef} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Onglet 1 : Classement ── */}
      {onglet === 1 && (
        <div className="fade-in" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
          {classement.map((f, r) => (
            <div key={f.id} className="card">
              <div className="card-header" style={{ background: 'linear-gradient(135deg,' + f.couleur + ' 0%,' + f.couleur + 'bb 100%)' }}>
                <span style={{ fontSize: 20 }}>{MEDALS[r] || r + 1}</span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13, color: '#fff' }}>{f.produit}</div>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,.6)' }}>{f.nom}</div>
                </div>
                <div style={{ marginLeft: 'auto', fontFamily: 'DM Mono, monospace', fontWeight: 800, fontSize: 18, color: '#fff' }}>
                  {f.noteGlobale.toFixed(3)}
                </div>
              </div>
              <div className="card-body">
                {analyse.criteres.map(c => {
                  const n = analyse.notes.find(x => x.fournisseurId === f.id && x.critereId === c.id);
                  const note = n ? n.note : 0;
                  return (
                    <div key={c.id} style={{ marginBottom: 8 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, marginBottom: 2 }}>
                        <span style={{ color: 'var(--text-muted)' }}>{c.icon} {c.label.replace('Évaluation ', '')} <span style={{ color: 'var(--text-muted)', opacity: .6 }}>×{c.poids}%</span></span>
                        <span style={{ fontFamily: 'DM Mono, monospace', fontWeight: 700, color: noteColor(note) }}>{note.toFixed(2)}</span>
                      </div>
                      <div className="progress">
                        <div className="progress-fill" style={{ width: (note / 5 * 100) + '%', background: noteColor(note) }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Onglet 2 : Détail par critère ── */}
      {onglet === 2 && (
        <div className="fade-in">
          {analyse.criteres.map(c => (
            <div key={c.id} className="card" style={{ marginBottom: 14 }}>
              <div className="card-header" style={{ background: c.couleur + '18', borderBottom: '2px solid ' + c.couleur + '44' }}>
                <span style={{ fontSize: 16 }}>{c.icon}</span>
                <div>
                  <span className="card-title">{c.label}</span>
                  <span style={{ marginLeft: 8, fontSize: 10, color: 'var(--text-muted)' }}>Poids : {c.poids}%</span>
                </div>
              </div>
              <div className="table-container" style={{ borderRadius: 0, border: 'none' }}>
                <table>
                  <thead>
                    <tr>
                      <th>Fournisseur</th>
                      <th>Produit</th>
                      <th className="td-center">Note /5</th>
                      <th>Barre</th>
                      <th className="td-center">Contribution ×{c.poids}%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...analyse.fournisseurs]
                      .map(f => ({ ...f, note: (analyse.notes.find(x => x.fournisseurId === f.id && x.critereId === c.id)?.note || 0) }))
                      .sort((a, b) => b.note - a.note)
                      .map(f => (
                        <tr key={f.id}>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <div className="vendor-pill" style={{ background: f.couleur }}>{f.initiales}</div>
                              <span style={{ fontWeight: 600, fontSize: 12 }}>{f.nom}</span>
                            </div>
                          </td>
                          <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>{f.produit}</td>
                          <td className="td-center">
                            <span className="score-chip" style={{ background: noteColor(f.note) + '18', color: noteColor(f.note) }}>{f.note.toFixed(2)}</span>
                          </td>
                          <td style={{ width: 140 }}>
                            <div className="progress" style={{ width: 120 }}>
                              <div className="progress-fill" style={{ width: (f.note / 5 * 100) + '%', background: noteColor(f.note) }} />
                            </div>
                          </td>
                          <td className="td-center td-mono">{(f.note * c.poids / 100).toFixed(3)}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Onglet 3 : Fournisseurs ── */}
      {onglet === 3 && (
        <div className="fade-in">
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Fournisseur</th>
                  <th>Produit</th>
                  {analyse.criteres.map(c => <th key={c.id} className="td-center">{c.icon} {c.poids}%</th>)}
                  <th className="td-center">Score global</th>
                </tr>
              </thead>
              <tbody>
                {classement.map((f, r) => (
                  <tr key={f.id}>
                    <td><span className="medal">{MEDALS[r] || r + 1}</span></td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div className="vendor-pill" style={{ background: f.couleur }}>{f.initiales}</div>
                        <div>
                          <div style={{ fontWeight: 600 }}>{f.nom}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>{f.produit}</td>
                    {analyse.criteres.map(c => {
                      const n = analyse.notes.find(x => x.fournisseurId === f.id && x.critereId === c.id);
                      const note = n ? n.note : 0;
                      return (
                        <td key={c.id} className="td-center">
                          <span className="score-chip" style={{ background: noteColor(note) + '18', color: noteColor(note), fontSize: 11 }}>
                            {note.toFixed(2)}
                          </span>
                        </td>
                      );
                    })}
                    <td className="td-center">
                      <span className="score-chip" style={{ background: noteColor(f.noteGlobale) + '22', color: noteColor(f.noteGlobale), fontWeight: 800, fontSize: 13 }}>
                        {f.noteGlobale.toFixed(3)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Layout>
  );
}
