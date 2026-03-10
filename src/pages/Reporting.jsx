import { useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Chart, BarController, CategoryScale, LinearScale, BarElement, Tooltip, Legend } from 'chart.js';
Chart.register(BarController, CategoryScale, LinearScale, BarElement, Tooltip, Legend);

import Layout from '../components/Layout';
import MarcheNavTabs from '../components/MarcheNavTabs';
import KpiCard from '../components/KpiCard';
import StatusBadge from '../components/StatusBadge';
import { marches, STATUT_CONFIG, formatDate } from '../data/mockData';

function parseBudget(s) { return parseInt(String(s).replace(/[\s€]/g, '')) || 0; }
function formatBudget(n) {
  if (n >= 1_000_000) return (n / 1_000_000).toLocaleString('fr-FR', { maximumFractionDigits: 1 }) + ' M€';
  return n.toLocaleString('fr-FR') + ' €';
}

export default function Reporting() {
  const { id } = useParams();
  const navigate = useNavigate();
  const barRef  = useRef(null);
  const barChart = useRef(null);

  const marche   = id ? marches.find(m => m.id === id) : null;
  const isGlobal = !marche;

  // KPIs calculés depuis les données réelles
  const scope       = isGlobal ? marches : [marche];
  const total       = marches.length;
  const actifs      = marches.filter(m => m.statut !== 'cloture').length;
  const offres      = marches.reduce((s, m) => s + (m.nbOffresRecues || 0), 0);
  const budgetTotal = marches.reduce((s, m) => s + parseBudget(m.budgetEstime), 0);

  // Données pour le graphique — triées par progression décroissante
  const chartData = [...marches].sort((a, b) => b.progression - a.progression);

  useEffect(() => {
    if (barChart.current) { barChart.current.destroy(); barChart.current = null; }
    if (!barRef.current) return;
    barChart.current = new Chart(barRef.current.getContext('2d'), {
      type: 'bar',
      data: {
        labels: chartData.map(m => m.nom),
        datasets: [{
          label: 'Progression (%)',
          data: chartData.map(m => m.progression),
          backgroundColor: chartData.map(m => (STATUT_CONFIG[m.statut]?.color || '#3B82F6') + 'BB'),
          borderColor:     chartData.map(m =>  STATUT_CONFIG[m.statut]?.color || '#3B82F6'),
          borderWidth: 1, borderRadius: 6,
        }],
      },
      options: {
        indexAxis: 'y',
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { min: 0, max: 100, ticks: { callback: v => v + '%' } },
          y: { ticks: { font: { size: 11 } } },
        },
      },
    });
    return () => { if (barChart.current) { barChart.current.destroy(); barChart.current = null; } };
  }, []);

  const title = marche ? marche.reference + ' — ' + marche.nom : 'Reporting global';
  const sub   = marche ? '— Suivi et bilan' : '— Synthèse de tous les marchés';

  return (
    <Layout title={title} sub={sub}>
      <MarcheNavTabs />

      {/* KPIs */}
      <div className="kpi-grid">
        <KpiCard label="Total marchés"  value={total}               color="#1A4FA8" icon="📋" sub={actifs + ' actif' + (actifs > 1 ? 's' : '')} />
        <KpiCard label="Offres reçues"  value={offres}              color="#10B981" icon="📥" sub={'cumulées tous marchés'} />
        <KpiCard label="En analyse"     value={marches.filter(m => m.statut === 'analyse').length} color="#F59E0B" icon="🔍" sub={"marchés en cours d'éval."} />
        <KpiCard label="Budget total"   value={formatBudget(budgetTotal)} color="#8B5CF6" icon="💶" sub={'estimation cumulée'} />
      </div>

      {/* Graphique progression horizontal */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header"><span className="card-title">📊 Progression des marchés</span></div>
        <div className="card-body" style={{ height: 300 }}>
          <canvas ref={barRef} />
        </div>
      </div>

      {/* Tableau synthèse */}
      <div className="section-title">Tableau de synthèse</div>
      <div className="table-container" style={{ marginBottom: 20 }}>
        <table>
          <thead>
            <tr>
              <th>Référence</th>
              <th>Marché</th>
              <th>Responsable</th>
              <th>Service</th>
              <th>Statut</th>
              <th className="td-center">Offres</th>
              <th className="td-center">Lots</th>
              <th>Budget estimé</th>
              <th>Progression</th>
              <th>Dates clés</th>
            </tr>
          </thead>
          <tbody>
            {marches.map(m => (
              <tr
                key={m.id}
                style={{ cursor: 'pointer' }}
                onClick={() => navigate('/marche/' + m.id + '/notation')}
              >
                <td>
                  <span style={{ fontWeight: 700, color: 'var(--blue)', fontFamily: 'DM Mono,monospace', fontSize: 11 }}>
                    {m.reference}
                  </span>
                </td>
                <td>
                  <div style={{ fontWeight: 600, fontSize: 12 }}>{m.nom}</div>
                </td>
                <td style={{ fontSize: 11 }}>{m.responsable}</td>
                <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>{m.service}</td>
                <td><StatusBadge statut={m.statut} /></td>
                <td className="td-center td-mono">{m.nbOffresRecues}</td>
                <td className="td-center td-mono">{m.nbLots}</td>
                <td style={{ fontSize: 11, whiteSpace: 'nowrap' }}>{m.budgetEstime}</td>
                <td style={{ width: 140 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div className="progress" style={{ flex: 1 }}>
                      <div
                        className="progress-fill"
                        style={{ width: m.progression + '%', background: STATUT_CONFIG[m.statut]?.color || '#3B82F6' }}
                      />
                    </div>
                    <span style={{ fontSize: 10, fontFamily: 'DM Mono,monospace', color: 'var(--text-muted)', width: 32 }}>
                      {m.progression}%
                    </span>
                  </div>
                </td>
                <td style={{ fontSize: 10, color: 'var(--text-muted)', lineHeight: 1.8 }}>
                  <div>Dépôt : {formatDate(m.dateLimiteDepot)}</div>
                  <div>Attribution : {formatDate(m.dateAttributionPrevue)}</div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Layout>
  );
}
