import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import StatusBadge from '../components/StatusBadge';
import KpiCard from '../components/KpiCard';
import { marches, SECTEURS, STATUT_CONFIG, formatDate } from '../data/mockData';
import { useMarcheMeta } from '../context/MarcheMetaContext';
import { useNewMarches } from '../context/NewMarchesContext';
import AddMarcheModal from '../components/AddMarcheModal';

/* ── KPI Icons ──────────────────────────────────────────────── */
const IconFolder = () => (
  <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 6a2 2 0 0 1 2-2h3.5l2 2H16a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6z"/>
  </svg>
);
const IconInbox = () => (
  <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="2,13 5,8 9,10 15,3 18,8"/>
    <path d="M2 16h16v-4H13l-1.5 2h-3L7 12H2v4z"/>
  </svg>
);
const IconSearch = () => (
  <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="8.5" cy="8.5" r="5.5"/>
    <line x1="13" y1="13" x2="18" y2="18"/>
  </svg>
);
const IconBudget = () => (
  <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="10" cy="10" r="8"/>
    <path d="M10 6v1m0 6v1m-2.5-4.5h4a1.5 1.5 0 0 1 0 3h-4"/>
  </svg>
);

function parseBudget(s) { return parseInt(String(s).replace(/[\s€]/g, '')) || 0; }
function formatBudget(n) {
  if (n >= 1_000_000) return (n / 1_000_000).toLocaleString('fr-FR', { maximumFractionDigits: 1 }) + ' M€';
  return n.toLocaleString('fr-FR') + ' €';
}

export default function Dashboard() {
  const [filtre, setFiltre] = useState('tous');
  const [search, setSearch] = useState('');
  const [filtreSecteur, setFiltreSecteur] = useState('tous');
  const [showAdd, setShowAdd] = useState(false);
  const navigate = useNavigate();
  const { getMeta } = useMarcheMeta();
  const { newMarches } = useNewMarches();

  function mergeMarche(m) {
    const meta = getMeta(m.id);
    return {
      ...m, ...meta,
      tags: meta.tags
        ? (Array.isArray(meta.tags) ? meta.tags : meta.tags.split(',').map(t => t.trim()).filter(Boolean))
        : m.tags,
    };
  }

  const marchesMerged = [...marches, ...newMarches].map(mergeMarche);
  const total       = marchesMerged.length;
  const actifs      = marchesMerged.filter(m => m.statut !== 'cloture').length;
  const offres      = marchesMerged.reduce((s, m) => s + (Number(m.nbOffresRecues) || 0), 0);
  const enAnalyse   = marchesMerged.filter(m => m.statut === 'analyse').length;
  const budgetTotal = marchesMerged.reduce((s, m) => s + parseBudget(m.budgetEstime), 0);

  const secteurStats = Object.entries(SECTEURS).map(([key, s]) => ({
    key,
    label: s.label,
    icon: s.icon,
    count: marchesMerged.filter(m => m.secteur === key).length,
  }));

  const filtres = [
    { value: 'tous',        label: 'Tous' },
    { value: 'ouvert',      label: 'Ouverts' },
    { value: 'analyse',     label: 'En analyse' },
    { value: 'attribution', label: 'Attribution' },
    { value: 'reporting',   label: 'Reporting' },
    { value: 'cloture',     label: 'Clôturés' },
  ];

  const marchesFiltres = marchesMerged.filter(m => {
    const matchStatut  = filtre === 'tous' || m.statut === filtre;
    const matchSecteur = filtreSecteur === 'tous' || m.secteur === filtreSecteur;
    const matchSearch  = !search ||
      m.nom.toLowerCase().includes(search.toLowerCase()) ||
      m.reference.toLowerCase().includes(search.toLowerCase());
    return matchStatut && matchSecteur && matchSearch;
  });

  return (
    <Layout title="Tableau de bord" sub="Vue d'ensemble des marchés">

      {/* ── Hero Banner ──────────────────────────────────────── */}
      <div className="hero-banner">
        <div style={{ position: 'relative', zIndex: 1, flex: 1 }}>
          <div className="hero-eyebrow">Unicancer · Achats</div>
          <div className="hero-title">Gestion des projets</div>
          <div className="hero-subtitle">
            Suivez, analysez et pilotez l'ensemble de vos appels d'offres en temps réel.
          </div>
          <div className="hero-stats">
            <span className="hero-stat">
              <span className="hero-stat-dot" style={{ background: '#4ADE80' }} />
              {actifs} marché{actifs > 1 ? 's' : ''} actif{actifs > 1 ? 's' : ''}
            </span>
            <span className="hero-stat">
              <span className="hero-stat-dot" style={{ background: '#FBBF24' }} />
              {enAnalyse} en analyse
            </span>
            <span className="hero-stat">
              <span className="hero-stat-dot" style={{ background: '#60A5FA' }} />
              {offres} offre{offres > 1 ? 's' : ''} reçue{offres > 1 ? 's' : ''}
            </span>
            {budgetTotal > 0 && (
              <span className="hero-stat">
                <span className="hero-stat-dot" style={{ background: '#E8501A' }} />
                {formatBudget(budgetTotal)} estimé
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Secteur Pills ────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        <button
          className={'btn btn-sm ' + (filtreSecteur === 'tous' ? 'btn-primary' : 'btn-outline')}
          onClick={() => setFiltreSecteur('tous')}
        >
          Tous les secteurs ({marchesMerged.length})
        </button>
        {secteurStats.filter(s => s.count > 0).map(s => (
          <button
            key={s.key}
            className={'btn btn-sm ' + (filtreSecteur === s.key ? 'btn-primary' : 'btn-outline')}
            onClick={() => setFiltreSecteur(s.key)}
            style={filtreSecteur === s.key ? {} : { opacity: 0.75 }}
          >
            {s.icon} {s.label} ({s.count})
          </button>
        ))}
      </div>

      {/* ── KPI Grid ─────────────────────────────────────────── */}
      <div className="kpi-grid">
        <KpiCard
          label="Total marchés"
          value={total}
          color="#1E3A5F"
          icon={<IconFolder />}
          sub={actifs + ' actif' + (actifs > 1 ? 's' : '')}
        />
        <KpiCard
          label="Offres reçues"
          value={offres}
          color="#16A34A"
          icon={<IconInbox />}
          sub={'sur ' + total + ' marchés'}
        />
        <KpiCard
          label="En analyse"
          value={enAnalyse}
          color="#D97706"
          icon={<IconSearch />}
          sub={'marché' + (enAnalyse > 1 ? 's' : '') + ' en cours'}
        />
        <KpiCard
          label="Budget estimé"
          value={budgetTotal > 0 ? formatBudget(budgetTotal) : '—'}
          color="#7C3AED"
          icon={<IconBudget />}
          sub="estimation cumulée"
        />
      </div>

      {/* ── Filters ──────────────────────────────────────────── */}
      <div className="filters-row">
        <input
          className="filter-input"
          placeholder="Rechercher un marché…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ width: 240 }}
        />
        <div className="tabs" style={{ marginBottom: 0 }}>
          {filtres.map(f => (
            <div
              key={f.value}
              className={'tab' + (filtre === f.value ? ' active' : '')}
              onClick={() => setFiltre(f.value)}
            >
              {f.label}
            </div>
          ))}
        </div>
      </div>

      {/* ── Section Heading ──────────────────────────────────── */}
      <div className="section-heading">
        <span className="section-heading-label">Marchés</span>
        <span className="section-heading-line" />
        <span className="section-heading-count">
          {marchesFiltres.length} résultat{marchesFiltres.length > 1 ? 's' : ''}
        </span>
        <button
          className="btn btn-primary btn-sm"
          onClick={() => setShowAdd(true)}
          style={{ marginLeft: 12 }}
        >
          + Ajouter un marché
        </button>
      </div>

      {showAdd && <AddMarcheModal onClose={() => setShowAdd(false)} />}

      {/* ── Cards ────────────────────────────────────────────── */}
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
                    {m.responsable     && <span className="marche-meta-item">{m.responsable}</span>}
                    {m.service         && <span className="marche-meta-item">{m.service}</span>}
                    {m.nbLots     > 0  && <span className="marche-meta-item">{m.nbLots} lot{m.nbLots > 1 ? 's' : ''}</span>}
                    {m.nbOffresRecues > 0 && <span className="marche-meta-item">{m.nbOffresRecues} offre{m.nbOffresRecues !== 1 ? 's' : ''}</span>}
                    {m.dateLimiteDepot && <span className="marche-meta-item">Limite : {formatDate(m.dateLimiteDepot)}</span>}
                    {m.budgetEstime    && <span className="marche-meta-item">{m.budgetEstime}</span>}
                  </div>
                  {m.tags && m.tags.length > 0 && (
                    <div className="marche-tags">
                      {m.tags.map(t => <span key={t} className="tag">{t}</span>)}
                    </div>
                  )}
                  {m.progression > 0 && (
                    <>
                      <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 5 }}>
                        Progression — {m.progression}%
                      </div>
                      <div className="marche-progress-bar">
                        <div
                          className="marche-progress-fill"
                          style={{ width: m.progression + '%', background: cfg.color || 'var(--orange)' }}
                        />
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
