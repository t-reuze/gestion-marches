import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { marches, formations } from '../data/mockData';
import { useMarcheMeta } from '../context/MarcheMetaContext';
import { useFormationsMeta } from '../context/FormationsMetaContext';

const COLORS = {
  orange: '#E8501A',
  blue: '#2D5F8A',
  red: '#DC2626',
  green: '#16A34A',
  yellow: '#D97706',
};

function diffDays(dateStr) {
  if (!dateStr) return Infinity;
  const target = new Date(dateStr);
  if (isNaN(target)) return Infinity;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  return Math.round((target - now) / (1000 * 60 * 60 * 24));
}

function diffMonths(dateStr) {
  if (!dateStr) return Infinity;
  const target = new Date(dateStr);
  if (isNaN(target)) return Infinity;
  const now = new Date();
  return (target.getFullYear() - now.getFullYear()) * 12 + (target.getMonth() - now.getMonth());
}

export default function NotificationsBell() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const marcheMeta = useMarcheMeta();
  const formationsMeta = useFormationsMeta();

  const notifications = useMemo(() => {
    const alerts = [];

    marches.forEach((m) => {
      // Echeance depot within 3 months
      if (m.dateLimiteDepot && diffMonths(m.dateLimiteDepot) >= 0 && diffMonths(m.dateLimiteDepot) <= 3) {
        const days = diffDays(m.dateLimiteDepot);
        if (days >= 0) {
          alerts.push({
            id: `depot-${m.id}`,
            text: `${m.nom} — Echéance dépôt dans ${days} jour${days > 1 ? 's' : ''}`,
            color: COLORS.orange,
            route: `/marches/${m.id}`,
          });
        }
      }

      // Attribution prevue within 3 months
      if (m.dateAttributionPrevue && diffMonths(m.dateAttributionPrevue) >= 0 && diffMonths(m.dateAttributionPrevue) <= 3) {
        const days = diffDays(m.dateAttributionPrevue);
        if (days >= 0) {
          alerts.push({
            id: `attrib-${m.id}`,
            text: `${m.nom} — Attribution prévue dans ${days} jour${days > 1 ? 's' : ''}`,
            color: COLORS.blue,
            route: `/marches/${m.id}`,
          });
        }
      }

      // Analyse en retard
      const meta = marcheMeta?.getMeta(m.id) || {};
      const progression = meta.progression ?? m.progression ?? 0;
      if (m.statut === 'analyse' && progression < 50) {
        alerts.push({
          id: `retard-${m.id}`,
          text: `${m.nom} — Analyse en retard (${progression}%)`,
          color: COLORS.yellow,
          route: `/marches/${m.id}/analyse`,
        });
      }
    });

    formations.forEach((f) => {
      // Formation echeance within 6 months
      if (f.dateEcheance && diffMonths(f.dateEcheance) >= 0 && diffMonths(f.dateEcheance) <= 6) {
        alerts.push({
          id: `formation-${f.id}`,
          text: `${f.nom} — Formation à renouveler`,
          color: COLORS.red,
          route: '/formations',
        });
      }
    });

    return alerts;
  }, [marcheMeta]);

  const count = notifications.length;

  return (
    <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
      {/* Bell button */}
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          position: 'relative',
          padding: 4,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 6,
          transition: 'background .15s',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(15,23,42,.06)')}
        onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
        aria-label="Notifications"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {count > 0 && (
          <span
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              background: COLORS.red,
              color: '#fff',
              fontSize: 10,
              fontWeight: 700,
              lineHeight: 1,
              minWidth: 16,
              height: 16,
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0 4px',
              transform: 'translate(4px, -4px)',
            }}
          >
            {count > 99 ? '99+' : count}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <>
          {/* Backdrop to close on outside click */}
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 999 }}
            onClick={() => setOpen(false)}
          />
          <div
            style={{
              position: 'fixed',
              top: 56,
              right: 16,
              zIndex: 1000,
              width: 360,
              maxHeight: 400,
              overflowY: 'auto',
              background: '#FFFFFF',
              border: '1px solid rgba(15,23,42,.1)',
              borderRadius: 12,
              boxShadow: '0 8px 24px rgba(15,23,42,.12)',
            }}
          >
            {/* Header */}
            <div
              style={{
                padding: '14px 16px 10px',
                borderBottom: '1px solid rgba(15,23,42,.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <span style={{ fontWeight: 600, fontSize: 13, color: '#0F172A' }}>
                Notifications
              </span>
              <span
                style={{
                  fontSize: 11,
                  color: '#64748B',
                  background: '#F1F5F9',
                  borderRadius: 10,
                  padding: '2px 8px',
                  fontWeight: 500,
                }}
              >
                {count}
              </span>
            </div>

            {/* Items */}
            {count === 0 ? (
              <div
                style={{
                  padding: '32px 16px',
                  textAlign: 'center',
                  color: '#64748B',
                  fontSize: 13,
                }}
              >
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke={COLORS.green}
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ marginBottom: 8 }}
                >
                  <path d="M20 6 9 17l-5-5" />
                </svg>
                <div>Aucune alerte</div>
              </div>
            ) : (
              <div style={{ padding: '4px 0' }}>
                {notifications.map((n) => (
                  <button
                    key={n.id}
                    onClick={() => {
                      setOpen(false);
                      navigate(n.route);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 10,
                      width: '100%',
                      padding: '10px 16px',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'background .12s',
                      borderRadius: 0,
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#F8FAFC')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
                  >
                    {/* Colored dot */}
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        background: n.color,
                        flexShrink: 0,
                        marginTop: 4,
                      }}
                    />
                    <span style={{ fontSize: 12, color: '#334155', lineHeight: 1.4 }}>
                      {n.text}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
