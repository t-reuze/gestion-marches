import { useState } from 'react';
import { NavLink, useParams } from 'react-router-dom';
import { marches, SECTEURS, STATUT_CONFIG } from '../../data/mockData';
import { useMarcheMeta } from '../../context/MarcheMetaContext';

const IconChevron = ({ open }) => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor"
    strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
    style={{ transform: open ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform .15s' }}>
    <polyline points="4,2 8,6 4,10"/>
  </svg>
);

const STATUT_DOT = {
  ouvert:      '#3B82F6',
  analyse:     '#F59E0B',
  attribution: '#8B5CF6',
  cloture:     '#10B981',
  reporting:   '#64748B',
};

export default function Sidebar() {
  const { id: activeId } = useParams();
  const { getMeta } = useMarcheMeta();
  const [search, setSearch] = useState('');
  const [openSecteurs, setOpenSecteurs] = useState(() => {
    const initial = {};
    Object.keys(SECTEURS).forEach(k => { initial[k] = true; });
    return initial;
  });

  const toggleSecteur = (key) => {
    setOpenSecteurs(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const filteredMarches = search.trim()
    ? marches.filter(m => m.nom.toLowerCase().includes(search.toLowerCase()) || m.reference.toLowerCase().includes(search.toLowerCase()))
    : marches;

  const marchesBySecteur = {};
  for (const key of Object.keys(SECTEURS)) {
    marchesBySecteur[key] = filteredMarches.filter(m => m.secteur === key);
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-search">
        <input
          type="text"
          placeholder="Rechercher un marché..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="sidebar-search-input"
        />
      </div>

      <nav className="sidebar-nav">
        {Object.entries(SECTEURS).map(([key, secteur]) => {
          const items = marchesBySecteur[key] || [];
          if (items.length === 0 && search.trim()) return null;
          const isOpen = openSecteurs[key];

          return (
            <div key={key} className="sidebar-secteur">
              <button
                className="sidebar-secteur-header"
                onClick={() => toggleSecteur(key)}
              >
                <IconChevron open={isOpen} />
                <span className="sidebar-secteur-icon">{secteur.icon}</span>
                <span className="sidebar-secteur-label">{secteur.label}</span>
                <span className="sidebar-secteur-count">{items.length}</span>
              </button>

              {isOpen && (
                <div className="sidebar-secteur-items">
                  {items.map(m => {
                    const meta = getMeta(m.id);
                    const statut = meta.statut || m.statut;
                    const isActive = activeId === m.id;
                    return (
                      <NavLink
                        key={m.id}
                        to={'/marche/' + m.id + '/analyse'}
                        className={() => 'sidebar-marche-item' + (isActive ? ' active' : '')}
                      >
                        <span className="sidebar-marche-dot" style={{ background: STATUT_DOT[statut] || '#94A3B8' }} />
                        <span className="sidebar-marche-nom">{m.nom}</span>
                      </NavLink>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-footer-text">UNICANCER · v2026</div>
      </div>
    </aside>
  );
}
