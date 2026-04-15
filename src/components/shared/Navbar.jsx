import { Link, useLocation } from 'react-router-dom';

/* ── Logo ───────────────────────────────────────────────────── */

const TABS = [
  {
    label: 'Marchés',
    href: '/',
    match: (p) => p === '/' || p.startsWith('/marche'),
  },
  {
    label: 'Formations',
    href: '/formations',
    match: (p) => p.startsWith('/formations'),
  },
  {
    label: 'Reporting',
    href: '/reporting',
    match: (p) => p === '/reporting',
  },
  {
    label: 'Contacts',
    href: '/contacts',
    match: (p) => p.startsWith('/contacts'),
  },
];

export default function Navbar() {
  const { pathname } = useLocation();

  return (
    <nav className="navbar">
      <div className="navbar-logo" style={{ cursor: 'default' }}>
        <img src="/unicancer-logo.svg" alt="Unicancer" className="navbar-logo-img" />
        <span className="navbar-tagline">Gestion des projets</span>
      </div>

      <div className="navbar-tabs">
        {TABS.map((tab) => (
          <Link
            key={tab.href}
            to={tab.href}
            className={'navbar-tab' + (tab.match(pathname) ? ' active' : '')}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      <div className="navbar-right">
        <span className="navbar-version">v2026</span>
      </div>
    </nav>
  );
}
