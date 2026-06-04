import { useEffect } from 'react';
import BddBuilder from './BddBuilder';

export default function BddBuilderModal({ onClose }) {
  // Ferme la modale sur Échap, bloque le scroll derrière.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(15, 23, 42, 0.55)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        padding: '3vh 3vw', overflow: 'auto',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: 'min(1200px, 100%)',
          background: '#fff',
          borderRadius: 8,
          boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
          overflow: 'hidden',
        }}
      >
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 16px', borderBottom: '1px solid var(--border)',
          background: 'linear-gradient(90deg, #FFF7ED, #fff)',
        }}>
          <div>
            <div style={{ fontSize: 10, color: 'var(--orange)', fontWeight: 600, letterSpacing: 0.6, textTransform: 'uppercase' }}>
              Reporting · Outil d'alimentation
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>
              Alimenter Suivi_Invest
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Fermer"
            style={{
              border: 'none', background: 'transparent', cursor: 'pointer',
              fontSize: 20, padding: '4px 10px', color: 'var(--text-muted)',
              borderRadius: 4,
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#F3F4F6'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
          >
            ×
          </button>
        </div>
        <div style={{ padding: 16 }}>
          <BddBuilder onClose={onClose} />
        </div>
      </div>
    </div>
  );
}
