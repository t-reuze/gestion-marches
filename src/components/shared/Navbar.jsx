import { Link, useLocation } from 'react-router-dom';

/* ── Logo ───────────────────────────────────────────────────── */
const LogoMark = () => (
  <svg width="24" height="24" viewBox="0 0 26 26" fill="none">
    <path
      d="M4 3 L4 21 Q4 23 6 23 L18 23 Q20 23 20 21 L20 14"
      stroke="#E8501A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
    />
    <line x1="4" y1="3" x2="12" y2="3" stroke="#E8501A" strokeWidth="2.5" strokeLinecap="round"/>
  </svg>
);

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
      <div className="navbar-logo">
        <LogoMark />
        <div className="navbar-logo-text">
          <span className="navbar-brand">unicancer</span>
          <span className="navbar-tagline">Gestion des marchés</span>
        </div>
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
