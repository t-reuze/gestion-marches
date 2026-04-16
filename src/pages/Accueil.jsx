import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { marches, formations } from '../data/mockData';
import { useMarcheMeta } from '../context/MarcheMetaContext';

const FEATURES = [
  {
    title: 'Marchés publics',
    desc: 'Pilotez vos appels d\'offres, notez les fournisseurs et suivez chaque attribution.',
    href: '/marches',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="20" height="18" rx="2"/><line x1="8" y1="21" x2="8" y2="3"/><line x1="2" y1="9" x2="22" y2="9"/>
      </svg>
    ),
  },
  {
    title: 'Annuaire CLCC',
    desc: '917 contacts dans 19 centres — recherche par fonction, mailing groupé intégré.',
    href: '/contacts',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="9" cy="7" r="3"/><path d="M2 21c0-4 3-7 7-7s7 3 7 7"/>
        <circle cx="18" cy="8" r="2.5"/><path d="M18 13c2.5 0 4.5 2 4.5 4.5"/>
      </svg>
    ),
  },
  {
    title: 'Formations',
    desc: 'Renouvellements, inscriptions et modèles économiques de vos formations.',
    href: '/formations',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 10l10-5 10 5-10 5-10-5z"/><path d="M6 12v5c0 2 3 4 6 4s6-2 6-4v-5"/>
      </svg>
    ),
  },
  {
    title: 'Calendrier',
    desc: 'Toutes vos échéances sur une timeline — ne ratez plus aucune deadline.',
    href: '/calendrier',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/>
        <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
      </svg>
    ),
  },
];

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
      minHeight: '100vh', background: '#FFFFFF',
      fontFamily: "'Inter', system-ui, sans-serif",
    }}>

      {/* ── Nav ───────────────────────────────────────────── */}
      <nav style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 48px', height: 64,
        borderBottom: '1px solid rgba(15,23,42,.06)',
      }}>
        <img src="/unicancer-logo.svg" alt="Unicancer" style={{ height: 28 }} />
        <button
          onClick={() => navigate('/marches')}
          style={{
            padding: '8px 22px', borderRadius: 6,
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
        maxWidth: 1000, margin: '0 auto',
        padding: '100px 48px 80px',
        display: 'flex', alignItems: 'center', gap: 80,
        opacity: visible ? 1 : 0,
        transform: visible ? 'none' : 'translateY(16px)',
        transition: 'all .7s cubic-bezier(.22,1,.36,1)',
      }}>
        {/* Left */}
        <div style={{ flex: 1 }}>
          <h1 style={{
            fontSize: 72, fontWeight: 800, letterSpacing: '-.05em', lineHeight: .9,
            color: '#E8501A', marginBottom: 8,
          }}>
            PRISM
          </h1>
          <p style={{
            fontSize: 12, fontWeight: 600, color: '#2D5F8A',
            letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 24,
          }}>
            {'Plateforme de R\u00e9f\u00e9rencement et d\u2019Intelligence des Services et March\u00e9s'}
          </p>
          <p style={{
            fontSize: 20, color: '#334155', lineHeight: 1.6, marginBottom: 12,
            fontWeight: 500,
          }}>
            Gestion des projets
          </p>
          <p style={{
            fontSize: 15, color: '#64748B', lineHeight: 1.7, marginBottom: 36,
            maxWidth: 460,
          }}>
            {'Centralisez le pilotage de vos march\u00e9s publics, contacts et formations scientifiques \u2014 au service des centrales d\u2019achat UNICANCER.'}
          </p>

          <div style={{ display: 'flex', gap: 12 }}>
            <button
              onClick={() => navigate('/marches')}
              style={{
                padding: '12px 32px', borderRadius: 8,
                background: '#E8501A', border: 'none', color: '#fff',
                fontSize: 14, fontWeight: 600, cursor: 'pointer',
                transition: 'all .2s',
                boxShadow: '0 2px 12px rgba(232,80,26,.2)',
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(232,80,26,.3)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 2px 12px rgba(232,80,26,.2)'; }}
            >
              {'Acc\u00e9der \u00e0 PRISM \u2192'}
            </button>
            <button
              onClick={() => navigate('/contacts')}
              style={{
                padding: '12px 28px', borderRadius: 8,
                background: '#fff', border: '1px solid rgba(15,23,42,.12)',
                color: '#334155', fontSize: 14, fontWeight: 500,
                cursor: 'pointer', transition: 'all .2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#E8501A'; e.currentTarget.style.color = '#E8501A'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(15,23,42,.12)'; e.currentTarget.style.color = '#334155'; }}
            >
              Annuaire CLCC
            </button>
          </div>
        </div>

        {/* Right — Stats */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20,
          opacity: visible ? 1 : 0,
          transform: visible ? 'none' : 'translateY(24px)',
          transition: 'all .7s .15s cubic-bezier(.22,1,.36,1)',
        }}>
          {[
            { value: total, label: 'Marchés', color: '#E8501A' },
            { value: actifs, label: 'Actifs', color: '#16A34A' },
            { value: formations.length, label: 'Formations', color: '#2D5F8A' },
            { value: 917, label: 'Contacts', color: '#D97706' },
          ].map((s, i) => (
            <div key={i} style={{
              padding: '24px 28px', borderRadius: 12, textAlign: 'center',
              background: '#FAFBFC', border: '1px solid rgba(15,23,42,.06)',
            }}>
              <div style={{
                fontSize: 36, fontWeight: 700, color: s.color,
                lineHeight: 1, marginBottom: 6, letterSpacing: '-.02em',
                fontVariantNumeric: 'tabular-nums',
              }}>
                <CountUp target={s.value} />
              </div>
              <div style={{
                fontSize: 12, color: '#64748B', fontWeight: 500,
              }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Divider ───────────────────────────────────────── */}
      <div style={{
        maxWidth: 900, margin: '0 auto', padding: '0 48px',
      }}>
        <div style={{ height: 1, background: 'rgba(15,23,42,.06)' }} />
      </div>

      {/* ── Features ──────────────────────────────────────── */}
      <div style={{
        maxWidth: 900, margin: '0 auto', padding: '64px 48px 80px',
        opacity: visible ? 1 : 0,
        transform: visible ? 'none' : 'translateY(16px)',
        transition: 'all .7s .3s cubic-bezier(.22,1,.36,1)',
      }}>
        <p style={{
          fontSize: 11, fontWeight: 600, color: '#E8501A',
          letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 8,
        }}>
          Fonctionnalités
        </p>
        <h2 style={{
          fontSize: 28, fontWeight: 700, color: '#0F172A',
          letterSpacing: '-.02em', marginBottom: 40,
        }}>
          Tout votre pilotage en un seul endroit
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {FEATURES.map((f, i) => {
            const isH = hovered === i;
            return (
              <div
                key={i}
                onClick={() => navigate(f.href)}
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
                style={{
                  padding: '28px', borderRadius: 12, cursor: 'pointer',
                  background: isH ? '#FFF7F3' : '#FAFBFC',
                  border: '1px solid ' + (isH ? 'rgba(232,80,26,.2)' : 'rgba(15,23,42,.06)'),
                  transition: 'all .2s cubic-bezier(.22,1,.36,1)',
                  transform: isH ? 'translateY(-2px)' : '',
                  boxShadow: isH ? '0 4px 16px rgba(232,80,26,.06)' : 'none',
                }}
              >
                <div style={{
                  width: 40, height: 40, borderRadius: 10,
                  background: isH ? 'rgba(232,80,26,.08)' : 'rgba(15,23,42,.04)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: isH ? '#E8501A' : '#64748B',
                  transition: 'all .2s', marginBottom: 16,
                }}>
                  {f.icon}
                </div>
                <div style={{
                  fontSize: 15, fontWeight: 600, color: '#0F172A',
                  marginBottom: 6,
                }}>{f.title}</div>
                <div style={{
                  fontSize: 13, color: '#64748B', lineHeight: 1.6,
                }}>{f.desc}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Footer ────────────────────────────────────────── */}
      <div style={{
        padding: '24px 48px',
        borderTop: '1px solid rgba(15,23,42,.06)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <span style={{ fontSize: 11, color: '#94A3B8' }}>
          {'PRISM \u00b7 UNICANCER \u00b7 2026'}
        </span>
        <span style={{ fontSize: 11, color: '#CBD5E1' }}>
          {'Plateforme de R\u00e9f\u00e9rencement et d\u2019Intelligence des Services et March\u00e9s'}
        </span>
      </div>
    </div>
  );
}
