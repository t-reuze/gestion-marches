import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { marches, formations } from '../data/mockData';
import { useMarcheMeta } from '../context/MarcheMetaContext';

const MODULES = [
  {
    label: 'Marchés',
    desc: 'Appels d\'offres, notation fournisseurs, analyse et suivi',
    href: '/marches',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="20" height="18" rx="2"/><line x1="8" y1="21" x2="8" y2="3"/><line x1="2" y1="9" x2="22" y2="9"/>
      </svg>
    ),
  },
  {
    label: 'Formations',
    desc: 'Formations scientifiques, inscriptions et renouvellements',
    href: '/formations',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 10l10-5 10 5-10 5-10-5z"/><path d="M6 12v5c0 2 3 4 6 4s6-2 6-4v-5"/>
      </svg>
    ),
  },
  {
    label: 'Reporting',
    desc: 'Tableaux de bord, suivi CA et maintenance',
    href: '/reporting',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="1,16 6,10 11,13 18,4 23,10"/><line x1="1" y1="20" x2="23" y2="20"/>
      </svg>
    ),
  },
  {
    label: 'Contacts',
    desc: 'Annuaire des 19 CLCC et fournisseurs',
    href: '/contacts',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="9" cy="7" r="3"/><path d="M2 21c0-4 3-7 7-7s7 3 7 7"/>
        <circle cx="18" cy="8" r="2.5"/><path d="M18 13c2.5 0 4.5 2 4.5 4.5"/>
      </svg>
    ),
  },
  {
    label: 'Calendrier',
    desc: 'Planning des échéances et deadlines',
    href: '/calendrier',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/>
        <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
      </svg>
    ),
  },
];

export default function Accueil() {
  const navigate = useNavigate();
  const { getMeta } = useMarcheMeta();
  const [hovered, setHovered] = useState(null);

  const total = marches.length;
  const actifs = marches.filter(m => (getMeta(m.id).statut || m.statut) !== 'cloture').length;

  const STATS = [
    { value: total, label: 'Marchés' },
    { value: actifs, label: 'Actifs' },
    { value: formations.length, label: 'Formations' },
    { value: 19, label: 'CLCC' },
    { value: '917+', label: 'Contacts' },
  ];

  return (
    <div style={{
      minHeight: '100vh', color: '#fff', overflow: 'hidden',
      background: 'linear-gradient(165deg, #0A0E17 0%, #111827 40%, #0F172A 100%)',
      fontFamily: "'Inter', system-ui, sans-serif",
    }}>

      {/* ── Top bar ──────────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '24px 48px 0',
      }}>
        <img src="/unicancer-logo.svg" alt="" style={{ height: 26, filter: 'brightness(0) invert(1)', opacity: .5 }} />
      </div>

      {/* ── Hero ─────────────────────────────────────────── */}
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        padding: '100px 32px 48px', position: 'relative',
      }}>
        {/* Glow orange */}
        <div style={{
          position: 'absolute', top: '0', left: '50%', transform: 'translateX(-50%)',
          width: 700, height: 500, borderRadius: '50%',
          background: 'radial-gradient(ellipse, rgba(232,80,26,.06) 0%, transparent 65%)',
          pointerEvents: 'none',
        }} />

        {/* PRISM */}
        <h1 style={{
          fontSize: 96, fontWeight: 800, letterSpacing: '-.05em', lineHeight: .9,
          textAlign: 'center', marginBottom: 16,
          background: 'linear-gradient(180deg, #FFFFFF 20%, rgba(255,255,255,.35) 100%)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          position: 'relative', zIndex: 1,
        }}>
          PRISM
        </h1>

        {/* Sous-titre */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24,
        }}>
          <div style={{ height: 1, width: 32, background: 'rgba(232,80,26,.4)' }} />
          <span style={{
            fontSize: 13, fontWeight: 600, color: '#E8501A',
            letterSpacing: '.12em', textTransform: 'uppercase',
          }}>
            Gestion des projets
          </span>
          <div style={{ height: 1, width: 32, background: 'rgba(232,80,26,.4)' }} />
        </div>

        {/* Signification */}
        <p style={{
          fontSize: 12, color: 'rgba(255,255,255,.25)', letterSpacing: '.03em',
          textAlign: 'center', marginBottom: 32,
        }}>
          {'Plateforme de R\u00e9f\u00e9rencement et d\u2019Intelligence des Services et March\u00e9s'}
        </p>

        {/* Description */}
        <p style={{
          fontSize: 17, color: 'rgba(255,255,255,.4)', lineHeight: 1.7,
          textAlign: 'center', maxWidth: 500, marginBottom: 40,
        }}>
          {'Centralisez le pilotage de vos march\u00e9s publics, contacts et formations au service des centrales d\u2019achat UNICANCER.'}
        </p>

        {/* CTA */}
        <button
          onClick={() => navigate('/marches')}
          style={{
            padding: '14px 44px', borderRadius: 8,
            background: '#E8501A', border: '1px solid rgba(255,255,255,.1)',
            color: '#fff', fontSize: 14, fontWeight: 600,
            cursor: 'pointer', transition: 'all .2s',
            boxShadow: '0 0 40px rgba(232,80,26,.2)',
            position: 'relative', zIndex: 1,
            letterSpacing: '.01em',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 0 60px rgba(232,80,26,.35)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.transform = '';
            e.currentTarget.style.boxShadow = '0 0 40px rgba(232,80,26,.2)';
          }}
        >
          {'Acc\u00e9der \u00e0 PRISM \u2192'}
        </button>
      </div>

      {/* ── Stats ────────────────────────────────────────── */}
      <div style={{
        display: 'flex', justifyContent: 'center', gap: 48,
        padding: '48px 32px 56px',
      }}>
        {STATS.map((s, i) => (
          <div key={i} style={{ textAlign: 'center' }}>
            <div style={{
              fontSize: 32, fontWeight: 700, color: '#fff',
              lineHeight: 1, marginBottom: 6, letterSpacing: '-.02em',
            }}>{s.value}</div>
            <div style={{
              fontSize: 11, color: 'rgba(255,255,255,.25)',
              fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.08em',
            }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* ── Modules ──────────────────────────────────────── */}
      <div style={{
        maxWidth: 880, margin: '0 auto', padding: '0 48px 80px',
      }}>
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12,
        }}>
          {MODULES.map((m, i) => {
            const isHovered = hovered === i;
            return (
              <div
                key={m.href}
                onClick={() => navigate(m.href)}
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
                style={{
                  padding: '28px 16px 24px', cursor: 'pointer',
                  borderRadius: 12, textAlign: 'center',
                  background: isHovered ? 'rgba(232,80,26,.08)' : 'rgba(255,255,255,.02)',
                  border: '1px solid ' + (isHovered ? 'rgba(232,80,26,.25)' : 'rgba(255,255,255,.06)'),
                  transition: 'all .25s cubic-bezier(.22,1,.36,1)',
                  transform: isHovered ? 'translateY(-4px)' : '',
                }}
              >
                <div style={{
                  color: isHovered ? '#E8501A' : 'rgba(255,255,255,.4)',
                  marginBottom: 14, transition: 'color .25s',
                  display: 'flex', justifyContent: 'center',
                }}>
                  {m.icon}
                </div>
                <div style={{
                  fontSize: 14, fontWeight: 600,
                  color: isHovered ? '#fff' : 'rgba(255,255,255,.7)',
                  marginBottom: 6, transition: 'color .25s',
                }}>
                  {m.label}
                </div>
                <div style={{
                  fontSize: 11, color: 'rgba(255,255,255,.25)', lineHeight: 1.5,
                }}>
                  {m.desc}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Footer ───────────────────────────────────────── */}
      <div style={{
        padding: '20px 48px',
        borderTop: '1px solid rgba(255,255,255,.04)',
        textAlign: 'center',
      }}>
        <span style={{ fontSize: 10, color: 'rgba(255,255,255,.12)', letterSpacing: '.04em' }}>
          {'PRISM \u00b7 UNICANCER \u00b7 2026'}
        </span>
      </div>
    </div>
  );
}
