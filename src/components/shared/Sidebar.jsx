import { useState } from 'react';
import { NavLink, useParams, useLocation } from 'react-router-dom';
import { SECTEURS } from '../../data/mockData';
import { useNotation } from '../../context/NotationContext';
import { useMarcheMeta } from '../../context/MarcheMetaContext';
import { useAllMarches } from '../../context/NewMarchesContext';

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
  ouvert:      '#3B82F6',
  analyse:     '#F59E0B',
  attribution: '#8B5CF6',
  cloture:     '#10B981',
  reporting:   '#64748B',
};

export default function Sidebar() {
  const { id: activeId } = useParams();
  const { pathname } = useLocation();
  const { getSession }  = useNotation();
  const { getMeta }     = useMarcheMeta();
  const allMarches      = useAllMarches();

  const [search,    setSearch]    = useState('');
  const [collapsed, setCollapsed] = useState({});

  // Sidebar is only relevant on the Marchés section
  const isMarches = pathname === '/' || pathname.startsWith('/marche');

  const toggle = (key) => setCollapsed((c) => ({ ...c, [key]: !c[key] }));

  return (
    <aside className={'sidebar' + (!isMarches ? ' sidebar--empty' : '')}>
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

          {/* Secteurs + marchés */}
          <nav className="sidebar-nav">
            {Object.entries(SECTEURS).map(([key, secteur]) => {
              const marches = allMarches.filter(m => m.secteur === key).filter((m) =>
                !search || m.nom.toLowerCase().includes(search.toLowerCase())
              );

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
                        const meta      = getMeta(m.id);
                        const statut    = meta.statut || m.statut;
                        const hasSession = !!getSession(m.id);
                        const isActive  = activeId === m.id;

                        return (
                          <NavLink
                            key={m.id}
                            to={'/marche/' + m.id + '/notation'}
                            className={() =>
                              'nav-item nav-marche-item' + (isActive ? ' active' : '')
                            }
                          >
                            <span
                              className="nm-dot"
                              style={{ background: STATUT_DOT[statut] || '#94A3B8' }}
                            />
                            <span className="nm-nom">{m.nom}</span>
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

      <div className="sidebar-footer">
        <div className="sidebar-footer-text">UNICANCER · v2026</div>
      </div>
    </aside>
  );
}
