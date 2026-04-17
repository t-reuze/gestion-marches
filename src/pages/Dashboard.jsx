import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import StatusBadge from '../components/StatusBadge';
import KpiCard from '../components/KpiCard';
import { marches, formations, SECTEURS, STATUT_CONFIG, formatDate } from '../data/mockData';
import { useMarcheMeta } from '../context/MarcheMetaContext';
import { useNewMarches } from '../context/NewMarchesContext';
import { useNotation } from '../context/NotationContext';
import { useNewFormations } from '../context/NewFormationsContext';
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

/* ── Alert Icons ─────────────────────────────────────────────── */
const IconClock = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="8" cy="8" r="7"/>
    <polyline points="8,4 8,8 11,10"/>
  </svg>
);
const IconWarning = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M8 1L1 14h14L8 1z"/>
    <line x1="8" y1="6" x2="8" y2="9"/>
    <circle cx="8" cy="11.5" r="0.5" fill="currentColor"/>
  </svg>
);

function parseBudget(s) { return parseInt(String(s).replace(/[\s€]/g, '')) || 0; }
function formatBudget(n) {
  if (n >= 1_000_000) return (n / 1_000_000).toLocaleString('fr-FR', { maximumFractionDigits: 1 }) + ' M€';
  return n.toLocaleString('fr-FR') + ' €';
}

/* ── Alert helpers ───────────────────────────────────────────── */
function parseLooseDate(str) {
  if (!str) return null;
  // Standard ISO date
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return new Date(str + 'T00:00:00');
  // Year only like "2027"
  if (/^\d{4}$/.test(str)) return new Date(str + '-01-01T00:00:00');
  // "début 2026" → Jan 1
  if (/^d[ée]but\s+(\d{4})$/i.test(str)) {
    const y = str.match(/(\d{4})/)[1];
    return new Date(y + '-01-01T00:00:00');
  }
  // "mi 2026" → Jul 1
  if (/^mi\s+(\d{4})$/i.test(str)) {
    const y = str.match(/(\d{4})/)[1];
    return new Date(y + '-07-01T00:00:00');
  }
  // "fin 2026" → Dec 31
  if (/^fin\s+(\d{4})$/i.test(str)) {
    const y = str.match(/(\d{4})/)[1];
    return new Date(y + '-12-31T00:00:00');
  }
  return null;
}

function daysDiff(target, now) {
  const diff = target.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function getAlertStyle(daysLeft) {
  if (daysLeft < 0) return { background: '#FEE2E2', borderColor: '#FECACA', color: '#991B1B' };
  if (daysLeft <= 7) return { background: '#FFF7ED', borderColor: '#FED7AA', color: '#9A3412' };
  return { background: '#FEFCE8', borderColor: '#FEF08A', color: '#854D0E' };
}

/* ── Notation completeness helper ────────────────────────────── */
function computeNotationProgress(session) {
  if (!session || !session.questions || !session.vendors) return null;
  const totalQuestions = session.questions.length;
  if (totalQuestions === 0) return null;
  const vendorCount = session.vendors.length;
  if (vendorCount === 0) return null;

  let completed = 0;
  for (const q of session.questions) {
    if (q.notes) {
      const notedVendors = Object.keys(q.notes).length;
      if (notedVendors >= vendorCount) completed++;
    }
  }
  return { completed, total: totalQuestions, pct: Math.round((completed / totalQuestions) * 100) };
}

export default function Dashboard() {
  const [filtre, setFiltre] = useState('tous');
  const [search, setSearch] = useState('');
  const [filtreSecteur, setFiltreSecteur] = useState('tous');
  const [showAdd, setShowAdd] = useState(false);
  const navigate = useNavigate();
  const { getMeta } = useMarcheMeta();
  const { newMarches, removeMarche } = useNewMarches();
  const { getSession } = useNotation();
  const { newFormations } = useNewFormations();

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

  /* ── Build alerts ────────────────────────────────────────────── */
  const now = new Date();
  const alerts = [];

  // Marchés with dateLimiteDepot within 30 days or already passed
  marchesMerged.forEach(m => {
    if (!m.dateLimiteDepot) return;
    const d = parseLooseDate(m.dateLimiteDepot);
    if (!d) return;
    const days = daysDiff(d, now);
    if (days <= 30) {
      alerts.push({
        id: m.id,
        type: 'marche',
        nom: m.nom,
        date: d,
        daysLeft: days,
        dateStr: m.dateLimiteDepot,
        navigate: '/marche/' + m.id,
      });
    }
  });

  // Formations with dateEcheance within 60 days or already passed
  const allFormations = [...formations, ...newFormations];
  allFormations.forEach(f => {
    if (!f.dateEcheance) return;
    const d = parseLooseDate(f.dateEcheance);
    if (!d) return;
    const days = daysDiff(d, now);
    if (days <= 60) {
      alerts.push({
        id: f.id,
        type: 'formation',
        nom: f.nom,
        date: d,
        daysLeft: days,
        dateStr: f.dateEcheance,
        navigate: '/formations/' + f.id,
      });
    }
  });

  // Sort alerts: most urgent first
  alerts.sort((a, b) => a.daysLeft - b.daysLeft);

  return (
    <Layout title="Marchés">

      {/* ── Hero Banner ──────────────────────────────────────── */}
      <div className="hero-banner">
        <div style={{ position: 'relative', zIndex: 1, flex: 1 }}>
          <div className="hero-eyebrow">{'Unicancer \u00b7 Achats'}</div>
          <div className="hero-title">{'March\u00e9s publics'}</div>
          <div className="hero-subtitle">
            {'Suivez, analysez et pilotez l\u2019ensemble de vos appels d\u2019offres en temps r\u00e9el.'}
          </div>
          <div className="hero-stats">
            <span className="hero-stat">
              <span className="hero-stat-dot" style={{ background: '#16A34A' }} />
              {actifs + ' march\u00e9' + (actifs > 1 ? 's' : '') + ' actif' + (actifs > 1 ? 's' : '')}
            </span>
            <span className="hero-stat">
              <span className="hero-stat-dot" style={{ background: '#D97706' }} />
              {enAnalyse + ' en analyse'}
            </span>
            <span className="hero-stat">
              <span className="hero-stat-dot" style={{ background: '#3B82F6' }} />
              {offres + ' offre' + (offres > 1 ? 's' : '') + ' re\u00e7ue' + (offres > 1 ? 's' : '')}
            </span>
          </div>
        </div>
      </div>

      {/* ── Alerts / Échéances ───────────────────────────────── */}
      {alerts.length > 0 && (
        <div style={{
          marginBottom: 20,
          overflowX: 'auto',
          WebkitOverflowScrolling: 'touch',
        }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-2)', marginBottom: 8 }}>
            Alertes et échéances
          </div>
          <div style={{
            display: 'flex',
            gap: 10,
            paddingBottom: 4,
            minWidth: 'min-content',
          }}>
            {alerts.map(a => {
              const style = getAlertStyle(a.daysLeft);
              return (
                <div
                  key={a.type + '-' + a.id}
                  onClick={() => navigate(a.navigate)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate(a.navigate); } }}
                  style={{
                    ...style,
                    border: '1px solid ' + style.borderColor,
                    borderRadius: 8,
                    padding: '10px 14px',
                    minWidth: 200,
                    maxWidth: 280,
                    cursor: 'pointer',
                    flexShrink: 0,
                    transition: 'box-shadow 150ms',
                  }}
                  onMouseEnter={e => e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)'}
                  onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <span style={{ display: 'flex', alignItems: 'center' }}>
                      {a.daysLeft < 0 ? <IconWarning /> : <IconClock />}
                    </span>
                    <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      {a.type === 'marche' ? 'Marché' : 'Formation'}
                    </span>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4, lineHeight: 1.3 }}>
                    {a.nom}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11 }}>
                    <span>{formatDate(a.dateStr)}</span>
                    <span style={{ fontWeight: 700 }}>
                      {a.daysLeft < 0
                        ? 'D\u00e9pass\u00e9 de ' + Math.abs(a.daysLeft) + ' jour' + (Math.abs(a.daysLeft) > 1 ? 's' : '')
                        : 'J-' + a.daysLeft
                      }
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

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
          color="#2D5F8A"
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
          className="btn btn-sm"
          onClick={() => setShowAdd(true)}
          style={{ marginLeft: 12, background: '#2D5F8A', color: '#fff', border: 'none' }}
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
            const session = getSession(m.id);
            const notationProgress = computeNotationProgress(session);
            return (
              <div
                key={m.id}
                className="marche-card fade-in"
                style={{ cursor: 'pointer' }}
                onClick={() => navigate('/marche/' + m.id)}
                role="button"
                tabIndex={0}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate('/marche/' + m.id); } }}
              >
                <div className="marche-card-header">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6, gap: 8 }}>
                    <span className="marche-ref">{m.reference}</span>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <StatusBadge statut={m.statut} />
                      {m.__userAdded && (
                        <button
                          title="Supprimer ce marché"
                          onClick={e => {
                            e.stopPropagation();
                            if (window.confirm('Supprimer définitivement « ' + m.nom + ' » ?')) removeMarche(m.id);
                          }}
                          style={{
                            border: '1px solid #EF4444', background: '#fff', color: '#EF4444',
                            borderRadius: 4, padding: '2px 6px', fontSize: 11, cursor: 'pointer', lineHeight: 1,
                          }}
                        >✕</button>
                      )}
                    </div>
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
                  {notationProgress && (
                    <div style={{ marginTop: 8 }}>
                      <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 3 }}>
                        Notation : {notationProgress.completed}/{notationProgress.total} crit\u00e8res
                      </div>
                      <div style={{
                        height: 3,
                        borderRadius: 2,
                        background: '#E2E8F0',
                        overflow: 'hidden',
                      }}>
                        <div style={{
                          height: '100%',
                          width: notationProgress.pct + '%',
                          background: '#3B82F6',
                          borderRadius: 2,
                          transition: 'width 300ms',
                        }} />
                      </div>
                    </div>
                  )}
                </div>

                <div className="marche-card-footer">
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={e => { e.stopPropagation(); navigate('/marche/' + m.id); }}
                  >
                    Ouvrir
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
