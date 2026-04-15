import { Link, useLocation } from 'react-router-dom';
import NotificationsBell from '../NotificationsBell';

const TABS = [
  {
    label: 'Marchés',
    href: '/marches',
    match: (p) => p === '/marches' || p.startsWith('/marche/'),
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
  {
    label: 'Calendrier',
    href: '/calendrier',
    match: (p) => p === '/calendrier',
  },
];

export default function Navbar() {
  const { pathname } = useLocation();

  // Don't show navbar on the landing page
  if (pathname === '/') return null;

  return (
    <nav className="navbar">
      <Link to="/" className="navbar-logo" title="Accueil PRISM">
        <img src="/unicancer-logo.svg" alt="Unicancer" className="navbar-logo-img" />
        <span className="navbar-tagline">PRISM</span>
      </Link>

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
        <NotificationsBell />
        <span className="navbar-version">v2026</span>
      </div>
    </nav>
  );
}
