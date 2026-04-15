import { useNavigate } from 'react-router-dom';
import { marches, formations } from '../data/mockData';
import { useMarcheMeta } from '../context/MarcheMetaContext';

const NAV = [
  { label: 'Marchés', href: '/marches' },
  { label: 'Formations', href: '/formations' },
  { label: 'Reporting', href: '/reporting' },
  { label: 'Contacts', href: '/contacts' },
  { label: 'Calendrier', href: '/calendrier' },
];

export default function Accueil() {
  const navigate = useNavigate();
  const { getMeta } = useMarcheMeta();

  const total = marches.length;
  const actifs = marches.filter(m => (getMeta(m.id).statut || m.statut) !== 'cloture').length;

  return (
    <div style={{ minHeight: '100vh', background: '#0A0E17', color: '#fff', overflow: 'hidden' }}>

      {/* ── Navbar ──────────────────────────────────────── */}
      <nav style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '20px 48px', position: 'relative', zIndex: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <img src="/unicancer-logo.svg" alt="" style={{ height: 28, filter: 'brightness(0) invert(1)', opacity: .6 }} />
        </div>
        <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '.1em', color: 'rgba(255,255,255,.25)' }}>v2026</span>
      </nav>

      {/* ── Hero ────────────────────────────────────────── */}
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        padding: '80px 32px 60px', position: 'relative',
      }}>
        {/* Glow */}
        <div style={{
          position: 'absolute', top: '-20%', left: '50%', transform: 'translateX(-50%)',
          width: 800, height: 600, borderRadius: '50%',
          background: 'radial-gradient(ellipse, rgba(232,80,26,.08) 0%, transparent 60%)',
          pointerEvents: 'none',
        }} />

        <h1 style={{
          fontSize: 88, fontWeight: 800, letterSpacing: '-.05em', lineHeight: .95,
          textAlign: 'center', marginBottom: 0,
          background: 'linear-gradient(180deg, #FFFFFF 30%, rgba(255,255,255,.4) 100%)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          fontFamily: "'Inter', system-ui, sans-serif",
          position: 'relative', zIndex: 1,
        }}>
          PRISM
        </h1>

        <p style={{
          fontSize: 18, fontWeight: 500, color: '#E8501A', letterSpacing: '.08em',
          textTransform: 'uppercase', marginTop: 16, marginBottom: 12,
          textAlign: 'center',
        }}>
          Gestion des projets
        </p>

        <p style={{
          fontSize: 13, color: 'rgba(255,255,255,.3)', letterSpacing: '.04em',
          textAlign: 'center', marginBottom: 32,
        }}>
          {'Plateforme de R\u00e9f\u00e9rencement et d\u2019Intelligence des Services et March\u00e9s'}
        </p>

        <p style={{
          fontSize: 20, color: 'rgba(255,255,255,.45)', lineHeight: 1.6,
          textAlign: 'center', maxWidth: 580, marginBottom: 48,
          fontWeight: 400,
        }}>
          {'Pilotez vos march\u00e9s publics, centralisez vos contacts et anticipez chaque \u00e9ch\u00e9ance \u2014 la plateforme de r\u00e9f\u00e9rencement au service des centrales d\u2019achat UNICANCER.'}
        </p>

        {/* CTA */}
        <button
          onClick={() => navigate('/marches')}
          style={{
            padding: '14px 40px', borderRadius: 10,
            background: 'linear-gradient(135deg, #E8501A 0%, #FF6B35 100%)',
            border: 'none', color: '#fff', fontSize: 15, fontWeight: 600,
            cursor: 'pointer', transition: 'transform .2s, box-shadow .2s',
            boxShadow: '0 4px 24px rgba(232,80,26,.3)',
            position: 'relative', zIndex: 1,
          }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 32px rgba(232,80,26,.4)'; }}
          onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 4px 24px rgba(232,80,26,.3)'; }}
        >
          {'Commencer \u2192'}
        </button>
      </div>

      {/* ── Stats ───────────────────────────────────────── */}
      <div style={{
        display: 'flex', justifyContent: 'center', gap: 64, padding: '40px 32px 60px',
      }}>
        {[
          { value: total, label: 'Marchés suivis', color: '#E8501A' },
          { value: actifs, label: 'Marchés actifs', color: '#16A34A' },
          { value: formations.length, label: 'Formations', color: '#3B82F6' },
          { value: 19, label: 'Centres CLCC', color: '#A78BFA' },
          { value: 491, label: 'Contacts', color: '#FBBF24' },
        ].map((s, i) => (
          <div key={i} style={{ textAlign: 'center' }}>
            <div style={{
              fontFamily: "'Space Mono', monospace", fontSize: 36, fontWeight: 700,
              color: s.color, lineHeight: 1, marginBottom: 8,
            }}>{s.value}</div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,.3)', fontWeight: 500 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* ── Divider ─────────────────────────────────────── */}
      <div style={{
        width: 120, height: 1, margin: '0 auto 60px',
        background: 'linear-gradient(90deg, transparent, rgba(232,80,26,.3), transparent)',
      }} />

      {/* ── Sections ────────────────────────────────────── */}
      <div style={{ padding: '0 48px 80px', maxWidth: 1000, margin: '0 auto' }}>
        <p style={{
          fontSize: 13, fontWeight: 600, color: '#E8501A', textTransform: 'uppercase',
          letterSpacing: '.1em', marginBottom: 12, textAlign: 'center',
        }}>
          {'Acc\u00e8s rapide'}
        </p>
        <h2 style={{
          fontSize: 32, fontWeight: 700, color: '#fff', textAlign: 'center',
          letterSpacing: '-.02em', marginBottom: 48,
        }}>
          Tout votre pilotage en un seul endroit
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 1 }}>
          {NAV.map((item, i) => (
            <div
              key={item.href}
              onClick={() => navigate(item.href)}
              style={{
                padding: '32px 20px', cursor: 'pointer',
                borderTop: '1px solid rgba(255,255,255,.06)',
                transition: 'background .2s',
                textAlign: 'center',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,.03)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <div style={{ fontSize: 16, fontWeight: 600, color: '#fff', marginBottom: 6 }}>
                {item.label}
              </div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,.3)' }}>
                {'\u2192'}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Footer ──────────────────────────────────────── */}
      <div style={{
        padding: '24px 48px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        borderTop: '1px solid rgba(255,255,255,.04)',
      }}>
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,.15)' }}>
          {'PRISM \u2014 UNICANCER \u00b7 2026'}
        </span>
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,.15)' }}>
          {'Plateforme de R\u00e9f\u00e9rencement et d\u2019Intelligence des Services et March\u00e9s'}
        </span>
      </div>
    </div>
  );
}
