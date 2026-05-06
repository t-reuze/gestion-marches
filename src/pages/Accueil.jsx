import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useReducedMotion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { marches, formations } from '../data/mockData';
import { useMarcheMeta } from '../context/MarcheMetaContext';

/* ─── Variants centralisés ─────────────────────────────────────── */
const heroContainer = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
};

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1, y: 0,
    transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] },
  },
};

const fadeUpSpring = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1, y: 0,
    transition: { type: 'spring', stiffness: 80, damping: 16, mass: 0.8 },
  },
};

const cardsContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07, delayChildren: 0.4 } },
};

const cardItem = {
  hidden: { opacity: 0, y: 24, scale: 0.95 },
  visible: {
    opacity: 1, y: 0, scale: 1,
    transition: { type: 'spring', stiffness: 120, damping: 18 },
  },
};

/* ─── Counter animé ────────────────────────────────────────────── */
function CountUp({ target, duration = 1.4 }) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    const num = typeof target === 'number' ? target : parseInt(target) || 0;
    if (!num) return;
    let start = 0;
    const ticks = Math.max(1, Math.ceil(num / (duration * 60)));
    const id = setInterval(() => {
      start += ticks;
      if (start >= num) { setVal(num); clearInterval(id); }
      else setVal(start);
    }, 16);
    return () => clearInterval(id);
  }, [target, duration]);
  return val;
}

const MODULES = [
  { label: 'Marchés', desc: 'Pilotage des appels d’offres', href: '/marches', icon: 'M' },
  { label: 'Formations', desc: 'Catalogue scientifique', href: '/formations', icon: 'F' },
  { label: 'Reporting', desc: 'KPIs & gains achats', href: '/reporting', icon: 'R' },
  { label: 'Contacts', desc: 'Annuaire CLCC + fournisseurs', href: '/contacts', icon: 'C' },
  { label: 'Calendrier', desc: 'Échéances & deadlines', href: '/calendrier', icon: 'K' },
  { label: 'Matwin', desc: 'Espace projets innovation', href: '/matwin', icon: 'W' },
];

export default function Accueil() {
  const navigate = useNavigate();
  const { getMeta } = useMarcheMeta();
  const reduce = useReducedMotion();
  const heroRef = useRef(null);

  /* Souris → motion values pour parallax fluide */
  const mx = useMotionValue(50);
  const my = useMotionValue(50);
  const sx = useSpring(mx, { stiffness: 60, damping: 20 });
  const sy = useSpring(my, { stiffness: 60, damping: 20 });

  const orbX = useTransform(sx, [0, 100], ['calc(0% - 400px)', 'calc(100% - 400px)']);
  const orbY = useTransform(sy, [0, 100], ['calc(0% - 400px)', 'calc(100% - 400px)']);

  const handleMouseMove = (e) => {
    if (!heroRef.current || reduce) return;
    const r = heroRef.current.getBoundingClientRect();
    mx.set(((e.clientX - r.left) / r.width) * 100);
    my.set(((e.clientY - r.top) / r.height) * 100);
  };

  const total = marches.length;
  const actifs = marches.filter(m => (getMeta(m.id).statut || m.statut) !== 'cloture').length;

  const STATS = [
    { value: total, label: 'Marchés' },
    { value: actifs, label: 'Actifs' },
    { value: formations.length, label: 'Formations' },
    { value: 917, label: 'Contacts' },
  ];

  return (
    <div
      ref={heroRef}
      onMouseMove={handleMouseMove}
      style={{
        minHeight: '100vh', background: '#FAFAF7',
        fontFamily: "'Inter', system-ui, sans-serif",
        position: 'relative', overflow: 'hidden', color: '#0F172A',
      }}
    >
      {/* Orbes background */}
      <motion.div
        style={{
          position: 'absolute', left: orbX, top: orbY,
          width: 800, height: 800, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(234,86,13,.35), transparent 60%)',
          filter: 'blur(120px)', opacity: 0.7, pointerEvents: 'none', zIndex: 1,
        }}
      />
      <motion.div
        animate={{
          x: [0, 40, -30, 0],
          y: [0, -30, 40, 0],
          scale: [1, 1.1, 0.95, 1],
        }}
        transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          position: 'absolute', right: -150, top: '10%',
          width: 600, height: 600, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255,107,53,.28), transparent 60%)',
          filter: 'blur(120px)', pointerEvents: 'none', zIndex: 1,
        }}
      />
      <motion.div
        animate={{
          x: [0, -50, 30, 0],
          y: [0, 30, -20, 0],
          scale: [1, 1.15, 0.95, 1],
        }}
        transition={{ duration: 16, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          position: 'absolute', left: -200, bottom: -200,
          width: 700, height: 700, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(15,23,42,.12), transparent 60%)',
          filter: 'blur(120px)', pointerEvents: 'none', zIndex: 1,
        }}
      />

      {/* Tech grid overlay */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage:
          'linear-gradient(rgba(15,23,42,.04) 1px, transparent 1px), linear-gradient(90deg, rgba(15,23,42,.04) 1px, transparent 1px)',
        backgroundSize: '60px 60px',
        maskImage: 'radial-gradient(ellipse 80% 60% at 50% 40%, #000 30%, transparent 80%)',
        WebkitMaskImage: 'radial-gradient(ellipse 80% 60% at 50% 40%, #000 30%, transparent 80%)',
        pointerEvents: 'none', zIndex: 1,
      }} />

      {/* === NAV === */}
      <motion.nav
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        style={{
          position: 'relative', zIndex: 10,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '20px 48px',
        }}
      >
        <img src="/unicancer-logo.svg" alt="Unicancer" style={{ height: 28 }} />
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '6px 14px', borderRadius: 999,
          background: 'rgba(255,255,255,.6)', backdropFilter: 'blur(12px)',
          border: '1px solid rgba(15,23,42,.06)',
          fontSize: 11, fontWeight: 600, color: '#64748B', letterSpacing: '.08em',
        }}>
          <motion.span
            animate={{ scale: [1, 1.4, 1], opacity: [1, 0.6, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            style={{
              width: 6, height: 6, borderRadius: '50%',
              background: '#16A34A', boxShadow: '0 0 8px #16A34A',
              display: 'inline-block',
            }}
          />
          v2026 · ONLINE
        </div>
      </motion.nav>

      {/* === HERO === */}
      <motion.main
        variants={heroContainer}
        initial="hidden"
        animate="visible"
        style={{
          position: 'relative', zIndex: 5,
          maxWidth: 1400, margin: '0 auto',
          padding: '40px 48px 80px',
          display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: 80,
          alignItems: 'center',
        }}
      >
        {/* === Gauche === */}
        <div>
          <motion.div variants={fadeUp} style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '6px 14px', borderRadius: 999,
            background: 'linear-gradient(90deg, rgba(234,86,13,.08), rgba(234,86,13,.02))',
            border: '1px solid rgba(234,86,13,.2)',
            fontSize: 11, fontWeight: 600, color: '#ea560d',
            letterSpacing: '.06em', marginBottom: 24,
          }}>
            <span style={{ padding: '1px 6px', borderRadius: 4, fontSize: 9, background: '#ea560d', color: '#fff' }}>NEW</span>
            Quality Control & BPU Compare disponibles
          </motion.div>

          <motion.h1
            variants={fadeUpSpring}
            style={{
              fontSize: 'clamp(64px, 9vw, 132px)',
              fontWeight: 800, letterSpacing: '-.04em', lineHeight: .92,
              margin: '0 0 20px',
              background: 'linear-gradient(110deg, #0F172A 0%, #ea560d 45%, #FF6B35 70%, #ea560d 100%)',
              backgroundSize: '200% 100%',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
            }}
            animate={reduce ? {} : { backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'] }}
            transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
          >
            PRISM
          </motion.h1>

          <motion.p variants={fadeUp} style={{
            fontSize: 13, fontWeight: 600, color: '#94A3B8',
            letterSpacing: '.18em', textTransform: 'uppercase', margin: '0 0 16px',
          }}>
            Plateforme de Référencement & d&rsquo;Intelligence
          </motion.p>

          <motion.p variants={fadeUp} style={{
            fontSize: 18, color: '#475569', lineHeight: 1.6,
            maxWidth: 480, margin: '0 0 36px',
          }}>
            Centralisez le pilotage des marchés publics, de l&rsquo;analyse des offres au reporting d&rsquo;impact — au service des centrales d&rsquo;achat <strong style={{ color: '#0F172A' }}>UNICANCER</strong>.
          </motion.p>

          <motion.div variants={fadeUp} style={{ display: 'flex', gap: 12, marginBottom: 48 }}>
            <motion.button
              whileHover={{ y: -2, boxShadow: '0 8px 30px rgba(234,86,13,.45), inset 0 1px 0 rgba(255,255,255,.3)' }}
              whileTap={{ y: 0, scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 400, damping: 17 }}
              onClick={() => navigate('/marches')}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 10,
                padding: '14px 26px', borderRadius: 12, border: 'none',
                background: 'linear-gradient(135deg, #ea560d 0%, #FF6B35 100%)',
                color: '#fff', fontSize: 14, fontWeight: 600,
                fontFamily: 'inherit', cursor: 'pointer',
                boxShadow: '0 4px 20px rgba(234,86,13,.3), inset 0 1px 0 rgba(255,255,255,.25)',
              }}
            >
              <span>Accéder à PRISM</span>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="2" y1="8" x2="13" y2="8" />
                <polyline points="9,4 13,8 9,12" />
              </svg>
            </motion.button>

            <motion.button
              whileHover={{ y: -1, backgroundColor: 'rgba(255,255,255,.85)', borderColor: 'rgba(234,86,13,.3)', color: '#ea560d' }}
              whileTap={{ y: 0, scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 400, damping: 17 }}
              onClick={() => navigate('/reporting')}
              style={{
                padding: '14px 22px', borderRadius: 12,
                background: 'rgba(255,255,255,.5)', backdropFilter: 'blur(12px)',
                border: '1px solid rgba(15,23,42,.1)',
                color: '#334155', fontSize: 14, fontWeight: 600,
                fontFamily: 'inherit', cursor: 'pointer',
              }}
            >
              Voir le reporting
            </motion.button>
          </motion.div>

          {/* Stats */}
          <motion.div variants={fadeUp} style={{ display: 'flex', gap: 36 }}>
            {STATS.map((s, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.6 + i * 0.08, ease: [0.22, 1, 0.36, 1] }}
              >
                <div style={{
                  fontSize: 32, fontWeight: 800, lineHeight: 1,
                  fontVariantNumeric: 'tabular-nums',
                  background: 'linear-gradient(180deg, #0F172A 30%, #ea560d 130%)',
                  WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                  marginBottom: 4,
                }}>
                  <CountUp target={s.value} />
                </div>
                <div style={{
                  fontSize: 10, color: '#94A3B8', fontWeight: 600,
                  letterSpacing: '.14em', textTransform: 'uppercase',
                }}>
                  {s.label}
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>

        {/* === Droite : grille de cards modules === */}
        <motion.div
          variants={cardsContainer}
          initial="hidden"
          animate="visible"
          style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14,
            perspective: 1200,
          }}
        >
          {MODULES.map((m) => (
            <ModuleCard key={m.href} module={m} onClick={() => navigate(m.href)} reduce={reduce} />
          ))}
        </motion.div>
      </motion.main>

      {/* === Marquee === */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, padding: '18px 0',
        background: 'linear-gradient(90deg, transparent, rgba(15,23,42,.95), rgba(234,86,13,.9), rgba(15,23,42,.95), transparent)',
        overflow: 'hidden', zIndex: 5,
      }}>
        <motion.div
          animate={reduce ? {} : { x: ['0%', '-50%'] }}
          transition={{ duration: 35, repeat: Infinity, ease: 'linear' }}
          style={{ display: 'flex', gap: 48, width: 'max-content' }}
        >
          {[...Array(2)].flatMap((_, k) => (
            ['UNICANCER', 'DAAI', 'PRISM', 'INTELLIGENCE', 'MARCHÉS PUBLICS', 'REPORTING', 'INNOVATION'].map((w, i) => (
              <span key={k + '-' + i} style={{
                display: 'inline-flex', alignItems: 'center', gap: 32,
                fontSize: 13, fontWeight: 700, letterSpacing: '.25em',
                color: 'rgba(255,255,255,.85)', whiteSpace: 'nowrap',
              }}>
                {w}
                <span style={{ color: 'rgba(255,255,255,.4)', fontSize: 8 }}>●</span>
              </span>
            ))
          ))}
        </motion.div>
      </div>
    </div>
  );
}

/* ─── ModuleCard avec Framer Motion (tilt 3D + spring) ─────────── */
function ModuleCard({ module: m, onClick, reduce }) {
  const [hovered, setHovered] = useState(false);
  const cardRef = useRef(null);

  const rx = useMotionValue(0);
  const ry = useMotionValue(0);
  const sprx = useSpring(rx, { stiffness: 200, damping: 20 });
  const spry = useSpring(ry, { stiffness: 200, damping: 20 });

  const handleMove = (e) => {
    if (!cardRef.current || reduce) return;
    const r = cardRef.current.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    ry.set(px * 8);
    rx.set(-py * 8);
  };
  const handleLeave = () => {
    rx.set(0); ry.set(0);
    setHovered(false);
  };

  return (
    <motion.div
      ref={cardRef}
      variants={cardItem}
      onMouseMove={handleMove}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={handleLeave}
      onClick={onClick}
      whileHover={{ z: 12 }}
      style={{
        position: 'relative',
        padding: '24px 22px',
        borderRadius: 16,
        cursor: 'pointer',
        background: 'rgba(255,255,255,.55)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: '1px solid ' + (hovered ? 'rgba(234,86,13,.4)' : 'rgba(15,23,42,.08)'),
        boxShadow: hovered
          ? '0 20px 50px rgba(234,86,13,.18), 0 0 0 1px rgba(234,86,13,.1)'
          : '0 4px 20px rgba(15,23,42,.04)',
        transformStyle: 'preserve-3d',
        rotateX: sprx, rotateY: spry,
        transition: 'border-color .25s, box-shadow .25s',
        overflow: 'hidden',
      }}
    >
      {/* Sweep gradient au hover */}
      <motion.div
        animate={{ opacity: hovered ? 1 : 0 }}
        transition={{ duration: 0.35 }}
        style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(135deg, transparent 30%, rgba(234,86,13,.08) 50%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      {/* Halo coin haut-droit */}
      <motion.div
        animate={{ opacity: hovered ? 1 : 0.5 }}
        style={{
          position: 'absolute', top: 0, right: 0,
          width: 60, height: 60,
          background: 'radial-gradient(circle at top right, rgba(234,86,13,.18), transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      {/* Icône carrée */}
      <motion.div
        animate={{
          background: hovered
            ? 'linear-gradient(135deg, #ea560d, #FF6B35)'
            : 'linear-gradient(135deg, #0F172A, #1E293B)',
          boxShadow: hovered ? '0 4px 16px rgba(234,86,13,.3)' : '0 2px 8px rgba(15,23,42,.15)',
        }}
        transition={{ duration: 0.3 }}
        style={{
          width: 38, height: 38, borderRadius: 10,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontSize: 16, fontWeight: 800, marginBottom: 14,
        }}
      >
        {m.icon}
      </motion.div>

      <motion.div
        animate={{ color: hovered ? '#ea560d' : '#0F172A' }}
        style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}
      >
        {m.label}
      </motion.div>
      <div style={{ fontSize: 12, color: '#64748B', lineHeight: 1.5 }}>{m.desc}</div>

      <motion.svg
        animate={{
          x: hovered ? 2 : 0,
          y: hovered ? -2 : 0,
          stroke: hovered ? '#ea560d' : '#CBD5E1',
        }}
        width="16" height="16" viewBox="0 0 16 16" fill="none"
        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        style={{ position: 'absolute', bottom: 18, right: 18 }}
      >
        <line x1="3" y1="13" x2="13" y2="3" />
        <polyline points="6,3 13,3 13,10" />
      </motion.svg>
    </motion.div>
  );
}
