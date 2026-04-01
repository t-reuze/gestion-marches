import { NavLink } from 'react-router-dom';

const IconMarches = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <rect x="1.5" y="1.5" width="5" height="5" rx="1"/>
    <rect x="9.5" y="1.5" width="5" height="5" rx="1"/>
    <rect x="1.5" y="9.5" width="5" height="5" rx="1"/>
    <rect x="9.5" y="9.5" width="5" height="5" rx="1"/>
  </svg>
);
const IconFormations = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 13V3a1 1 0 0 1 1-1h4.5a2 2 0 0 1 2 2v9"/>
    <path d="M9.5 4a2 2 0 0 1 2-2H14a1 1 0 0 1 1 1v10"/>
    <line x1="2" y1="13" x2="15" y2="13"/>
  </svg>
);
const IconReporting = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="1,12 5,7 9,9 15,2"/>
    <line x1="1" y1="14.5" x2="15" y2="14.5"/>
  </svg>
);
const IconContacts = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="8" cy="5" r="3"/>
    <path d="M2.5 14a5.5 5.5 0 0 1 11 0"/>
  </svg>
);

const NAV_ITEMS = [
  { to: '/',            label: 'Marchés',     icon: IconMarches,    end: true },
  { to: '/formations',  label: 'Formations',  icon: IconFormations, end: false },
  { to: '/reporting',   label: 'Reporting',   icon: IconReporting,  end: false },
  { to: '/contacts',    label: 'Contacts',    icon: IconContacts,   end: false },
];

export default function Navbar() {
  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <svg width="22" height="22" viewBox="0 0 26 26" fill="none">
          <path
            d="M4 3 L4 21 Q4 23 6 23 L18 23 Q20 23 20 21 L20 14"
            stroke="#E8501A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
          />
          <line x1="4" y1="3" x2="12" y2="3" stroke="#E8501A" strokeWidth="2.5" strokeLinecap="round"/>
        </svg>
        <span className="navbar-brand-text">unicancer</span>
      </div>
      <div className="navbar-links">
        {NAV_ITEMS.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) => 'navbar-link' + (isActive ? ' active' : '')}
          >
            <item.icon />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
