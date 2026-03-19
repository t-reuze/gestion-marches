import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import StatusBadge from '../components/StatusBadge';
import KpiCard from '../components/KpiCard';
import { marches, STATUT_CONFIG, formatDate } from '../data/mockData';
import { useMarcheMeta } from '../context/MarcheMetaContext';

function parseBudget(s) { return parseInt(String(s).replace(/[\s€]/g, '')) || 0; }
function formatBudget(n) {
  if (n >= 1_000_000) return (n / 1_000_000).toLocaleString('fr-FR', { maximumFractionDigits: 1 }) + ' M€';
  return n.toLocaleString('fr-FR') + ' €';
}

export default function Dashboard() {
  const [filtre, setFiltre] = useState('tous');
  const [search, setSearch] = useState('');
  const navigate = useNavigate();
  const { getMeta } = useMarcheMeta();

  function mergeMarche(m) {
    const meta = getMeta(m.id);
    return {
      ...m, ...meta,
      tags: meta.tags ? (Array.isArray(meta.tags) ? meta.tags : meta.tags.split(',').map(t => t.trim()).filter(Boolean)) : m.tags,
    };
  }

  const marchesMerged = marches.map(mergeMarche);
  const total       = marchesMerged.length;
  const actifs      = marchesMerged.filter(m => m.statut !== 'cloture').length;
  const offres      = marchesMerged.reduce((s, m) => s + (Number(m.nbOffresRecues) || 0), 0);
  const enAnalyse   = marchesMerged.filter(m => m.statut === 'analyse').length;
  const budgetTotal = marchesMerged.reduce((s, m) => s + parseBudget(m.budgetEstime), 0);

  const filtres = [
    { value: 'tous',        label: 'Tous' },
    { value: 'ouvert',      label: 'Ouverts' },
    { value: 'analyse',     label: 'En analyse' },
    { value: 'attribution', label: 'Attribution' },
    { value: 'reporting',   label: 'Reporting' },
    { value: 'cloture',     label: 'Clôturés' },
  ];

  const marchesFiltres = marchesMerged.filter(m => {
    const matchStatut = filtre === 'tous' || m.statut === filtre;
    const matchSearch = !search ||
      m.nom.toLowerCase().includes(search.toLowerCase()) ||
      m.reference.toLowerCase().includes(search.toLowerCase());
    return matchStatut && matchSearch;
  });

  return (
    <Layout title="Tableau de bord" sub="Vue d'ensemble des marchés">
      <div className="kpi-grid">
        <KpiCard label="Total marchés"  value={total}     color="#E8501A" sub={actifs + ' actif' + (actifs > 1 ? 's' : '')} />
        <KpiCard label="Offres reçues"  value={offres}    color="#10B981" sub={'sur ' + total + ' marchés'} />
        <KpiCard label="En analyse"     value={enAnalyse} color="#F59E0B" sub={'marché' + (enAnalyse > 1 ? 's' : '') + ' en cours'} />
        <KpiCard label="Budget estimé"  value={budgetTotal > 0 ? formatBudget(budgetTotal) : '—'} color="#8B5CF6" sub={'estimation cumulée'} />
      </div>

      <div className="filters-row">
        <input
          className="filter-input"
          placeholder="Rechercher un marché…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ width: 240 }}
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

      {marchesFiltres.length === 0 ? (
        <div className="empty-state">
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
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                    <span className="marche-ref">{m.reference}</span>
                    <StatusBadge statut={m.statut} />
                  </div>
                  <div className="marche-nom">{m.nom}</div>
                  <div className="marche-desc">{m.description}</div>
                </div>
                <div className="marche-card-body">
                  <div className="marche-meta">
                    {m.responsable      && <span className="marche-meta-item">{m.responsable}</span>}
                    {m.service          && <span className="marche-meta-item">{m.service}</span>}
                    {m.nbLots      > 0  && <span className="marche-meta-item">{m.nbLots} lot{m.nbLots > 1 ? 's' : ''}</span>}
                    {m.nbOffresRecues > 0 && <span className="marche-meta-item">{m.nbOffresRecues} offre{m.nbOffresRecues !== 1 ? 's' : ''}</span>}
                    {m.dateLimiteDepot  && <span className="marche-meta-item">Limite : {formatDate(m.dateLimiteDepot)}</span>}
                    {m.budgetEstime     && <span className="marche-meta-item">{m.budgetEstime}</span>}
                  </div>
                  {m.tags && m.tags.length > 0 && (
                    <div className="marche-tags">
                      {m.tags.map(t => <span key={t} className="tag">{t}</span>)}
                    </div>
                  )}
                  {m.progression > 0 && (
                    <>
                      <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 5 }}>Progression — {m.progression}%</div>
                      <div className="marche-progress-bar">
                        <div className="marche-progress-fill" style={{ width: m.progression + '%', background: cfg.color || 'var(--orange)' }} />
                      </div>
                    </>
                  )}
                </div>
                <div className="marche-card-footer">
                  <button className="btn btn-primary btn-sm" onClick={() => navigate('/marche/' + m.id + '/notation')}>
                    Notation
                  </button>
                  {m.hasReporting && (
                    <button className="btn btn-outline btn-sm" onClick={() => navigate('/marche/' + m.id + '/reporting')}>
                      Reporting
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
