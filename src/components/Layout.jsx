import { NavLink, useParams } from 'react-router-dom';
import { marches } from '../data/mockData';
import { useNotation } from '../context/NotationContext';
import { useMarcheMeta } from '../context/MarcheMetaContext';

/* ── SVG Icons ─────────────────────────────────────────────── */
const IconGrid = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <rect x="1.5" y="1.5" width="5" height="5" rx="1"/>
    <rect x="9.5" y="1.5" width="5" height="5" rx="1"/>
    <rect x="1.5" y="9.5" width="5" height="5" rx="1"/>
    <rect x="9.5" y="9.5" width="5" height="5" rx="1"/>
  </svg>
);
const IconChart = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="1,12 5,7 9,9 15,2"/>
    <line x1="1" y1="14.5" x2="15" y2="14.5"/>
  </svg>
);
const IconBook = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 13V3a1 1 0 0 1 1-1h4.5a2 2 0 0 1 2 2v9"/>
    <path d="M9.5 4a2 2 0 0 1 2-2H14a1 1 0 0 1 1 1v10"/>
    <line x1="2" y1="13" x2="15" y2="13"/>
  </svg>
);
const IconClipboard = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="2.5" width="10" height="12" rx="1.5"/>
    <path d="M5.5 2.5V2a.5.5 0 0 1 .5-.5h4a.5.5 0 0 1 .5.5v.5"/>
    <line x1="5.5" y1="7" x2="10.5" y2="7"/>
    <line x1="5.5" y1="9.5" x2="8.5" y2="9.5"/>
  </svg>
);
const IconPen = () => (
  <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 2l3 3-9 9H2v-3l9-9z"/>
  </svg>
);

/* ── Logo UNICANCER ─────────────────────────────────────────── */
const LogoMark = () => (
  <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
    <path
      d="M4 3 L4 21 Q4 23 6 23 L18 23 Q20 23 20 21 L20 14"
      stroke="#E8501A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
    />
    <line x1="4" y1="3" x2="12" y2="3" stroke="#E8501A" strokeWidth="2.5" strokeLinecap="round"/>
  </svg>
);

const STATUT_DOT = {
  ouvert:      '#3B82F6',
  analyse:     '#F59E0B',
  attribution: '#8B5CF6',
  cloture:     '#10B981',
  reporting:   '#64748B',
};

export default function Layout({ children, title, sub, actions }) {
  const { id } = useParams();
  const { getSession } = useNotation();
  const { getMeta } = useMarcheMeta();
  const activeId = id || null;

  return (
    <div className="app-shell">
      {/* ── SIDEBAR ────────────────────────── */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <LogoMark />
          <div className="sidebar-logo-text">
            <span className="sidebar-brand">unicancer</span>
            <span className="sidebar-tagline">Gestion des marchés</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          <div className="sidebar-section-label">Navigation</div>

          <NavLink to="/" end className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')}>
            <span className="nav-icon"><IconGrid /></span>
            Tableau de bord
          </NavLink>

          <NavLink to="/reporting" className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')}>
            <span className="nav-icon"><IconChart /></span>
            Reporting global
          </NavLink>

          <NavLink to="/formations" className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')}>
            <span className="nav-icon"><IconBook /></span>
            Formations
          </NavLink>

          <div className="sidebar-divider" />
          <div className="sidebar-section-label">Outils</div>

          <NavLink to="/analyse-unicancer" className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')}>
            <span className="nav-icon"><IconClipboard /></span>
            AO Recrutement 2026
          </NavLink>

          <div className="sidebar-divider" />
          <div className="sidebar-section-label">Marchés</div>

          <div style={{ height: 4 }} />
          {marches.map(m => {
            const meta     = getMeta(m.id);
            const statut   = meta.statut || m.statut;
            const hasSession = !!getSession(m.id);
            const isActive = activeId === m.id;
            return (
              <NavLink
                key={m.id}
                to={'/marche/' + m.id + '/notation'}
                className={() => 'nav-item nav-marche-item' + (isActive ? ' active' : '')}
              >
                <span className="nm-dot" style={{ background: STATUT_DOT[statut] || '#94A3B8' }} />
                <span className="nm-nom">{m.nom}</span>
                {hasSession && (
                  <span className="nm-session" title="Session active">
                    <IconPen />
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-footer-text">UNICANCER · v2026</div>
        </div>
      </aside>

      {/* ── MAIN ───────────────────────────── */}
      <div className="main">
        <header className="topbar">
          <div className="topbar-left">
            <h1 className="topbar-title">{title || 'Gestion des marchés'}</h1>
            {sub && <span className="topbar-sub">{sub}</span>}
          </div>
          <div className="topbar-right">
            {actions}
          </div>
        </header>

        <main className="content fade-in">
          {children}
        </main>
      </div>
    </div>
  );
}
