import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { marches, formations, STATUT_CONFIG, SECTEURS } from '../data/mockData';
import { useMarcheMeta } from '../context/MarcheMetaContext';
import { useFormationsMeta } from '../context/FormationsMetaContext';

/* ── Helpers ─────────────────────────────────────────────── */

const MONTHS_FR = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];

/** Try to parse an ISO-ish date string; returns Date or null */
function parseDate(raw) {
  if (!raw) return null;
  const s = String(raw).trim();
  // Full ISO: 2026-04-03
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const d = new Date(s + 'T00:00:00');
    return isNaN(d.getTime()) ? null : d;
  }
  // Year only: 2027
  if (/^\d{4}$/.test(s)) {
    return new Date(Number(s), 0, 1);
  }
  return null;
}

function monthsUntil(date) {
  const now = new Date();
  return (date.getFullYear() - now.getFullYear()) * 12 + (date.getMonth() - now.getMonth());
}

/* ── Component ───────────────────────────────────────────── */

export default function Calendrier() {
  const navigate = useNavigate();
  const { getMeta } = useMarcheMeta();
  const { getMeta: getFormMeta } = useFormationsMeta();

  const [selectedYear, setSelectedYear] = useState(2026);
  const [typeFilter, setTypeFilter] = useState('tous'); // tous | marches | formations

  const years = [2026, 2027, 2028, 2029, 2030];
  const typeFilters = [
    { value: 'tous', label: 'Tous' },
    { value: 'marches', label: 'Marchés' },
    { value: 'formations', label: 'Formations' },
  ];

  /* ── Build events list ─────────────────────────────────── */
  const events = useMemo(() => {
    const list = [];

    if (typeFilter !== 'formations') {
      marches.forEach(m => {
        const meta = getMeta(m.id);
        const merged = { ...m, ...meta };

        // Date limite de dépot
        const dld = parseDate(merged.dateLimiteDepot);
        if (dld) {
          list.push({
            id: m.id + '-depot',
            type: 'marche-depot',
            label: merged.nom,
            ref: merged.reference,
            date: dld,
            color: 'var(--orange, #E8501A)',
            bgColor: '#FFF3ED',
            tag: 'Limite dépôt',
            navigateTo: '/marche/' + m.id + '/notation',
          });
        }

        // Date attribution prévue
        const dap = parseDate(merged.dateAttributionPrevue);
        if (dap) {
          list.push({
            id: m.id + '-attrib',
            type: 'marche-attribution',
            label: merged.nom,
            ref: merged.reference,
            date: dap,
            color: '#3B82F6',
            bgColor: '#EFF6FF',
            tag: 'Attribution',
            navigateTo: '/marche/' + m.id + '/notation',
          });
        }

        // Date ouverture
        const dou = parseDate(merged.dateOuverture);
        if (dou) {
          list.push({
            id: m.id + '-ouverture',
            type: 'marche-ouverture',
            label: merged.nom,
            ref: merged.reference,
            date: dou,
            color: '#8B5CF6',
            bgColor: '#F5F3FF',
            tag: 'Ouverture',
            navigateTo: '/marche/' + m.id + '/notation',
          });
        }
      });
    }

    if (typeFilter !== 'marches') {
      formations.forEach(f => {
        const de = parseDate(f.dateEcheance);
        if (de) {
          list.push({
            id: f.id + '-echeance',
            type: 'formation',
            label: f.nom,
            ref: f.responsablePedagogique || f.contact || '',
            date: de,
            color: '#16A34A',
            bgColor: '#F0FDF4',
            tag: 'Formation',
            navigateTo: '/formations',
          });
        }
      });
    }

    return list;
  }, [typeFilter, getMeta]);

  /* ── Filter by year & group by month ───────────────────── */
  const groupedByMonth = useMemo(() => {
    const filtered = events.filter(e => e.date.getFullYear() === selectedYear);
    filtered.sort((a, b) => a.date - b.date);

    const groups = {};
    filtered.forEach(e => {
      const monthKey = e.date.getMonth();
      if (!groups[monthKey]) groups[monthKey] = [];
      groups[monthKey].push(e);
    });

    return Object.entries(groups)
      .map(([monthIdx, items]) => ({ monthIdx: Number(monthIdx), items }))
      .sort((a, b) => a.monthIdx - b.monthIdx);
  }, [events, selectedYear]);

  const totalEvents = groupedByMonth.reduce((s, g) => s + g.items.length, 0);

  /* ── Render ────────────────────────────────────────────── */
  return (
    <Layout title="Calendrier" sub="Échéances et dates clés">

      {/* ── Hero Banner ────────────────────────────────────── */}
      <div className="hero-banner">
        <div style={{ position: 'relative', zIndex: 1, flex: 1 }}>
          <div className="hero-eyebrow">Unicancer · Planning</div>
          <div className="hero-title">Calendrier des échéances</div>
          <div className="hero-subtitle">
            Visualisez toutes les dates clés : limites de dépôt, attributions prévues, et renouvellements de formations.
          </div>
          <div className="hero-stats">
            <span className="hero-stat">
              <span className="hero-stat-dot" style={{ background: '#E8501A' }} />
              {events.filter(e => e.type.startsWith('marche')).length} échéances marchés
            </span>
            <span className="hero-stat">
              <span className="hero-stat-dot" style={{ background: '#16A34A' }} />
              {events.filter(e => e.type === 'formation').length} échéances formations
            </span>
            <span className="hero-stat">
              <span className="hero-stat-dot" style={{ background: '#EF4444' }} />
              {events.filter(e => monthsUntil(e.date) >= 0 && monthsUntil(e.date) < 3).length} urgentes (&lt;3 mois)
            </span>
          </div>
        </div>
      </div>

      {/* ── Year pills ─────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        {years.map(y => (
          <button
            key={y}
            className={'btn btn-sm ' + (selectedYear === y ? 'btn-primary' : 'btn-outline')}
            onClick={() => setSelectedYear(y)}
          >
            {y}
          </button>
        ))}
      </div>

      {/* ── Type filter tabs ───────────────────────────────── */}
      <div className="filters-row">
        <div className="tabs" style={{ marginBottom: 0 }}>
          {typeFilters.map(f => (
            <div
              key={f.value}
              className={'tab' + (typeFilter === f.value ? ' active' : '')}
              onClick={() => setTypeFilter(f.value)}
            >
              {f.label}
            </div>
          ))}
        </div>
      </div>

      {/* ── Section heading ────────────────────────────────── */}
      <div className="section-heading">
        <span className="section-heading-label">Échéances {selectedYear}</span>
        <span className="section-heading-line" />
        <span className="section-heading-count">
          {totalEvents} événement{totalEvents > 1 ? 's' : ''}
        </span>
      </div>

      {/* ── Timeline grouped by month ──────────────────────── */}
      {groupedByMonth.length === 0 ? (
        <div className="empty-state">
          <div className="empty-title">Aucune échéance en {selectedYear}</div>
          <div className="empty-sub">Changez d'année ou de filtre pour voir d'autres événements.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {groupedByMonth.map(({ monthIdx, items }) => (
            <div key={monthIdx}>
              {/* Month header */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                marginBottom: 12,
              }}>
                <div style={{
                  background: 'var(--orange, #E8501A)',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: 13,
                  padding: '6px 14px',
                  borderRadius: 8,
                  minWidth: 100,
                  textAlign: 'center',
                  letterSpacing: 0.3,
                }}>
                  {MONTHS_FR[monthIdx]}
                </div>
                <div style={{
                  flex: 1,
                  height: 1,
                  background: 'var(--border, #E2E8F0)',
                }} />
                <span style={{
                  fontSize: 12,
                  color: 'var(--text-3, #94A3B8)',
                  fontWeight: 500,
                }}>
                  {items.length} événement{items.length > 1 ? 's' : ''}
                </span>
              </div>

              {/* Event cards */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingLeft: 16 }}>
                {items.map(ev => {
                  const urgent = monthsUntil(ev.date) >= 0 && monthsUntil(ev.date) < 3;
                  return (
                    <div
                      key={ev.id}
                      className="card"
                      onClick={() => navigate(ev.navigateTo)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 14,
                        padding: '12px 16px',
                        cursor: 'pointer',
                        borderLeft: urgent
                          ? '4px solid #EF4444'
                          : '4px solid ' + ev.color,
                        background: ev.bgColor,
                        borderRadius: 8,
                        transition: 'box-shadow 0.15s, transform 0.15s',
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)';
                        e.currentTarget.style.transform = 'translateY(-1px)';
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.boxShadow = '';
                        e.currentTarget.style.transform = '';
                      }}
                    >
                      {/* Date badge */}
                      <div style={{
                        minWidth: 52,
                        textAlign: 'center',
                        lineHeight: 1.2,
                      }}>
                        <div style={{
                          fontSize: 20,
                          fontWeight: 700,
                          color: urgent ? '#EF4444' : ev.color,
                        }}>
                          {ev.date.getDate()}
                        </div>
                        <div style={{
                          fontSize: 11,
                          color: 'var(--text-3, #94A3B8)',
                          textTransform: 'uppercase',
                          fontWeight: 600,
                          letterSpacing: 0.5,
                        }}>
                          {MONTHS_FR[ev.date.getMonth()].slice(0, 3)}
                        </div>
                      </div>

                      {/* Separator */}
                      <div style={{
                        width: 1,
                        height: 36,
                        background: 'var(--border, #E2E8F0)',
                      }} />

                      {/* Content */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                          {ev.ref && (
                            <span className="marche-ref" style={{ fontSize: 11 }}>
                              {ev.ref}
                            </span>
                          )}
                          <span style={{
                            fontWeight: 600,
                            fontSize: 14,
                            color: 'var(--text, #1E293B)',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}>
                            {ev.label}
                          </span>
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-3, #94A3B8)' }}>
                          {ev.date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </div>
                      </div>

                      {/* Tag */}
                      <span className="tag" style={{
                        background: ev.bgColor,
                        color: ev.color,
                        border: '1px solid ' + ev.color,
                        fontSize: 11,
                        fontWeight: 600,
                        whiteSpace: 'nowrap',
                      }}>
                        {ev.tag}
                      </span>

                      {/* Urgent badge */}
                      {urgent && (
                        <span className="tag" style={{
                          background: '#FEF2F2',
                          color: '#EF4444',
                          border: '1px solid #EF4444',
                          fontSize: 11,
                          fontWeight: 700,
                          whiteSpace: 'nowrap',
                        }}>
                          Urgent
                        </span>
                      )}

                      {/* Arrow */}
                      <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="var(--text-3, #94A3B8)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                        <polyline points="7,4 13,10 7,16" />
                      </svg>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </Layout>
  );
}
