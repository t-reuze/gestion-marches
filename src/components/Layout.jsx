import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Navbar     from './shared/Navbar';
import Sidebar    from './shared/Sidebar';
import Breadcrumb from './shared/Breadcrumb';

export default function Layout({ children, title, sub, actions }) {
  const { pathname } = useLocation();
  const hasSidebar = pathname === '/' || pathname.startsWith('/marche') || pathname.startsWith('/formations');

  const [sidebarOpen, setSidebarOpen] = useState(() => {
    const saved = localStorage.getItem('gm-sidebar-open');
    return saved !== null ? JSON.parse(saved) : true;
  });
  useEffect(() => { localStorage.setItem('gm-sidebar-open', JSON.stringify(sidebarOpen)); }, [sidebarOpen]);

  return (
    <div className="app-shell">
      <Navbar />
      <div className="app-body">
        {hasSidebar && (
          <div className={'sidebar-wrapper' + (sidebarOpen ? '' : ' sidebar-wrapper--collapsed')}>
            <Sidebar />
            <button
              className="sidebar-toggle"
              onClick={() => setSidebarOpen(o => !o)}
              title={sidebarOpen ? 'Réduire' : 'Ouvrir'}
            >
              <svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                style={{ transform: sidebarOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform .3s cubic-bezier(.22,1,.36,1)' }}>
                <polyline points="6,4 10,8 6,12"/>
              </svg>
            </button>
          </div>
        )}
        <div className="main">
          <header className="topbar">
            <div className="topbar-left">
              <h1 className="topbar-title">{title || 'Gestion des projets'}</h1>
            </div>
            <div className="topbar-right">
              {actions}
              <img src="/unicancer-pictos.png" alt="Unicancer" style={{ height: 36 }} />
            </div>
          </header>
          <Breadcrumb />
          <main className="content fade-in">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
