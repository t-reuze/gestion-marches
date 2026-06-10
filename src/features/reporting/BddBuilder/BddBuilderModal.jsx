import { useEffect } from 'react';
import BddBuilder from './BddBuilder';

export default function BddBuilderModal({ onClose }) {
  // Bloque le scroll derrière. Volontairement : PAS de fermeture sur Échap ni
  // sur clic extérieur — on ne ferme qu'avec la croix pour éviter de perdre la
  // saisie en cours par accident.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(15, 23, 42, 0.55)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        padding: '2vh 2vw', overflow: 'auto',
      }}
    >
      <div
        style={{
          // Grande par défaut + redimensionnable (poignée en bas à droite).
          width: 'min(1700px, 96vw)',
          maxWidth: '96vw',
          minWidth: 720,
          height: '92vh',
          maxHeight: '94vh',
          minHeight: 420,
          resize: 'both',
          background: '#fff',
          borderRadius: 8,
          boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
          overflow: 'hidden',
          display: 'flex', flexDirection: 'column',
        }}
      >
        <div style={{
          flex: '0 0 auto',
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
            title="Fermer"
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
        <div style={{ padding: 16, flex: '1 1 auto', overflowY: 'auto' }}>
          <BddBuilder onClose={onClose} />
        </div>
      </div>
    </div>
  );
}
