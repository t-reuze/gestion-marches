import { NavLink, useParams } from 'react-router-dom';
import { marches } from '../data/mockData';
import { useNotation } from '../context/NotationContext';

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
  const activeId = id || null;

  return (
    <div className="app-shell">
      <div className="sidebar">
        <div className="sidebar-logo">
          <div className="app-name">⚕ Unicancer</div>
          <div className="app-sub">Gestion des marchés</div>
        </div>

        <div className="sidebar-section">
          <div className="sidebar-section-label">Navigation</div>
          <NavLink to="/" end className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')}>
            <span className="ni">📊</span>Tableau de bord
          </NavLink>
          <NavLink to="/reporting" className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')}>
            <span className="ni">📈</span>Reporting global
          </NavLink>
        </div>

        <div className="sidebar-section">
          <div className="sidebar-section-label">Marchés</div>
          {marches.map(m => {
            const hasSession = !!getSession(m.id);
            const dest = m.hasAnalyse
              ? '/marche/' + m.id + '/analyse'
              : m.hasReporting
                ? '/marche/' + m.id + '/reporting'
                : '/marche/' + m.id + '/notation';
            const isActive = activeId === m.id;
            return (
              <NavLink
                key={m.id}
                to={dest}
                className={() => 'nav-item nav-marche-item' + (isActive ? ' active' : '')}
              >
                <span className="nm-dot" style={{ background: STATUT_DOT[m.statut] || '#94A3B8' }}></span>
                <span className="nm-text">
                  <span className="nm-ref">{m.reference}</span>
                  <span className="nm-nom">{m.nom}</span>
                </span>
                {hasSession && <span className="nm-session" title="Session de notation active">✏</span>}
              </NavLink>
            );
          })}
        </div>
      </div>

      <div className="main">
        <div className="topbar">
          <span className="topbar-title">{title || 'Gestion des marchés'}</span>
          {sub && <span className="topbar-sub">{sub}</span>}
          <div className="spacer" />
          {actions}
        </div>
        <div className="content fade-in">
          {children}
        </div>
      </div>
    </div>
  );
}
