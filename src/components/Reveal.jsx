import { motion } from 'framer-motion';

/* ================================================================
   <Reveal> — wrapper réutilisable pour reveals au scroll
   Pattern dnacapital.com : IntersectionObserver fade-up
   - viewport.once = true → ne joue qu'une fois
   - viewport.amount = 0.2 → trigger quand 20 % visible
================================================================ */

const variants = {
  fade:    { hidden: { opacity: 0 },             visible: { opacity: 1 } },
  fadeUp:  { hidden: { opacity: 0, y: 32 },      visible: { opacity: 1, y: 0 } },
  fadeUpL: { hidden: { opacity: 0, y: 60 },      visible: { opacity: 1, y: 0 } },
  scaleIn: { hidden: { opacity: 0, scale: 0.92 }, visible: { opacity: 1, scale: 1 } },
  slideR:  { hidden: { opacity: 0, x: -32 },     visible: { opacity: 1, x: 0 } },
  slideL:  { hidden: { opacity: 0, x: 32 },      visible: { opacity: 1, x: 0 } },
};

export default function Reveal({
  children,
  type = 'fadeUp',
  delay = 0,
  duration = 0.7,
  amount = 0.2,
  once = true,
  as = 'div',
  className,
  style,
}) {
  const Comp = motion[as] || motion.div;
  return (
    <Comp
      className={className}
      style={style}
      initial="hidden"
      whileInView="visible"
      viewport={{ once, amount }}
      variants={variants[type] || variants.fadeUp}
      transition={{ duration, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </Comp>
  );
}

/* Conteneur pour cascader les enfants — chaque enfant doit être un <Reveal /> */
export function RevealStack({ children, gap = 0.08, delay = 0, amount = 0.15, once = true, style, className }) {
  return (
    <motion.div
      className={className}
      style={style}
      initial="hidden"
      whileInView="visible"
      viewport={{ once, amount }}
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: gap, delayChildren: delay } },
      }}
    >
      {children}
    </motion.div>
  );
}

/* Item à utiliser dans <RevealStack> — hérite du timing parent */
export function RevealItem({ children, type = 'fadeUp', as = 'div', className, style }) {
  const Comp = motion[as] || motion.div;
  return (
    <Comp
      className={className}
      style={style}
      variants={{
        ...variants[type],
        visible: { ...variants[type].visible, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] } },
      }}
    >
      {children}
    </Comp>
  );
}
