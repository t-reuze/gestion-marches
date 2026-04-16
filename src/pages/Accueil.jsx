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

  return (
    <div style={{
      height: '100vh', overflow: 'hidden',
      background: '#FFFFFF',
      fontFamily: "'Inter', system-ui, sans-serif",
      display: 'flex', flexDirection: 'column',
    }}>

      {/* ── Nav ───────────────────────────────────────────── */}
      <nav style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 40px', height: 56, flexShrink: 0,
        borderBottom: '1px solid rgba(15,23,42,.06)',
      }}>
        <img src="/unicancer-logo.svg" alt="Unicancer" style={{ height: 26 }} />
      </nav>

      {/* ── Main content — tout visible sans scroll ───────── */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        justifyContent: 'center', alignItems: 'center',
        padding: '0 48px',
        opacity: visible ? 1 : 0,
        transform: visible ? 'none' : 'translateY(12px)',
        transition: 'all .6s cubic-bezier(.22,1,.36,1)',
      }}>

        {/* PRISM title with gradient */}
        <h1 style={{
          fontSize: 80, fontWeight: 800, letterSpacing: '-.05em', lineHeight: .9,
          textAlign: 'center', marginBottom: 10,
          background: 'linear-gradient(135deg, #E8501A 0%, #FF6B35 100%)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
        }}>
          PRISM
        </h1>

        {/* Signification */}
        <p style={{
          fontSize: 11, fontWeight: 500, color: '#94A3B8',
          letterSpacing: '.06em', textAlign: 'center', marginBottom: 6,
        }}>
          {'Plateforme de R\u00e9f\u00e9rencement et d\u2019Intelligence des Services et March\u00e9s'}
        </p>

        {/* Sous-titre */}
        <p style={{
          fontSize: 18, fontWeight: 600, color: '#334155',
          textAlign: 'center', marginBottom: 8,
        }}>
          Gestion des projets
        </p>

        {/* Description */}
        <p style={{
          fontSize: 14, color: '#94A3B8', lineHeight: 1.6,
          textAlign: 'center', maxWidth: 440, marginBottom: 28,
        }}>
          {'Pilotage des march\u00e9s publics, contacts CLCC et formations \u2014 au service des centrales d\u2019achat UNICANCER.'}
        </p>

        {/* CTA */}
        <button
          onClick={() => navigate('/marches')}
          style={{
            padding: '11px 32px', borderRadius: 8,
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

        {/* Stats inline */}
        <div style={{
          display: 'flex', gap: 40, marginBottom: 40,
        }}>
          {[
            { value: total, label: 'Marchés', color: '#E8501A' },
            { value: actifs, label: 'Actifs', color: '#16A34A' },
            { value: formations.length, label: 'Formations', color: '#2D5F8A' },
            { value: 917, label: 'Contacts', color: '#D97706' },
          ].map((s, i) => (
            <div key={i} style={{ textAlign: 'center' }}>
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

        {/* Modules — horizontal, compact */}
        <div style={{ display: 'flex', gap: 10 }}>
          {MODULES.map((m, i) => {
            const isH = hovered === i;
            return (
              <div
                key={m.href}
                onClick={() => navigate(m.href)}
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
                style={{
                  padding: '14px 24px', borderRadius: 10, cursor: 'pointer',
                  background: isH ? '#FFF5F0' : '#FAFBFC',
                  border: '1px solid ' + (isH ? 'rgba(232,80,26,.2)' : 'rgba(15,23,42,.06)'),
                  transition: 'all .2s',
                  transform: isH ? 'translateY(-2px)' : '',
                  display: 'flex', alignItems: 'center', gap: 10,
                }}
              >
                <span style={{
                  fontSize: 13, fontWeight: 600,
                  color: isH ? '#E8501A' : '#334155',
                  transition: 'color .2s',
                }}>{m.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Footer ────────────────────────────────────────── */}
      <div style={{
        padding: '16px 40px', flexShrink: 0,
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
