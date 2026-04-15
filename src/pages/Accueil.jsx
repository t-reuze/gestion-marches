import { useNavigate } from 'react-router-dom';
import { marches, formations } from '../data/mockData';
import { useMarcheMeta } from '../context/MarcheMetaContext';

const SECTIONS = [
  {
    label: 'Marchés',
    sub: 'Appels d\'offres, notation, analyse',
    href: '/marches',
    color: '#E8501A',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="20" height="18" rx="2"/>
        <line x1="8" y1="21" x2="8" y2="3"/><line x1="2" y1="9" x2="22" y2="9"/>
      </svg>
    ),
  },
  {
    label: 'Formations',
    sub: 'Formations scientifiques, inscriptions',
    href: '/formations',
    color: '#16A34A',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 10l10-5 10 5-10 5-10-5z"/><path d="M6 12v5c0 2 3 4 6 4s6-2 6-4v-5"/>
      </svg>
    ),
  },
  {
    label: 'Reporting',
    sub: 'Tableaux de bord, suivi CA',
    href: '/reporting',
    color: '#2D5F8A',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="1,16 6,10 11,13 18,4 23,10"/>
        <line x1="1" y1="20" x2="23" y2="20"/>
      </svg>
    ),
  },
  {
    label: 'Contacts',
    sub: 'Annuaire des 19 CLCC',
    href: '/contacts',
    color: '#8B5CF6',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="9" cy="7" r="3"/><path d="M2 21c0-4 3-7 7-7s7 3 7 7"/>
        <circle cx="18" cy="8" r="2.5"/><path d="M18 13c2.5 0 4.5 2 4.5 4.5"/>
      </svg>
    ),
  },
  {
    label: 'Calendrier',
    sub: 'Planning des échéances',
    href: '/calendrier',
    color: '#D97706',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/>
        <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
      </svg>
    ),
  },
];

export default function Accueil() {
  const navigate = useNavigate();
  const { getMeta } = useMarcheMeta();

  const totalMarches = marches.length;
  const actifs = marches.filter(m => {
    const meta = getMeta(m.id);
    const statut = meta.statut || m.statut;
    return statut !== 'cloture';
  }).length;
  const totalFormations = formations.length;

  return (
    <div style={{
      minHeight: '100vh', background: '#F5F6FA',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
    }}>
      {/* Header bar */}
      <div style={{
        width: '100%', padding: '16px 32px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: '#FFFFFF', borderBottom: '1px solid rgba(15,23,42,.08)',
        boxShadow: '0 1px 3px rgba(0,0,0,.04)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <img src="/unicancer-logo.svg" alt="Unicancer" style={{ height: 36 }} />
          <span style={{ fontSize: 14, fontWeight: 600, color: '#1A1A2E' }}>UNICANCER</span>
        </div>
        <span style={{
          fontSize: 9, fontWeight: 600, letterSpacing: '.12em', textTransform: 'uppercase',
          color: '#64748B', padding: '3px 8px', border: '1px solid rgba(15,23,42,.1)', borderRadius: 20,
        }}>
          v2026
        </span>
      </div>

      {/* Hero */}
      <div style={{
        width: '100%', maxWidth: 900, padding: '64px 32px 48px', textAlign: 'center',
      }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 10,
          padding: '6px 16px', borderRadius: 20,
          background: '#FFF3EE', border: '1px solid #FECBB0',
          fontSize: 11, fontWeight: 600, color: '#E8501A',
          marginBottom: 20,
        }}>
          Plateforme de Référencement et d'Intelligence des Services et Marchés
        </div>

        <h1 style={{
          fontSize: 48, fontWeight: 700, color: '#1A1A2E',
          letterSpacing: '-.03em', lineHeight: 1.1, marginBottom: 16,
          fontFamily: "'IBM Plex Sans', system-ui, sans-serif",
        }}>
          <span style={{ color: '#E8501A' }}>PRISM</span>
        </h1>

        <p style={{
          fontSize: 17, color: '#64748B', lineHeight: 1.7,
          maxWidth: 560, margin: '0 auto 12px',
        }}>
          Pilotez vos marchés publics, suivez les formations, gérez vos contacts
          et anticipez les échéances — au service des centrales d'achat UNICANCER.
        </p>

        <div style={{
          display: 'flex', justifyContent: 'center', gap: 24, marginTop: 24,
          fontSize: 13, color: '#64748B',
        }}>
          <div>
            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 22, fontWeight: 700, color: '#E8501A' }}>
              {totalMarches}
            </span>
            <div style={{ fontSize: 11, marginTop: 2 }}>marchés suivis</div>
          </div>
          <div style={{ width: 1, background: 'rgba(15,23,42,.1)' }} />
          <div>
            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 22, fontWeight: 700, color: '#16A34A' }}>
              {actifs}
            </span>
            <div style={{ fontSize: 11, marginTop: 2 }}>marchés actifs</div>
          </div>
          <div style={{ width: 1, background: 'rgba(15,23,42,.1)' }} />
          <div>
            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 22, fontWeight: 700, color: '#2D5F8A' }}>
              {totalFormations}
            </span>
            <div style={{ fontSize: 11, marginTop: 2 }}>formations</div>
          </div>
          <div style={{ width: 1, background: 'rgba(15,23,42,.1)' }} />
          <div>
            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 22, fontWeight: 700, color: '#8B5CF6' }}>
              19
            </span>
            <div style={{ fontSize: 11, marginTop: 2 }}>CLCC</div>
          </div>
        </div>
      </div>

      {/* Section cards */}
      <div style={{
        width: '100%', maxWidth: 900, padding: '0 32px 64px',
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: 16,
      }}>
        {SECTIONS.map(s => (
          <div
            key={s.href}
            onClick={() => navigate(s.href)}
            style={{
              background: '#FFFFFF', borderRadius: 12,
              border: '1px solid rgba(15,23,42,.08)',
              borderLeft: '4px solid ' + s.color,
              padding: '24px 22px', cursor: 'pointer',
              transition: 'box-shadow .2s, transform .2s',
              boxShadow: '0 1px 3px rgba(0,0,0,.04)',
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,.08)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,.04)'; }}
          >
            <div style={{ color: s.color, marginBottom: 14 }}>{s.icon}</div>
            <div style={{ fontWeight: 700, fontSize: 16, color: '#1A1A2E', marginBottom: 4 }}>{s.label}</div>
            <div style={{ fontSize: 13, color: '#64748B', lineHeight: 1.5 }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div style={{
        width: '100%', padding: '20px 32px', textAlign: 'center',
        borderTop: '1px solid rgba(15,23,42,.06)',
        fontSize: 11, color: '#94A3B8',
      }}>
        PRISM — UNICANCER · 2026
      </div>
    </div>
  );
}
