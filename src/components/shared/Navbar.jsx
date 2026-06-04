import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import NotificationsBell from '../NotificationsBell';
import PlanDeCharge from '../PlanDeCharge';
import { useShortcuts } from '../../context/ShortcutsContext';

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
  {
    label: 'Matwin',
    href: '/matwin',
    match: (p) => p === '/matwin',
  },
];

export default function Navbar() {
  const { pathname } = useLocation();
  const ctx = useShortcuts();
  const [planOpen, setPlanOpen] = useState(false);

  // Don't show navbar on the landing page
  if (pathname === '/') return null;

  const shortcutLabel = (ctx?.shortcuts?.globalSearch || 'ctrl+k').replace('+', '+').toUpperCase();

  return (
    <nav className="navbar">
      <Link to="/" className="navbar-logo" title="Accueil PRISM">
        <img src="/unicancer-logo.svg" alt="Unicancer" className="navbar-logo-img" />
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
        {/* Bouton recherche globale */}
        <button
          onClick={() => ctx?.setSearchOpen(true)}
          title={'Recherche globale (' + shortcutLabel + ')'}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '5px 12px', borderRadius: 8,
            border: '1px solid #d1d5db',
            background: '#f3f4f6',
            color: '#6b7280',
            cursor: 'pointer', fontSize: 13, fontFamily: 'inherit',
            transition: 'all .15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = '#e5e7eb'; e.currentTarget.style.color = '#374151'; }}
          onMouseLeave={e => { e.currentTarget.style.background = '#f3f4f6'; e.currentTarget.style.color = '#6b7280'; }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <circle cx="11" cy="11" r="8"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          Rechercher
          <kbd style={{
            fontSize: 10, padding: '1px 5px', borderRadius: 3,
            background: '#e5e7eb', border: '1px solid #d1d5db',
            color: '#9ca3af', fontFamily: 'inherit', marginLeft: 4,
          }}>{shortcutLabel}</kbd>
        </button>
        {/* Plan de charge */}
        <button
          onClick={() => setPlanOpen(o => !o)}
          title="Plan de charge"
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 32, height: 32, borderRadius: '50%',
            background: planOpen ? '#eff6ff' : '#f3f4f6',
            color: planOpen ? '#1d4ed8' : '#6b7280',
            border: planOpen ? '1px solid #3b82f6' : '1px solid #e5e7eb',
            cursor: 'pointer', transition: 'all .15s',
          }}
          onMouseEnter={e => { if (!planOpen) { e.currentTarget.style.background = '#e5e7eb'; e.currentTarget.style.color = '#374151'; } }}
          onMouseLeave={e => { if (!planOpen) { e.currentTarget.style.background = '#f3f4f6'; e.currentTarget.style.color = '#6b7280'; } }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
          </svg>
        </button>
        {/* Profil / Réglages */}
        <Link
          to="/profil"
          title="Profil & Raccourcis"
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 32, height: 32, borderRadius: '50%',
            background: '#f3f4f6', color: '#6b7280',
            border: '1px solid #e5e7eb', cursor: 'pointer', textDecoration: 'none',
            transition: 'all .15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = '#e5e7eb'; e.currentTarget.style.color = '#374151'; }}
          onMouseLeave={e => { e.currentTarget.style.background = '#f3f4f6'; e.currentTarget.style.color = '#6b7280'; }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
            <circle cx="12" cy="7" r="4"/>
          </svg>
        </Link>
        <NotificationsBell />
        <span className="navbar-version">v2026</span>
      </div>
      <PlanDeCharge open={planOpen} onClose={() => setPlanOpen(false)} />
      {planOpen && <div onClick={() => setPlanOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 999, background: 'rgba(0,0,0,.15)' }} />}
    </nav>
  );
}
