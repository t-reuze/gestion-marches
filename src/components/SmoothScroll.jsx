import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Lenis from 'lenis';

/* ================================================================
   <SmoothScroll> — Lenis scoped au conteneur .content
   - Recrée l'instance à chaque navigation (la .content est recréée)
   - Skippé si prefers-reduced-motion
================================================================ */

export default function SmoothScroll({ children }) {
  const { pathname } = useLocation();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let lenis = null;
    let rafId = null;

    /* La .content est rendue après le mount initial → on attend qu'elle existe */
    const tryAttach = () => {
      const wrapper = document.querySelector('.content');
      if (!wrapper) return false;
      const content = wrapper.firstElementChild;
      if (!content) return false;

      lenis = new Lenis({
        wrapper,
        content,
        duration: 1.05,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        smoothWheel: true,
        wheelMultiplier: 1,
        touchMultiplier: 2,
      });

      const raf = (time) => {
        lenis.raf(time);
        rafId = requestAnimationFrame(raf);
      };
      rafId = requestAnimationFrame(raf);
      return true;
    };

    /* Petit retry au cas où la route n'est pas encore montée */
    if (!tryAttach()) {
      const obs = new MutationObserver(() => {
        if (tryAttach()) obs.disconnect();
      });
      obs.observe(document.body, { childList: true, subtree: true });
      return () => {
        obs.disconnect();
        if (rafId) cancelAnimationFrame(rafId);
        if (lenis) lenis.destroy();
      };
    }

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      if (lenis) lenis.destroy();
    };
  }, [pathname]);

  return children;
}
