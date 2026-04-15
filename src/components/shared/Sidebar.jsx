import { useState } from 'react';
import { NavLink, useParams, useLocation } from 'react-router-dom';
import { SECTEURS, getMarchesBySecteur, formations } from '../../data/mockData';
import { useNotation } from '../../context/NotationContext';
import { useMarcheMeta } from '../../context/MarcheMetaContext';
import { useFormationsMeta } from '../../context/FormationsMetaContext';
import { useNewFormations } from '../../context/NewFormationsContext';
import { useNewMarches } from '../../context/NewMarchesContext';
import AddMarcheModal from '../AddMarcheModal';
import AddFormationModal from '../AddFormationModal';

/* ── Icons ──────────────────────────────────────────────────── */
const IconPen = () => (
  <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 2l3 3-9 9H2v-3l9-9z"/>
  </svg>
);

const IconChevron = ({ open }) => (
  <svg
    width="12" height="12" viewBox="0 0 16 16" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    style={{ transform: open ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 200ms' }}
  >
    <polyline points="6,4 10,8 6,12"/>
  </svg>
);

const IconSearch = () => (
  <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
    <circle cx="6.5" cy="6.5" r="4.5"/>
    <line x1="10" y1="10" x2="14" y2="14"/>
  </svg>
);

/* ── Status dot colors ──────────────────────────────────────── */
const STATUT_DOT = {
  sourcing:    '#0EA5E9',
  ouvert:      '#3B82F6',
  analyse:     '#F59E0B',
  attribution: '#8B5CF6',
  reporting:   '#64748B',
  cloture:     '#9CA3AF',
};

// Ordre d'avancement — clôturés en fin de liste
const STATUT_ORDER = { sourcing: 0, ouvert: 1, analyse: 2, attribution: 3, reporting: 4, cloture: 5 };
function statutRank(s) { return STATUT_ORDER[s] ?? 99; }

const STATUT_DOT_F = {
  planifie:     '#64748B',
  inscriptions: '#10B981',
  en_cours:     '#F59E0B',
  termine:      '#8B5CF6',
  annule:       '#EF4444',
};

const FORMATION_GROUPS = [
  { key: 'renouveler', label: 'À renouveler',    filter: f => f.renouvellement },
  { key: 'autres',     label: 'Autres formations', filter: f => !f.renouvellement },
];

export default function Sidebar() {
  const { id: activeId } = useParams();
  const { pathname } = useLocation();
  const { getSession }  = useNotation();
  const { getMeta }     = useMarcheMeta();
  const { getMeta: getFormMeta } = useFormationsMeta();
  const { newFormations } = useNewFormations();
  const { newMarches }    = useNewMarches();

  const [search,    setSearch]    = useState('');
  const [showAdd,   setShowAdd]   = useState(false);
  const [showAddF,  setShowAddF]  = useState(false);
  const [collapsed, setCollapsed] = useState(() => ({
    ...Object.fromEntries(Object.keys(SECTEURS).map(k => [k, true])),
    ...Object.fromEntries(FORMATION_GROUPS.map(g => [g.key, true])),
  }));

  const isMarches    = pathname === '/' || pathname.startsWith('/marche');
  const isFormations = pathname.startsWith('/formations');

  const toggle = (key) => setCollapsed((c) => ({ ...c, [key]: !c[key] }));

  return (
    <aside className={'sidebar' + (!isMarches && !isFormations ? ' sidebar--empty' : '')}>
      {isMarches && (
        <>
          {/* Search */}
          <div className="sidebar-search">
            <span className="sidebar-search-icon"><IconSearch /></span>
            <input
              className="sidebar-search-input"
              placeholder="Rechercher…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Bouton ajouter */}
          <div style={{ padding: '0 12px 8px' }}>
            <button
              className="btn btn-sm"
              style={{ width: '100%', fontSize: 12, background: '#2D5F8A', color: '#fff', border: 'none' }}
              onClick={() => setShowAdd(true)}
            >
              + Ajouter un marché
            </button>
          </div>
          {showAdd && <AddMarcheModal onClose={() => setShowAdd(false)} />}

          {/* Secteurs + marchés */}
          <nav className="sidebar-nav">
            {Object.entries(SECTEURS).map(([key, secteur]) => {
              const staticMarches = getMarchesBySecteur(key);
              const userMarches = newMarches.filter(m => m.secteur === key);
              const marches = [...staticMarches, ...userMarches]
                .filter((m) => !search || m.nom.toLowerCase().includes(search.toLowerCase()))
                .map(m => ({ ...m, _statut: getMeta(m.id).statut || m.statut }))
                .sort((a, b) => {
                  const ra = statutRank(a._statut);
                  const rb = statutRank(b._statut);
                  if (ra !== rb) return ra - rb;
                  return a.nom.localeCompare(b.nom, 'fr', { sensitivity: 'base' });
                });

              // Hide empty secteurs when searching
              if (search && !marches.length) return null;

              const isOpen = !collapsed[key];

              return (
                <div key={key} className="sidebar-secteur">
                  <button
                    className="sidebar-secteur-label"
                    onClick={() => toggle(key)}
                  >
                    <span className="sidebar-secteur-title">
                      {secteur.label}
                      {marches.length > 0 && (
                        <span className="sidebar-secteur-count">{marches.length}</span>
                      )}
                    </span>
                    <span className="sidebar-secteur-chevron">
                      <IconChevron open={isOpen} />
                    </span>
                  </button>

                  {isOpen && marches.length > 0 && (
                    <div className="sidebar-secteur-items">
                      {marches.map((m) => {
                        const statut    = m._statut;
                        const hasSession = !!getSession(m.id);
                        const isActive  = activeId === m.id;
                        const isCloture = statut === 'cloture';

                        return (
                          <NavLink
                            key={m.id}
                            to={'/marche/' + m.id + '/notation'}
                            className={() =>
                              'nav-item nav-marche-item' + (isActive ? ' active' : '') + (isCloture ? ' is-cloture' : '')
                            }
                            style={isCloture ? { opacity: 0.6 } : undefined}
                            title={isCloture ? m.nom + ' (clôturé)' : m.nom}
                          >
                            <span
                              className="nm-dot"
                              style={{ background: STATUT_DOT[statut] || '#94A3B8' }}
                            />
                            <span className="nm-nom" style={isCloture ? { textDecoration: 'line-through', color: 'var(--text-muted)' } : undefined}>
                              {m.nom}
                            </span>
                            {hasSession && (
                              <span className="nm-session" title="Session active">
                                <IconPen />
                              </span>
                            )}
                          </NavLink>
                        );
                      })}
                    </div>
                  )}

                  {isOpen && marches.length === 0 && !search && (
                    <div className="sidebar-secteur-empty">Aucun marché</div>
                  )}
                </div>
              );
            })}
          </nav>
        </>
      )}

      {isFormations && (
        <>
          {/* Search */}
          <div className="sidebar-search">
            <span className="sidebar-search-icon"><IconSearch /></span>
            <input
              className="sidebar-search-input"
              placeholder="Rechercher…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Bouton ajouter */}
          <div style={{ padding: '0 12px 8px' }}>
            <button
              className="btn btn-sm"
              style={{ width: '100%', fontSize: 12, background: '#2D5F8A', color: '#fff', border: 'none' }}
              onClick={() => setShowAddF(true)}
            >
              + Ajouter une formation
            </button>
          </div>
          {showAddF && <AddFormationModal onClose={() => setShowAddF(false)} />}

          {/* Formations groups */}
          <nav className="sidebar-nav">
            {FORMATION_GROUPS.map(group => {
              const allF = [...formations, ...newFormations];
              const items = allF
                .filter(group.filter)
                .filter(f => !search || f.nom.toLowerCase().includes(search.toLowerCase()));

              if (search && !items.length) return null;

              const isOpen = !collapsed[group.key];

              return (
                <div key={group.key} className="sidebar-secteur">
                  <button
                    className="sidebar-secteur-label"
                    onClick={() => toggle(group.key)}
                  >
                    <span className="sidebar-secteur-title">
                      {group.label}
                      {items.length > 0 && (
                        <span className="sidebar-secteur-count">{items.length}</span>
                      )}
                    </span>
                    <span className="sidebar-secteur-chevron">
                      <IconChevron open={isOpen} />
                    </span>
                  </button>

                  {isOpen && items.length > 0 && (
                    <div className="sidebar-secteur-items">
                      {items.map(f => {
                        const meta = getFormMeta(f.id);
                        const statut = meta.statut;
                        const isActive = activeId === f.id;

                        return (
                          <NavLink
                            key={f.id}
                            to={'/formations/' + f.id}
                            className={() =>
                              'nav-item nav-marche-item' + (isActive ? ' active' : '')
                            }
                          >
                            <span
                              className="nm-dot"
                              style={{ background: STATUT_DOT_F[statut] || (f.renouvellement ? '#10B981' : '#94A3B8') }}
                            />
                            <span className="nm-nom">{f.nom}</span>
                          </NavLink>
                        );
                      })}
                    </div>
                  )}

                  {isOpen && items.length === 0 && !search && (
                    <div className="sidebar-secteur-empty">Aucune formation</div>
                  )}
                </div>
              );
            })}
          </nav>
        </>
      )}

      <div className="sidebar-footer">
        <div className="sidebar-footer-text">UNICANCER · v2026</div>
      </div>
    </aside>
  );
}
