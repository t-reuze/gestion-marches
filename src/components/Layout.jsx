import Navbar     from './shared/Navbar';
import Sidebar    from './shared/Sidebar';
import Breadcrumb from './shared/Breadcrumb';

export default function Layout({ children, title, sub, actions }) {
  return (
    <div className="app-shell">
      <Navbar />
      <div className="app-body">
        <Sidebar />
        <div className="main">
          <header className="topbar">
            <div className="topbar-left">
              <h1 className="topbar-title">{title || 'Gestion des projets'}</h1>
              {sub && <span className="topbar-sub">{sub}</span>}
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
