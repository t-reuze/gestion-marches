import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { marches, formations } from '../data/mockData';
import { useMarcheMeta } from '../context/MarcheMetaContext';

function CountUp({ target, duration = 1000 }) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    const num = typeof target === 'number' ? target : parseInt(target) || 0;
    if (!num) return;
    let start = 0;
    const step = Math.max(1, Math.ceil(num / (duration / 16)));
    const id = setInterval(() => {
      start += step;
      if (start >= num) { setVal(num); clearInterval(id); }
      else setVal(start);
    }, 16);
    return () => clearInterval(id);
  }, [target]);
  return val;
}

const MODULES = [
  { label: 'Marchés', href: '/marches' },
  { label: 'Formations', href: '/formations' },
  { label: 'Reporting', href: '/reporting' },
  { label: 'Contacts', href: '/contacts' },
  { label: 'Calendrier', href: '/calendrier' },
];

export default function Accueil() {
  const navigate = useNavigate();
  const { getMeta } = useMarcheMeta();
  const [visible, setVisible] = useState(false);
  const [hovered, setHovered] = useState(null);

  useEffect(() => { requestAnimationFrame(() => setVisible(true)); }, []);

  const total = marches.length;
  const actifs = marches.filter(m => (getMeta(m.id).statut || m.statut) !== 'cloture').length;

  const STATS = [
    { value: total, label: 'Marchés', color: '#E8501A' },
    { value: actifs, label: 'Actifs', color: '#16A34A' },
    { value: formations.length, label: 'Formations', color: '#2D5F8A' },
    { value: 917, label: 'Contacts', color: '#D97706' },
  ];

  return (
    <div style={{
      height: '100vh', overflow: 'hidden',
      background: '#FFFFFF',
      fontFamily: "'Inter', system-ui, sans-serif",
      display: 'flex', flexDirection: 'column',
    }}>

      {/* ── Nav ───────────────────────────────────────────── */}
      <nav style={{
        display: 'flex', alignItems: 'center',
        padding: '0 48px', height: 56, flexShrink: 0,
        borderBottom: '1px solid rgba(15,23,42,.06)',
      }}>
        <img src="/unicancer-logo.svg" alt="Unicancer" style={{ height: 26 }} />
      </nav>

      {/* ── Content — 2 colonnes ──────────────────────────── */}
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center',
        padding: '0 80px', gap: 80, maxWidth: 1280, margin: '0 auto', width: '100%',
        opacity: visible ? 1 : 0,
        transform: visible ? 'none' : 'translateY(12px)',
        transition: 'all .6s cubic-bezier(.22,1,.36,1)',
      }}>

        {/* ── Gauche : texte ──────────────────────────────── */}
        <div style={{ flex: 1 }}>
          <h1 style={{
            fontSize: 72, fontWeight: 800, letterSpacing: '-.05em', lineHeight: .9,
            marginBottom: 12,
            background: 'linear-gradient(135deg, #C2410C 0%, #E8501A 40%, #FF6B35 100%)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>
            PRISM
          </h1>

          <p style={{
            fontSize: 11, fontWeight: 500, color: '#94A3B8',
            letterSpacing: '.06em', marginBottom: 8,
          }}>
            {'Plateforme de R\u00e9f\u00e9rencement et d\u2019Intelligence des Services et March\u00e9s'}
          </p>

          <p style={{
            fontSize: 22, fontWeight: 600, color: '#0F172A',
            marginBottom: 12, letterSpacing: '-.01em',
          }}>
            Gestion des projets
          </p>

          <p style={{
            fontSize: 15, color: '#64748B', lineHeight: 1.7,
            marginBottom: 32, maxWidth: 420,
          }}>
            {'Centralisez le pilotage de vos march\u00e9s publics, contacts et formations scientifiques \u2014 au service des centrales d\u2019achat UNICANCER.'}
          </p>

          <button
            onClick={() => navigate('/marches')}
            style={{
              padding: '12px 32px', borderRadius: 8,
              background: '#E8501A', border: 'none', color: '#fff',
              fontSize: 14, fontWeight: 600, cursor: 'pointer',
              transition: 'all .2s', marginBottom: 40,
              boxShadow: '0 2px 12px rgba(232,80,26,.18)',
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(232,80,26,.25)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 2px 12px rgba(232,80,26,.18)'; }}
          >
            {'Acc\u00e9der \u00e0 PRISM'}
          </button>

          {/* Stats */}
          <div style={{ display: 'flex', gap: 32 }}>
            {STATS.map((s, i) => (
              <div key={i}>
                <div style={{
                  fontSize: 28, fontWeight: 700, color: s.color,
                  lineHeight: 1, marginBottom: 4, fontVariantNumeric: 'tabular-nums',
                }}>
                  <CountUp target={s.value} />
                </div>
                <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 500 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Droite : modules ────────────────────────────── */}
        <div style={{
          width: 340, flexShrink: 0,
          display: 'flex', flexDirection: 'column', gap: 10,
          opacity: visible ? 1 : 0,
          transform: visible ? 'none' : 'translateY(20px)',
          transition: 'all .6s .15s cubic-bezier(.22,1,.36,1)',
        }}>
          <p style={{
            fontSize: 11, fontWeight: 600, color: '#94A3B8',
            letterSpacing: '.08em', textTransform: 'uppercase',
            marginBottom: 4,
          }}>
            Accès rapide
          </p>

          {MODULES.map((m, i) => {
            const isH = hovered === i;
            return (
              <div
                key={m.href}
                onClick={() => navigate(m.href)}
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
                style={{
                  padding: '16px 20px', borderRadius: 10, cursor: 'pointer',
                  background: isH ? '#FFF5F0' : '#FAFBFC',
                  border: '1px solid ' + (isH ? 'rgba(232,80,26,.2)' : 'rgba(15,23,42,.06)'),
                  transition: 'all .2s',
                  transform: isH ? 'translateX(4px)' : '',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}
              >
                <span style={{
                  fontSize: 15, fontWeight: 600,
                  color: isH ? '#E8501A' : '#334155',
                  transition: 'color .2s',
                }}>{m.label}</span>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none"
                  stroke={isH ? '#E8501A' : '#CBD5E1'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                  style={{ transition: 'stroke .2s' }}>
                  <polyline points="6,3 11,8 6,13" />
                </svg>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Footer ────────────────────────────────────────── */}
      <div style={{
        padding: '14px 48px', flexShrink: 0,
        borderTop: '1px solid rgba(15,23,42,.04)',
        display: 'flex', justifyContent: 'center',
      }}>
        <span style={{ fontSize: 10, color: '#CBD5E1' }}>
          {'PRISM \u00b7 UNICANCER \u00b7 2026'}
        </span>
      </div>
    </div>
  );
}
