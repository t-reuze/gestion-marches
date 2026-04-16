import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { marches, formations } from '../data/mockData';
import { useMarcheMeta } from '../context/MarcheMetaContext';

const LINKS = [
  { label: 'Marchés', href: '/marches' },
  { label: 'Formations', href: '/formations' },
  { label: 'Contacts', href: '/contacts' },
  { label: 'Calendrier', href: '/calendrier' },
];

const FEATURES = [
  {
    title: 'Marchés publics',
    desc: 'Pilotez vos appels d\'offres de bout en bout — notation des fournisseurs, analyse comparative et suivi des attributions.',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="20" height="18" rx="2"/><line x1="8" y1="21" x2="8" y2="3"/><line x1="2" y1="9" x2="22" y2="9"/>
      </svg>
    ),
  },
  {
    title: 'Annuaire CLCC',
    desc: 'Gérez les contacts des 19 centres de lutte contre le cancer — par fonction, avec mailing groupé intégré.',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="9" cy="7" r="3"/><path d="M2 21c0-4 3-7 7-7s7 3 7 7"/>
        <circle cx="18" cy="8" r="2.5"/><path d="M18 13c2.5 0 4.5 2 4.5 4.5"/>
      </svg>
    ),
  },
  {
    title: 'Formations',
    desc: 'Suivez les renouvellements, inscriptions et modèles économiques de vos formations scientifiques.',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 10l10-5 10 5-10 5-10-5z"/><path d="M6 12v5c0 2 3 4 6 4s6-2 6-4v-5"/>
      </svg>
    ),
  },
  {
    title: 'Calendrier',
    desc: 'Visualisez toutes les échéances — dépôts, attributions, renouvellements — sur une timeline interactive.',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/>
        <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
      </svg>
    ),
  },
];

function useCountUp(target, duration = 1200) {
  const [val, setVal] = useState(0);
  const ref = useRef(null);
  useEffect(() => {
    const num = typeof target === 'number' ? target : parseInt(target) || 0;
    if (!num) { setVal(target); return; }
    let start = 0;
    const step = Math.ceil(num / (duration / 16));
    const id = setInterval(() => {
      start += step;
      if (start >= num) { setVal(num); clearInterval(id); }
      else setVal(start);
    }, 16);
    return () => clearInterval(id);
  }, [target]);
  return val;
}

function AnimatedStat({ value, label }) {
  const v = useCountUp(value);
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{
        fontSize: 40, fontWeight: 700, color: '#fff',
        lineHeight: 1, marginBottom: 6, letterSpacing: '-.03em',
        fontVariantNumeric: 'tabular-nums',
      }}>{v}</div>
      <div style={{
        fontSize: 11, color: 'rgba(255,255,255,.3)',
        fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.08em',
      }}>{label}</div>
    </div>
  );
}

export default function Accueil() {
  const navigate = useNavigate();
  const { getMeta } = useMarcheMeta();
  const [visible, setVisible] = useState(false);
  const [hoveredFeature, setHoveredFeature] = useState(null);

  useEffect(() => { requestAnimationFrame(() => setVisible(true)); }, []);

  const total = marches.length;
  const actifs = marches.filter(m => (getMeta(m.id).statut || m.statut) !== 'cloture').length;

  return (
    <div style={{
      minHeight: '100vh', color: '#fff', overflow: 'hidden',
      background: '#09090B',
      fontFamily: "'Inter', system-ui, sans-serif",
    }}>

      {/* ── Noise overlay ─────────────────────────────────── */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
        opacity: .03,
        backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'.65\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")',
      }} />

      {/* ── Nav ───────────────────────────────────────────── */}
      <nav style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 48px', height: 64, position: 'relative', zIndex: 10,
        borderBottom: '1px solid rgba(255,255,255,.06)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <img src="/unicancer-logo.svg" alt="" style={{ height: 24, filter: 'brightness(0) invert(1)', opacity: .5 }} />
          <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,.1)' }} />
          <div style={{ display: 'flex', gap: 4 }}>
            {LINKS.map(l => (
              <span key={l.href}
                onClick={() => navigate(l.href)}
                style={{
                  padding: '6px 14px', fontSize: 13, fontWeight: 500,
                  color: 'rgba(255,255,255,.5)', cursor: 'pointer',
                  borderRadius: 6, transition: 'all .15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.background = 'rgba(255,255,255,.06)'; }}
                onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,.5)'; e.currentTarget.style.background = 'transparent'; }}
              >{l.label}</span>
            ))}
          </div>
        </div>
        <button
          onClick={() => navigate('/marches')}
          style={{
            padding: '8px 20px', borderRadius: 6,
            background: '#E8501A', border: 'none', color: '#fff',
            fontSize: 13, fontWeight: 600, cursor: 'pointer',
            transition: 'opacity .15s',
          }}
          onMouseEnter={e => e.currentTarget.style.opacity = '.85'}
          onMouseLeave={e => e.currentTarget.style.opacity = '1'}
        >
          {'Acc\u00e9der \u00e0 PRISM'}
        </button>
      </nav>

      {/* ── Hero ──────────────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '120px 48px 80px', position: 'relative',
        maxWidth: 1100, margin: '0 auto',
      }}>
        {/* Glow */}
        <div style={{
          position: 'absolute', top: '10%', left: '40%',
          width: 600, height: 400, borderRadius: '50%',
          background: 'radial-gradient(ellipse, rgba(232,80,26,.07) 0%, transparent 70%)',
          pointerEvents: 'none', filter: 'blur(40px)',
        }} />

        <div style={{
          flex: 1, maxWidth: 540,
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateY(0)' : 'translateY(20px)',
          transition: 'all .8s cubic-bezier(.22,1,.36,1)',
        }}>
          {/* Badge */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '5px 14px', borderRadius: 20, marginBottom: 28,
            border: '1px solid rgba(232,80,26,.2)',
            background: 'rgba(232,80,26,.06)',
          }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#E8501A' }} />
            <span style={{ fontSize: 12, fontWeight: 500, color: '#E8501A' }}>
              {'Plateforme de r\u00e9f\u00e9rencement'}
            </span>
          </div>

          {/* Title */}
          <h1 style={{
            fontSize: 64, fontWeight: 700, letterSpacing: '-.04em', lineHeight: 1.05,
            marginBottom: 20,
            background: 'linear-gradient(180deg, #FFFFFF 30%, rgba(255,255,255,.5) 100%)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>
            PRISM
          </h1>

          <p style={{
            fontSize: 13, fontWeight: 600, color: '#E8501A',
            letterSpacing: '.1em', textTransform: 'uppercase',
            marginBottom: 20,
          }}>
            Gestion des projets
          </p>

          <p style={{
            fontSize: 17, color: 'rgba(255,255,255,.45)', lineHeight: 1.7,
            marginBottom: 36,
          }}>
            {'Centralisez le pilotage de vos march\u00e9s publics, contacts CLCC et formations scientifiques \u2014 au service des centrales d\u2019achat UNICANCER.'}
          </p>

          {/* CTAs */}
          <div style={{ display: 'flex', gap: 12 }}>
            <button
              onClick={() => navigate('/marches')}
              style={{
                padding: '12px 28px', borderRadius: 8,
                background: '#E8501A', border: 'none', color: '#fff',
                fontSize: 14, fontWeight: 600, cursor: 'pointer',
                transition: 'all .2s',
                boxShadow: '0 0 32px rgba(232,80,26,.2)',
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 0 48px rgba(232,80,26,.3)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 0 32px rgba(232,80,26,.2)'; }}
            >
              {'Acc\u00e9der \u00e0 PRISM \u2192'}
            </button>
            <button
              onClick={() => navigate('/contacts')}
              style={{
                padding: '12px 28px', borderRadius: 8,
                background: 'transparent', border: '1px solid rgba(255,255,255,.12)',
                color: 'rgba(255,255,255,.6)', fontSize: 14, fontWeight: 500,
                cursor: 'pointer', transition: 'all .2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,.25)'; e.currentTarget.style.color = '#fff'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,.12)'; e.currentTarget.style.color = 'rgba(255,255,255,.6)'; }}
            >
              Annuaire CLCC
            </button>
          </div>
        </div>

        {/* Right side — Stats */}
        <div style={{
          flex: 0, display: 'flex', flexDirection: 'column', gap: 32, marginLeft: 80,
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateY(0)' : 'translateY(30px)',
          transition: 'all .8s .2s cubic-bezier(.22,1,.36,1)',
        }}>
          <AnimatedStat value={total} label={'March\u00e9s'} />
          <AnimatedStat value={actifs} label="Actifs" />
          <AnimatedStat value={formations.length} label="Formations" />
          <AnimatedStat value={917} label="Contacts" />
        </div>
      </div>

      {/* ── Divider ───────────────────────────────────────── */}
      <div style={{
        width: 80, height: 1, margin: '0 auto 80px',
        background: 'linear-gradient(90deg, transparent, rgba(255,255,255,.12), transparent)',
      }} />

      {/* ── Features ──────────────────────────────────────── */}
      <div style={{
        maxWidth: 900, margin: '0 auto', padding: '0 48px 100px',
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(20px)',
        transition: 'all .8s .4s cubic-bezier(.22,1,.36,1)',
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {FEATURES.map((f, i) => {
            const isH = hoveredFeature === i;
            return (
              <div
                key={i}
                onMouseEnter={() => setHoveredFeature(i)}
                onMouseLeave={() => setHoveredFeature(null)}
                onClick={() => navigate(i === 0 ? '/marches' : i === 1 ? '/contacts' : i === 2 ? '/formations' : '/calendrier')}
                style={{
                  padding: '28px 28px 24px', borderRadius: 12, cursor: 'pointer',
                  background: isH ? 'rgba(255,255,255,.03)' : 'transparent',
                  border: '1px solid ' + (isH ? 'rgba(255,255,255,.1)' : 'rgba(255,255,255,.04)'),
                  transition: 'all .25s cubic-bezier(.22,1,.36,1)',
                  transform: isH ? 'translateY(-2px)' : '',
                }}
              >
                <div style={{
                  width: 40, height: 40, borderRadius: 10,
                  background: isH ? 'rgba(232,80,26,.1)' : 'rgba(255,255,255,.04)',
                  border: '1px solid ' + (isH ? 'rgba(232,80,26,.2)' : 'rgba(255,255,255,.06)'),
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: isH ? '#E8501A' : 'rgba(255,255,255,.4)',
                  transition: 'all .25s', marginBottom: 16,
                }}>
                  {f.icon}
                </div>
                <div style={{
                  fontSize: 15, fontWeight: 600, color: isH ? '#fff' : 'rgba(255,255,255,.8)',
                  marginBottom: 8, transition: 'color .2s',
                }}>{f.title}</div>
                <div style={{
                  fontSize: 13, color: 'rgba(255,255,255,.35)', lineHeight: 1.6,
                }}>{f.desc}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Footer ────────────────────────────────────────── */}
      <div style={{
        padding: '20px 48px',
        borderTop: '1px solid rgba(255,255,255,.04)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <span style={{ fontSize: 10, color: 'rgba(255,255,255,.12)' }}>
          {'PRISM \u00b7 UNICANCER \u00b7 2026'}
        </span>
        <span style={{ fontSize: 10, color: 'rgba(255,255,255,.08)' }}>
          {'Plateforme de R\u00e9f\u00e9rencement et d\u2019Intelligence des Services et March\u00e9s'}
        </span>
      </div>
    </div>
  );
}
