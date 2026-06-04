import { useEffect } from 'react';

// ═══════════════════════════════════════════════════════════
// Modal de rapport qualité affichée après un export Suivi_Invest.
// Statistiques sur l'origine des lignes (auto / éditées / manuelles)
// et sur leur confiance moyenne.
// ═══════════════════════════════════════════════════════════

export default function QualityReportModal({ report, onClose }) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', onKey); };
  }, [onClose]);

  const pct = (n) => report.total > 0 ? `${Math.round(100 * n / report.total)}%` : '0%';

  return (
    <div role="dialog" aria-modal="true" onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(15, 23, 42, 0.55)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '3vh 3vw',
      }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: 'min(640px, 100%)', background: '#fff', borderRadius: 8,
        boxShadow: '0 20px 60px rgba(0,0,0,0.25)', overflow: 'hidden',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 18px', borderBottom: '1px solid var(--border)',
          background: 'linear-gradient(90deg, #ECFDF5, #fff)',
        }}>
          <div>
            <div style={{ fontSize: 10, color: '#065F46', fontWeight: 700, letterSpacing: 0.6, textTransform: 'uppercase' }}>
              Export terminé
            </div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>Rapport qualité — {report.total} ligne{report.total > 1 ? 's' : ''} insérée{report.total > 1 ? 's' : ''}</div>
          </div>
          <button onClick={onClose} aria-label="Fermer"
            style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 20, padding: '4px 10px', color: 'var(--text-muted)', borderRadius: 4 }}>
            ×
          </button>
        </div>

        <div style={{ padding: 18 }}>
          <Section title="Origine des lignes">
            <Bar label="100 % auto"             value={report.auto}       total={report.total} color="#10B981" />
            <Bar label="Auto + édition manuelle" value={report.autoEdited} total={report.total} color="#F59E0B" />
            <Bar label="Saisie manuelle"         value={report.manual}     total={report.total} color="#3B82F6" />
          </Section>

          <Section title="Statut initial des lignes auto" style={{ marginTop: 14 }}>
            <Bar label="OK (haute confiance)"    value={report.byStatus.ok}      total={report.total} color="#10B981" />
            <Bar label="Avertissement"           value={report.byStatus.warning} total={report.total} color="#F59E0B" />
            <Bar label="Erreur (corrigée avant export)" value={report.byStatus.error} total={report.total} color="#DC2626" />
          </Section>

          {report.avgConfidence != null && (
            <div style={{ marginTop: 14, fontSize: 12, color: 'var(--text-muted)' }}>
              Confiance moyenne du matching CLCC : <strong style={{ color: 'var(--text)' }}>
                {(report.avgConfidence * 100).toFixed(0)} %
              </strong>
            </div>
          )}

          {Object.keys(report.byMarche).length > 1 && (
            <Section title="Répartition par marché" style={{ marginTop: 14 }}>
              {Object.entries(report.byMarche).map(([id, n]) => (
                <Bar key={id} label={id} value={n} total={report.total} color="#64748B" />
              ))}
            </Section>
          )}

          <div style={{ marginTop: 18, padding: 10, background: '#F0F9FF', borderRadius: 6, fontSize: 11, color: '#075985' }}>
            <strong>Bonne pratique :</strong> ouvrez le fichier exporté et vérifiez d'abord les lignes
            « auto-éditées » et celles avec un statut initial « avertissement » — ce sont les plus
            susceptibles de contenir des erreurs résiduelles.
          </div>

          <div style={{ marginTop: 14, display: 'flex', justifyContent: 'flex-end' }}>
            <button className="btn btn-primary" onClick={onClose}>Fermer</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children, style }) {
  return (
    <div style={style}>
      <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 6 }}>
        {title}
      </div>
      {children}
    </div>
  );
}

function Bar({ label, value, total, color }) {
  const ratio = total > 0 ? value / total : 0;
  return (
    <div style={{ marginBottom: 6 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 2 }}>
        <span>{label}</span>
        <span style={{ color: 'var(--text-muted)' }}>{value} ({Math.round(ratio * 100)}%)</span>
      </div>
      <div style={{ height: 6, background: '#F1F5F9', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ width: `${ratio * 100}%`, height: '100%', background: color }} />
      </div>
    </div>
  );
}
