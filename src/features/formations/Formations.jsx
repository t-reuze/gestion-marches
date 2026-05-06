import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../../components/Layout';
import KpiCard from '../../components/KpiCard';
import MedTechHero from '../../components/MedTechHero';
import { formations } from '../../data/mockData';
import { useFormationsMeta } from '../../context/FormationsMetaContext';
import { useNewFormations } from '../../context/NewFormationsContext';

/* ── Helpers ───────────────────────────────────────────────── */
function formatDateFormation(d) {
  if (!d) return '—';
  if (!d.includes('-')) return d;
  const [y, m, day] = d.split('-');
  if (!day) return d;
  return day + '/' + m + '/' + y;
}

function isUrgent(dateStr) {
  if (!dateStr || !dateStr.includes('-')) return false;
  const d = new Date(dateStr);
  const now = new Date();
  const sixMonths = new Date(now.getFullYear(), now.getMonth() + 6, now.getDate());
  return d <= sixMonths;
}

/* ── Status config ─────────────────────────────────────────── */
const STATUTS_F = {
  planifie:      { label: 'Planifié',              color: '#64748B' },
  inscriptions:  { label: 'Inscriptions ouvertes', color: '#16A34A' },
  en_cours:      { label: 'En cours',              color: '#D97706' },
  termine:       { label: 'Terminé',               color: '#8B5CF6' },
  annule:        { label: 'Annulé',                color: '#EF4444' },
};

/* ── KPI Icons ─────────────────────────────────────────────── */
const IconGrad = () => (
  <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 8l8-4 8 4-8 4-8-4z"/>
    <path d="M6 10v4c0 1.5 2 3 4 3s4-1.5 4-3v-4"/>
  </svg>
);
const IconRefresh = () => (
  <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 3v5h-5"/><path d="M3 10a7 7 0 0 1 12.9-3.5L17 8"/>
    <path d="M3 17v-5h5"/><path d="M17 10a7 7 0 0 1-12.9 3.5L3 12"/>
  </svg>
);
const IconClock = () => (
  <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="10" cy="10" r="8"/><polyline points="10,5 10,10 13,12"/>
  </svg>
);
const IconAlert = () => (
  <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10 2L1 18h18L10 2z"/><line x1="10" y1="8" x2="10" y2="12"/>
    <circle cx="10" cy="15" r=".5" fill="currentColor"/>
  </svg>
);

/* ── Badges ────────────────────────────────────────────────── */
function StatusBadge({ statut }) {
  if (!statut) return null;
  const cfg = STATUTS_F[statut] || { label: statut, color: '#64748B' };
  return (
    <span style={{
      display: 'inline-block', padding: '4px 12px', borderRadius: 20,
      fontSize: 11, fontWeight: 600, background: cfg.color + '15',
      color: cfg.color, border: '1px solid ' + cfg.color + '30',
    }}>
      {cfg.label}
    </span>
  );
}

/* ── Filter definitions ────────────────────────────────────── */
const FILTRES = [
  { value: 'tous',         label: 'Toutes' },
  { value: 'renouveler',   label: 'À renouveler' },
  { value: 'planifie',     label: 'Planifié' },
  { value: 'inscriptions', label: 'Inscriptions' },
  { value: 'en_cours',     label: 'En cours' },
  { value: 'termine',      label: 'Terminé' },
  { value: 'annule',       label: 'Annulé' },
];

/* ── Main component ────────────────────────────────────────── */
export default function Formations() {
  const navigate = useNavigate();
  const { getMeta } = useFormationsMeta();
  const { newFormations } = useNewFormations();
  const [search, setSearch] = useState('');
  const [filtre, setFiltre] = useState('tous');

  const allFormations = [...formations, ...newFormations].map(f => {
    const meta = getMeta(f.id);
    return { ...f, ...meta };
  });

  const total        = allFormations.length;
  const aRenouveler  = allFormations.filter(f => f.renouvellement).length;
  const urgentes     = allFormations.filter(f => isUrgent(f.dateEcheance)).length;
  const enCours      = allFormations.filter(f => {
    const m = getMeta(f.id);
    return m.statut === 'en_cours' || m.statut === 'inscriptions';
  }).length;

  const filtered = allFormations.filter(f => {
    const meta = getMeta(f.id);
    const matchFiltre =
      filtre === 'tous' ||
      (filtre === 'renouveler' && f.renouvellement) ||
      (filtre !== 'renouveler' && meta.statut === filtre);
    const matchSearch = !search ||
      f.nom.toLowerCase().includes(search.toLowerCase()) ||
      (f.responsablePedagogique || '').toLowerCase().includes(search.toLowerCase()) ||
      (f.contact || '').toLowerCase().includes(search.toLowerCase());
    return matchFiltre && matchSearch;
  });

  return (
    <Layout title="Formations" sub="Suivi des formations scientifiques">

      {/* Hero MedTech 3D */}
      <MedTechHero
        theme="molecules"
        eyebrow="Unicancer · Formation"
        title="Formations scientifiques"
        subtitle="Suivez les formations à renouveler, les inscriptions et les modèles économiques."
        kpis={[
          { label: 'À renouveler', value: aRenouveler, sub: 'formations' },
          { label: 'En cours',     value: enCours,     sub: 'actives' },
          { label: 'Urgentes',     value: urgentes,    sub: '< 6 mois' },
        ]}
      />
      {false && (
        <div className="hero-banner">
        <div style={{ position: 'relative', zIndex: 1, flex: 1 }}>
          <div className="hero-eyebrow">{'Unicancer \u00b7 Formation'}</div>
          <div className="hero-title">Formations scientifiques</div>
          <div className="hero-subtitle">
            {'Suivez les formations \u00e0 renouveler, les inscriptions et les mod\u00e8les \u00e9conomiques.'}
          </div>
          <div className="hero-stats">
            <span className="hero-stat">
              <span className="hero-stat-dot" style={{ background: '#16A34A' }} />
              {aRenouveler + ' \u00e0 renouveler'}
            </span>
            <span className="hero-stat">
              <span className="hero-stat-dot" style={{ background: '#D97706' }} />
              {enCours + ' en cours'}
            </span>
            {urgentes > 0 && (
              <span className="hero-stat">
                <span className="hero-stat-dot" style={{ background: '#EF4444' }} />
                {urgentes + ' \u00e9ch\u00e9ance' + (urgentes > 1 ? 's' : '') + ' proche' + (urgentes > 1 ? 's' : '')}
              </span>
            )}
          </div>
        </div>
      </div>
      )}

      {/* KPI Grid */}
      <div className="kpi-grid">
        <KpiCard label="Total formations" value={total} color="#E8501A" icon={<IconGrad />}
          sub={aRenouveler + ' \u00e0 renouveler'} />
        <KpiCard label={'\u00c0 renouveler'} value={aRenouveler} color="#16A34A" icon={<IconRefresh />}
          sub={'sur ' + total + ' formations'} />
        <KpiCard label="En cours / Inscriptions" value={enCours} color="#D97706" icon={<IconClock />}
          sub={'formation' + (enCours > 1 ? 's' : '') + ' active' + (enCours > 1 ? 's' : '')} />
        <KpiCard label={'\u00c9ch\u00e9ances proches'} value={urgentes} color="#EF4444" icon={<IconAlert />}
          sub="dans les 6 prochains mois" />
      </div>

      {/* Filters */}
      <div className="filters-row">
        <input
          className="filter-input"
          placeholder="Rechercher une formation..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ width: 240 }}
        />
        <div className="tabs" style={{ marginBottom: 0 }}>
          {FILTRES.map(f => (
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

      {/* Section Heading */}
      <div className="section-heading">
        <span className="section-heading-label">Formations</span>
        <span className="section-heading-line" />
        <span className="section-heading-count">
          {filtered.length + ' r\u00e9sultat' + (filtered.length > 1 ? 's' : '')}
        </span>
      </div>

      {/* Cards */}
      {filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-title">Aucune formation trouv&eacute;e</div>
          <div className="empty-sub">Modifiez vos crit&egrave;res de recherche.</div>
        </div>
      ) : (
        <div className="marche-grid">
          {filtered.map(f => {
            const meta = getMeta(f.id);
            const urgent = isUrgent(f.dateEcheance);
            return (
              <div
                key={f.id}
                className="marche-card fade-in"
                style={{ cursor: 'pointer' }}
                onClick={() => navigate('/formations/' + f.id)}
              >
                <div className="marche-card-header">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                    <span className="marche-ref" style={{ color: urgent ? '#EF4444' : 'var(--orange)' }}>
                      {'\u00c9ch\u00e9ance : ' + formatDateFormation(f.dateEcheance)}
                    </span>
                    <StatusBadge statut={meta.statut} />
                  </div>
                  <div className="marche-nom">{f.nom}</div>
                  {f.commentaires && <div className="marche-desc">{f.commentaires}</div>}
                </div>

                <div className="marche-card-body">
                  <div className="marche-meta">
                    {f.responsablePedagogique && (
                      <span className="marche-meta-item">{'Resp. : ' + f.responsablePedagogique}</span>
                    )}
                    {f.contact && (
                      <span className="marche-meta-item">{'Contact : ' + f.contact}</span>
                    )}
                  </div>
                  <div className="marche-tags">
                    {f.renouvellement && (
                      <span className="tag" style={{ background: '#F0FDF4', color: '#16A34A', border: '1px solid #BBF7D0' }}>
                        {'\u00c0 renouveler'}
                      </span>
                    )}
                    {urgent && (
                      <span className="tag" style={{ background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA' }}>
                        {'\u00c9ch\u00e9ance proche'}
                      </span>
                    )}
                  </div>
                </div>

                <div className="marche-card-footer">
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={e => { e.stopPropagation(); navigate('/formations/' + f.id); }}
                  >
                    {'D\u00e9tails'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Layout>
  );
}
