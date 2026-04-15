import { useNavigate } from 'react-router-dom';
import { marches, formations } from '../data/mockData';
import { useMarcheMeta } from '../context/MarcheMetaContext';

const SECTIONS = [
  {
    label: 'Marchés',
    sub: 'Appels d\'offres, notation et analyse des fournisseurs',
    href: '/marches',
    color: '#E8501A',
    gradient: 'linear-gradient(135deg, #E8501A 0%, #FF6B35 100%)',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="20" height="18" rx="2"/><line x1="8" y1="21" x2="8" y2="3"/><line x1="2" y1="9" x2="22" y2="9"/>
      </svg>
    ),
  },
  {
    label: 'Formations',
    sub: 'Formations scientifiques et inscriptions',
    href: '/formations',
    color: '#16A34A',
    gradient: 'linear-gradient(135deg, #16A34A 0%, #22C55E 100%)',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 10l10-5 10 5-10 5-10-5z"/><path d="M6 12v5c0 2 3 4 6 4s6-2 6-4v-5"/>
      </svg>
    ),
  },
  {
    label: 'Reporting',
    sub: 'Tableaux de bord et suivi CA',
    href: '/reporting',
    color: '#2D5F8A',
    gradient: 'linear-gradient(135deg, #2D5F8A 0%, #3B82F6 100%)',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="1,16 6,10 11,13 18,4 23,10"/><line x1="1" y1="20" x2="23" y2="20"/>
      </svg>
    ),
  },
  {
    label: 'Contacts',
    sub: 'Annuaire des 19 centres CLCC',
    href: '/contacts',
    color: '#8B5CF6',
    gradient: 'linear-gradient(135deg, #7C3AED 0%, #A78BFA 100%)',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="9" cy="7" r="3"/><path d="M2 21c0-4 3-7 7-7s7 3 7 7"/>
        <circle cx="18" cy="8" r="2.5"/><path d="M18 13c2.5 0 4.5 2 4.5 4.5"/>
      </svg>
    ),
  },
  {
    label: 'Calendrier',
    sub: 'Planning et échéances clés',
    href: '/calendrier',
    color: '#D97706',
    gradient: 'linear-gradient(135deg, #D97706 0%, #FBBF24 100%)',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
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
  const actifs = marches.filter(m => (getMeta(m.id).statut || m.statut) !== 'cloture').length;
  const totalFormations = formations.length;

  return (
    <div style={{ minHeight: '100vh', background: '#0F1B2D', display: 'flex', flexDirection: 'column' }}>

      {/* ── Navbar minimale ─────────────────────────────── */}
      <div style={{
        padding: '18px 40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <img src="/unicancer-logo.svg" alt="Unicancer" style={{ height: 32, filter: 'brightness(0) invert(1)', opacity: .7 }} />
        <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '.1em', color: 'rgba(255,255,255,.25)' }}>v2026</span>
      </div>

      {/* ── Hero ────────────────────────────────────────── */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: '0 32px 40px', position: 'relative',
      }}>
        {/* Gradient orbs */}
        <div style={{
          position: 'absolute', top: '10%', left: '15%', width: 400, height: 400, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(232,80,26,.12) 0%, transparent 70%)', pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', bottom: '5%', right: '10%', width: 350, height: 350, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(45,95,138,.15) 0%, transparent 70%)', pointerEvents: 'none',
        }} />

        {/* Badge */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '8px 20px', borderRadius: 24,
          background: 'rgba(232,80,26,.12)', border: '1px solid rgba(232,80,26,.2)',
          fontSize: 12, fontWeight: 500, color: '#FF8A5C', letterSpacing: '.01em',
          marginBottom: 28, backdropFilter: 'blur(8px)',
        }}>
          Plateforme de R&eacute;f&eacute;rencement et d'Intelligence des Services et March&eacute;s
        </div>

        {/* Title */}
        <h1 style={{
          fontSize: 72, fontWeight: 800, letterSpacing: '-.04em', lineHeight: 1,
          marginBottom: 20, textAlign: 'center',
          background: 'linear-gradient(135deg, #FFFFFF 0%, #E8501A 50%, #FF6B35 100%)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          fontFamily: "'IBM Plex Sans', system-ui, sans-serif",
        }}>
          PRISM
        </h1>

        {/* Subtitle */}
        <p style={{
          fontSize: 16, color: 'rgba(255,255,255,.5)', lineHeight: 1.7, textAlign: 'center',
          maxWidth: 520, marginBottom: 40,
        }}>
          Pilotez vos march&eacute;s publics, suivez les formations, g&eacute;rez vos contacts
          et anticipez les &eacute;ch&eacute;ances &mdash; au service des centrales d'achat UNICANCER.
        </p>

        {/* Stats */}
        <div style={{
          display: 'flex', gap: 0, marginBottom: 48,
          background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)',
          borderRadius: 16, overflow: 'hidden', backdropFilter: 'blur(12px)',
        }}>
          {[
            { value: totalMarches, label: 'march\u00e9s', color: '#E8501A' },
            { value: actifs, label: 'actifs', color: '#16A34A' },
            { value: totalFormations, label: 'formations', color: '#2D5F8A' },
            { value: 19, label: 'CLCC', color: '#8B5CF6' },
          ].map((s, i) => (
            <div key={i} style={{
              padding: '20px 32px', textAlign: 'center',
              borderRight: i < 3 ? '1px solid rgba(255,255,255,.06)' : 'none',
            }}>
              <div style={{
                fontFamily: "'IBM Plex Mono', monospace", fontSize: 28, fontWeight: 700, color: s.color,
                lineHeight: 1, marginBottom: 6,
              }}>{s.value}</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,.35)', fontWeight: 500 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Section cards */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)',
          gap: 14, width: '100%', maxWidth: 900,
        }}>
          {SECTIONS.map(s => (
            <div
              key={s.href}
              onClick={() => navigate(s.href)}
              style={{
                background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)',
                borderRadius: 14, padding: '24px 18px', cursor: 'pointer',
                transition: 'all .25s cubic-bezier(.22,1,.36,1)',
                textAlign: 'center', backdropFilter: 'blur(8px)',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'rgba(255,255,255,.08)';
                e.currentTarget.style.borderColor = s.color + '40';
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = '0 12px 32px rgba(0,0,0,.2), 0 0 0 1px ' + s.color + '20';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'rgba(255,255,255,.04)';
                e.currentTarget.style.borderColor = 'rgba(255,255,255,.08)';
                e.currentTarget.style.transform = '';
                e.currentTarget.style.boxShadow = '';
              }}
            >
              <div style={{
                width: 44, height: 44, borderRadius: 12, background: s.gradient,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: 14, boxShadow: '0 4px 12px ' + s.color + '30',
              }}>
                {s.icon}
              </div>
              <div style={{ fontWeight: 600, fontSize: 14, color: '#FFFFFF', marginBottom: 4 }}>{s.label}</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,.4)', lineHeight: 1.5 }}>{s.sub}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Footer ──────────────────────────────────────── */}
      <div style={{
        padding: '20px 40px', textAlign: 'center',
        borderTop: '1px solid rgba(255,255,255,.05)',
        fontSize: 11, color: 'rgba(255,255,255,.2)',
      }}>
        PRISM &mdash; UNICANCER &middot; 2026
      </div>
    </div>
  );
}
