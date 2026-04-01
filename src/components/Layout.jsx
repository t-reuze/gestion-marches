import { useParams, useLocation } from 'react-router-dom';
import Navbar from './shared/Navbar';
import Sidebar from './shared/Sidebar';
import Breadcrumb from './shared/Breadcrumb';

export default function Layout({ children, title, sub, actions }) {
  const { id } = useParams();
  const location = useLocation();

  const showSidebar = location.pathname === '/' || !!id;

  return (
    <div className="app-shell-v2">
      <Navbar />

      <div className="app-body">
        {showSidebar && <Sidebar />}

        <div className={'main' + (showSidebar ? '' : ' main-full')}>
          <Breadcrumb />

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
    </div>
  );
}
