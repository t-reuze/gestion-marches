import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import StatusBadge from '../components/StatusBadge';
import KpiCard from '../components/KpiCard';
import { marches, STATUT_CONFIG, formatDate } from '../data/mockData';

function parseBudget(s) { return parseInt(String(s).replace(/[\s€]/g, '')) || 0; }
function formatBudget(n) {
  if (n >= 1_000_000) return (n / 1_000_000).toLocaleString('fr-FR', { maximumFractionDigits: 1 }) + ' M€';
  return n.toLocaleString('fr-FR') + ' €';
}

export default function Dashboard() {
  const [filtre, setFiltre]   = useState('tous');
  const [search, setSearch]   = useState('');
  const navigate = useNavigate();

  // KPIs calculés depuis les données réelles
  const total       = marches.length;
  const actifs      = marches.filter(m => m.statut !== 'cloture').length;
  const offres      = marches.reduce((s, m) => s + (m.nbOffresRecues || 0), 0);
  const enAnalyse   = marches.filter(m => m.statut === 'analyse').length;
  const budgetTotal = marches.reduce((s, m) => s + parseBudget(m.budgetEstime), 0);

  const filtres = [
    { value: 'tous',        label: 'Tous' },
    { value: 'ouvert',      label: 'Ouverts' },
    { value: 'analyse',     label: 'En analyse' },
    { value: 'attribution', label: 'Attribution' },
    { value: 'reporting',   label: 'Reporting' },
    { value: 'cloture',     label: 'Clôturés' },
  ];

  const marchesFiltres = marches.filter(m => {
    const matchStatut = filtre === 'tous' || m.statut === filtre;
    const matchSearch = !search ||
      m.nom.toLowerCase().includes(search.toLowerCase()) ||
      m.reference.toLowerCase().includes(search.toLowerCase());
    return matchStatut && matchSearch;
  });

  return (
    <Layout title="Tableau de bord" sub="— Vue d'ensemble des marchés en cours">

      {/* KPIs */}
      <div className="kpi-grid">
        <KpiCard label="Total marchés"    value={total}               color="#1A4FA8" icon="📋" sub={actifs + ' actif' + (actifs > 1 ? 's' : '')} />
        <KpiCard label="Offres reçues"    value={offres}              color="#10B981" icon="📥" sub={'sur ' + total + ' marchés'} />
        <KpiCard label="En analyse"       value={enAnalyse}           color="#F59E0B" icon="🔍" sub={'marché' + (enAnalyse > 1 ? 's' : '') + ' en cours'} />
        <KpiCard label="Budget total"     value={formatBudget(budgetTotal)} color="#8B5CF6" icon="💶" sub={'estimation cumulée'} />
      </div>

      {/* Filtres */}
      <div className="filters-row" style={{ marginBottom: 16 }}>
        <input
          className="filter-input"
          placeholder="Rechercher un marché…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ width: 220 }}
        />
        {filtres.map(f => (
          <button
            key={f.value}
            className={'btn btn-sm ' + (filtre === f.value ? 'btn-primary' : 'btn-outline')}
            onClick={() => setFiltre(f.value)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Grille marchés */}
      {marchesFiltres.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🔍</div>
          <div className="empty-title">Aucun marché trouvé</div>
          <div className="empty-sub">Modifiez vos critères de recherche.</div>
        </div>
      ) : (
        <div className="marche-grid">
          {marchesFiltres.map(m => {
            const cfg = STATUT_CONFIG[m.statut] || {};
            return (
              <div key={m.id} className="marche-card fade-in">
                <div className="marche-card-header">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <span className="marche-ref">{m.reference}</span>
                    <StatusBadge statut={m.statut} />
                  </div>
                  <div className="marche-nom">{m.nom}</div>
                  <div className="marche-desc">{m.description}</div>
                </div>

                <div className="marche-card-body">
                  <div className="marche-meta">
                    <span className="marche-meta-item">👤 {m.responsable}</span>
                    <span className="marche-meta-item">🏥 {m.service}</span>
                    <span className="marche-meta-item">📦 {m.nbLots} lot{m.nbLots > 1 ? 's' : ''}</span>
                    <span className="marche-meta-item">📥 {m.nbOffresRecues} offre{m.nbOffresRecues !== 1 ? 's' : ''}</span>
                    <span className="marche-meta-item">📅 Limite : {formatDate(m.dateLimiteDepot)}</span>
                    <span className="marche-meta-item">💶 {m.budgetEstime}</span>
                  </div>
                  <div className="marche-tags">
                    {m.tags.map(t => <span key={t} className="tag">{t}</span>)}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4 }}>
                    Progression — {m.progression}%
                  </div>
                  <div className="marche-progress-bar">
                    <div
                      className="marche-progress-fill"
                      style={{ width: m.progression + '%', background: cfg.color || '#3B82F6' }}
                    />
                  </div>
                </div>

                <div className="marche-card-footer">
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => navigate('/marche/' + m.id + '/notation')}
                  >
                    ✏️ Notation
                  </button>
                  {m.hasAnalyse && (
                    <button className="btn btn-outline btn-sm" onClick={() => navigate('/marche/' + m.id + '/analyse')}>
                      🔍 Analyse
                    </button>
                  )}
                  {m.hasReporting && (
                    <button className="btn btn-outline btn-sm" onClick={() => navigate('/marche/' + m.id + '/reporting')}>
                      📈 Reporting
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Layout>
  );
}
