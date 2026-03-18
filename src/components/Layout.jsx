import { NavLink, useParams } from 'react-router-dom';
import { marches } from '../data/mockData';
import { useNotation } from '../context/NotationContext';
import { useMarcheMeta } from '../context/MarcheMetaContext';

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
      <div className="sidebar">
        <div className="sidebar-logo">
          <div className="app-name">&#x2695; Unicancer</div>
          <div className="app-sub">Gestion des marchés</div>
        </div>

        <div className="sidebar-section">
          <div className="sidebar-section-label">Navigation</div>
          <NavLink to="/" end className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')}>
            <span className="ni">&#x1F4CA;</span>Tableau de bord
          </NavLink>
          <NavLink to="/reporting" className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')}>
            <span className="ni">&#x1F4C8;</span>Reporting global
          </NavLink>
          <NavLink to="/formations" className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')}>
            <span className="ni">&#x1F4DA;</span>Formations
          </NavLink>
        </div>

        <div className="sidebar-section">
          <div className="sidebar-section-label">Outils</div>
          <NavLink to="/analyse-unicancer" className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')}>
            <span className="ni">&#x1F4CB;</span>AO Recrutement 2026
          </NavLink>
        </div>

        <div className="sidebar-section">
          <div className="sidebar-section-label">Marchés</div>
          {marches.map(m => {
            const meta    = getMeta(m.id);
            const statut  = meta.statut || m.statut;
            const hasSession = !!getSession(m.id);
            const isActive = activeId === m.id;
            return (
              <NavLink
                key={m.id}
                to={'/marche/' + m.id + '/notation'}
                className={() => 'nav-item nav-marche-item' + (isActive ? ' active' : '')}
              >
                <span className="nm-dot" style={{ background: STATUT_DOT[statut] || '#94A3B8' }}></span>
                <span className="nm-nom">{m.nom}</span>
                {hasSession && <span className="nm-session" title="Session de notation active">&#x270F;</span>}
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
