import { useEffect, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';

const UNICANCER_PATH = "M65.2 49.2v6.3c0 5.7-4.6 10.3-10.2 10.3H4.1V4.2h61.1v8.3h4.1V4.2 0H0v4.2 61.6V70h4.1H55c7.9 0 14.4-6.5 14.4-14.5v-6.3h-4.2 0zM38.5 24.7v17c-.3.1-.5.1-.8.1-.4 0-.8.1-1.1.1-1 0-1.8-.3-2.3-1s-.8-2-.8-3.8V24.7h-4.1v12.5c0 1.6.2 3 .5 4 .3 1.1.8 2 1.5 2.6.6.7 1.4 1.1 2.4 1.4.9.2 1.9.4 2.9.4.4 0 .9 0 1.4-.1s1-.1 1.5-.2l1.5-.3c.5-.1.9-.2 1.2-.4l.3-.1V24.7h-4.1zm21.7 4.2c-.3-1.1-.8-2-1.4-2.7s-1.4-1.2-2.2-1.5c-1.6-.5-3.5-.5-5.8-.1-1.1.2-2.1.4-3 .7l-.3.1v19.9h4.1V28.4c.7-.2 1.3-.3 1.9-.3 1.2 0 1.9.4 2.3 1.1.4.8.7 2.2.7 4v12h4.1V33c.1-1.6-.1-3-.4-4.1m5-4.2h4.1v20.6h-4.1V24.7zM83.9 41l-.5.3c-.4.2-.7.4-1.1.5s-.8.2-1.3.2c-.7 0-1.2-.2-1.7-.5-.4-.3-.8-.8-1.1-1.3-.3-.6-.5-1.3-.6-2.2s-.2-1.9-.2-2.9c0-2.5.3-4.3.9-5.4.5-1.1 1.4-1.6 2.5-1.6.8 0 1.6.2 2.3.7l.5.3 1.1-3.6-.3-.2c-.5-.3-1.1-.5-1.7-.7s-1.3-.3-2.1-.3c-2.5 0-4.4 1-5.7 3-1.2 1.9-1.8 4.5-1.8 7.9 0 1.5.1 2.9.4 4.2.2 1.3.7 2.4 1.2 3.4.6 1 1.4 1.8 2.3 2.3 1 .6 2.2.9 3.6.9.8 0 1.6-.1 2.3-.4.7-.2 1.3-.5 1.7-.8l.3-.2-1-3.6zm13-15c-1.2-1.2-2.7-1.8-4.6-1.8-.9 0-1.7.1-2.4.3s-1.5.4-2.1.7l-.4.2.9 3.7.5-.2c.5-.2 1-.4 1.5-.5s1-.2 1.5-.2c.9 0 1.6.2 2 .7.5.5.7 1.4.7 2.7v1.2c-.8-.1-1.5-.2-2.2-.2-.9 0-1.8.1-2.6.4s-1.5.7-2.1 1.3-1.1 1.3-1.4 2.1-.5 1.8-.5 2.9c0 1.2.2 2.2.6 3s.9 1.5 1.5 2.1c.6.5 1.4.9 2.2 1.2.8.2 1.7.4 2.6.4s1.8-.1 2.8-.2l2.8-.6.4-.1V31.4c.1-2.4-.5-4.2-1.7-5.4m-4 16c-1 0-1.7-.2-2.2-.7-.5-.4-.7-1.2-.7-2.2 0-.6.1-1.1.2-1.5s.3-.6.6-.9c.3-.2.6-.4.9-.5.4-.1.8-.2 1.2-.2.6 0 1.1.1 1.7.2v5.4a3.81 3.81 0 0 1-1.7.4M116 28.9c-.3-1.1-.8-2-1.4-2.7s-1.4-1.2-2.2-1.5c-1.6-.5-3.5-.5-5.8-.1-1.1.2-2.1.4-3 .7l-.3.1v19.9h4.1V28.4c.7-.2 1.3-.3 1.9-.3 1.2 0 1.9.4 2.3 1.1.4.8.7 2.2.7 4v12h4.1V33c.1-1.6-.1-3-.4-4.1M130.7 41l-.5.3c-.4.2-.7.4-1.1.5s-.8.2-1.3.2c-.7 0-1.2-.2-1.7-.5-.4-.3-.8-.8-1.1-1.3-.3-.6-.5-1.3-.6-2.2s-.2-1.9-.2-2.9c0-2.5.3-4.3.9-5.4.5-1.1 1.4-1.6 2.5-1.6.8 0 1.6.2 2.3.7l.5.3 1.1-3.6-.3-.2c-.5-.3-1.1-.5-1.7-.7s-1.3-.3-2.1-.3c-2.5 0-4.4 1-5.7 3-1.2 1.9-1.8 4.5-1.8 7.9 0 1.5.1 2.9.4 4.2.2 1.3.7 2.4 1.2 3.4.6 1 1.4 1.8 2.3 2.3 1 .6 2.2.9 3.6.9.8 0 1.6-.1 2.3-.4.7-.2 1.3-.5 1.7-.8l.3-.2-1-3.6zm14.2-14c-1-1.8-2.7-2.8-5.1-2.8-2.1 0-3.8.9-5.1 2.7-1.2 1.7-1.9 4.5-1.9 8.2 0 1.5.1 2.9.4 4.2s.7 2.4 1.3 3.4 1.4 1.7 2.4 2.3c1 .5 2.2.8 3.6.8 1.1 0 2-.1 2.8-.4s1.4-.5 1.7-.8l.3-.2-.8-3.5-.6.3c-.2.1-.7.3-1.2.5-.6.2-1.2.3-1.8.3-.8 0-1.4-.1-1.9-.4s-.9-.7-1.2-1.2-.5-1.2-.7-1.9c-.1-.6-.2-1.3-.2-2h9.1v-.4-.9-.8c.3-3.2-.2-5.7-1.1-7.4m-5.1.9c.9 0 1.4.4 1.7 1.3s.5 2.1.5 3.7h-4.9c.1-1.5.4-2.7.8-3.6s1-1.4 1.9-1.4m19.8-3c-.6-.2-1.1-.4-1.8-.4-.6-.1-1.2-.1-1.8-.1-1.1 0-2.2.1-3.2.4-1 .2-1.8.6-2.5.9l-.3.1v19.5h4.1V28.4c.6-.2 1.3-.3 2.1-.3.9 0 1.7.2 2.5.5l.6.2.8-3.8-.5-.1zm-94.4-8.5h4.1v4.5h-4.1v-4.5z";

/* === VARIANTS === */
const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.4, ease: 'easeOut' } },
  exit: {
    opacity: 0,
    scale: 1.04,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
  },
};

const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 1.4, delayChildren: 0.1 },
  },
};

const logoVariants = {
  hidden: { opacity: 0, scale: 0.92 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 1.6, ease: [0.45, 0.05, 0.25, 1] },
  },
};

const prismVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 1.6, ease: [0.45, 0.05, 0.25, 1] },
  },
};

const subtitleVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: 0.6 },
  },
};

export default function SplashScreen({ onDone }) {
  const reduce = useReducedMotion();
  const [show, setShow] = useState(true);

  useEffect(() => {
    const total = reduce ? 800 : 4000;
    const t = setTimeout(() => setShow(false), total);
    return () => clearTimeout(t);
  }, [reduce]);

  const handleExit = () => onDone && onDone();
  const skip = () => setShow(false);

  return (
    <AnimatePresence onExitComplete={handleExit}>
      {show && (
        <motion.div
          key="splash"
          variants={overlayVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          onClick={skip}
          style={{
            position: 'fixed', inset: 0, zIndex: 99999,
            background: '#FAFAF7',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexDirection: 'column',
            cursor: 'pointer', overflow: 'hidden',
            fontFamily: "'Inter', system-ui, sans-serif",
          }}
        >
          {/* Mesh gradient background — fade in seul */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1.4 }}
            style={{
              position: 'absolute', inset: 0,
              background: `
                radial-gradient(ellipse 60% 50% at 25% 35%, rgba(234,86,13,.10) 0%, transparent 55%),
                radial-gradient(ellipse 50% 60% at 75% 65%, rgba(234,86,13,.08) 0%, transparent 60%)
              `,
              pointerEvents: 'none',
            }}
          />

          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}
          >
            {/* Logo Unicancer — SVG path tracé puis rempli */}
            <motion.div variants={logoVariants}>
              <motion.svg
                viewBox="0 0 160 70"
                style={{ width: 480, height: 'auto', display: 'block', marginBottom: 56 }}
                animate={{
                  filter: [
                    'drop-shadow(0 4px 16px rgba(234,86,13,0.08))',
                    'drop-shadow(0 4px 16px rgba(234,86,13,0.08))',
                    'drop-shadow(0 0 32px rgba(234,86,13,0.45))',
                  ],
                }}
                transition={{ duration: 3.6, times: [0, 0.6, 1], ease: 'easeOut' }}
              >
                <motion.path
                  d={UNICANCER_PATH}
                  stroke="#ea560d"
                  strokeWidth="0.4"
                  initial={{ pathLength: 0, fillOpacity: 0 }}
                  animate={{ pathLength: 1, fillOpacity: 1 }}
                  transition={{
                    pathLength: { duration: 2, ease: [0.45, 0.05, 0.25, 1], delay: 0.1 },
                    fillOpacity: { duration: 1.2, ease: 'easeInOut', delay: 0.8 },
                  }}
                  fill="#ea560d"
                />
              </motion.svg>
            </motion.div>

            {/* PRISM — SVG text tracé puis rempli avec gradient */}
            <motion.div variants={prismVariants}>
              <svg viewBox="0 0 600 140" style={{ width: 560, height: 'auto', display: 'block', overflow: 'visible' }}>
                <defs>
                  <linearGradient id="prismFill" x1="0%" y1="0%" x2="0%" y2="120%">
                    <stop offset="40%" stopColor="#0F172A" />
                    <stop offset="100%" stopColor="#ea560d" />
                  </linearGradient>
                </defs>
                <motion.text
                  x="50%" y="100"
                  textAnchor="middle"
                  fontFamily="'Inter', system-ui, sans-serif"
                  fontSize="120"
                  fontWeight="800"
                  letterSpacing="2"
                  stroke="#0F172A"
                  strokeWidth="1.2"
                  initial={{ pathLength: 0, fillOpacity: 0 }}
                  animate={{ pathLength: 1, fillOpacity: 1 }}
                  transition={{
                    pathLength: { duration: 2, ease: [0.45, 0.05, 0.25, 1] },
                    fillOpacity: { duration: 1.2, ease: 'easeInOut', delay: 1 },
                  }}
                  fill="url(#prismFill)"
                >
                  PRISM
                </motion.text>
              </svg>
            </motion.div>

            {/* Sous-titre */}
            <motion.div
              variants={subtitleVariants}
              style={{
                marginTop: 28,
                fontSize: 11, fontWeight: 600, color: '#94A3B8',
                letterSpacing: '.36em', textTransform: 'uppercase', textAlign: 'center',
              }}
            >
              {'Plateforme de Référencement & d’Intelligence'}
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
