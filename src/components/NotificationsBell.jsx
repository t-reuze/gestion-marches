import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { marches, formations } from '../data/mockData';
import { useMarcheMeta } from '../context/MarcheMetaContext';

const COLORS = {
  orange: '#E8501A',
  blue: '#2D5F8A',
  red: '#DC2626',
  green: '#16A34A',
  yellow: '#D97706',
};

const STORAGE_KEY = 'gm-dismissed-notifications';

function getDismissed() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; }
}

function saveDismissed(ids) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(ids)); } catch {}
}

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
  const [dismissed, setDismissed] = useState(getDismissed);
  const navigate = useNavigate();
  const marcheMeta = useMarcheMeta();

  const allAlerts = useMemo(() => {
    const alerts = [];

    marches.forEach(m => {
      if (m.dateLimiteDepot && diffMonths(m.dateLimiteDepot) >= 0 && diffMonths(m.dateLimiteDepot) <= 3) {
        const days = diffDays(m.dateLimiteDepot);
        if (days >= 0) {
          alerts.push({
            id: 'depot-' + m.id,
            text: m.nom + ' \u2014 \u00c9ch\u00e9ance d\u00e9p\u00f4t dans ' + days + ' jour' + (days > 1 ? 's' : ''),
            color: COLORS.orange,
            route: '/marche/' + m.id + '/infos',
          });
        }
      }

      if (m.dateAttributionPrevue && diffMonths(m.dateAttributionPrevue) >= 0 && diffMonths(m.dateAttributionPrevue) <= 3) {
        const days = diffDays(m.dateAttributionPrevue);
        if (days >= 0) {
          alerts.push({
            id: 'attrib-' + m.id,
            text: m.nom + ' \u2014 Attribution pr\u00e9vue dans ' + days + ' jour' + (days > 1 ? 's' : ''),
            color: COLORS.blue,
            route: '/marche/' + m.id + '/infos',
          });
        }
      }

      const meta = marcheMeta?.getMeta(m.id) || {};
      const progression = meta.progression ?? m.progression ?? 0;
      if (m.statut === 'analyse' && progression < 50) {
        alerts.push({
          id: 'retard-' + m.id,
          text: m.nom + ' \u2014 Analyse en retard (' + progression + '%)',
          color: COLORS.yellow,
          route: '/marche/' + m.id + '/analyse',
        });
      }
    });

    formations.forEach(f => {
      if (f.dateEcheance && diffMonths(f.dateEcheance) >= 0 && diffMonths(f.dateEcheance) <= 6) {
        alerts.push({
          id: 'formation-' + f.id,
          text: f.nom + ' \u2014 Formation \u00e0 renouveler',
          color: COLORS.red,
          route: '/formations/' + f.id,
        });
      }
    });

    return alerts;
  }, [marcheMeta]);

  const notifications = allAlerts.filter(n => !dismissed.includes(n.id));
  const count = notifications.length;

  const dismiss = useCallback((id, e) => {
    e.stopPropagation();
    const updated = [...dismissed, id];
    setDismissed(updated);
    saveDismissed(updated);
  }, [dismissed]);

  const clearAll = useCallback(() => {
    const allIds = notifications.map(n => n.id);
    const updated = [...dismissed, ...allIds];
    setDismissed(updated);
    saveDismissed(updated);
  }, [dismissed, notifications]);

  return (
    <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          position: 'relative', padding: 4, display: 'inline-flex',
          alignItems: 'center', justifyContent: 'center', borderRadius: 6,
          transition: 'background .15s',
        }}
        onMouseEnter={e => e.currentTarget.style.background = 'rgba(15,23,42,.06)'}
        onMouseLeave={e => e.currentTarget.style.background = 'none'}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {count > 0 && (
          <span style={{
            position: 'absolute', top: 0, right: 0,
            background: COLORS.red, color: '#fff',
            fontSize: 10, fontWeight: 700, lineHeight: 1,
            minWidth: 16, height: 16, borderRadius: 8,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '0 4px', transform: 'translate(4px, -4px)',
          }}>
            {count > 99 ? '99+' : count}
          </span>
        )}
      </button>

      {open && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 999 }} onClick={() => setOpen(false)} />
          <div style={{
            position: 'fixed', top: 56, right: 16, zIndex: 1000,
            width: 380, maxHeight: 420, overflowY: 'auto',
            background: '#FFFFFF', border: '1px solid rgba(15,23,42,.1)',
            borderRadius: 12, boxShadow: '0 8px 24px rgba(15,23,42,.12)',
          }}>
            <div style={{
              padding: '14px 16px 10px', borderBottom: '1px solid rgba(15,23,42,.08)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <span style={{ fontWeight: 600, fontSize: 13, color: '#0F172A' }}>Notifications</span>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {count > 0 && (
                  <button
                    onClick={clearAll}
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      fontSize: 11, color: '#64748B', padding: '2px 6px',
                    }}
                    onMouseEnter={e => e.currentTarget.style.color = COLORS.orange}
                    onMouseLeave={e => e.currentTarget.style.color = '#64748B'}
                  >
                    Tout effacer
                  </button>
                )}
                <span style={{
                  fontSize: 11, color: '#64748B', background: '#F1F5F9',
                  borderRadius: 10, padding: '2px 8px', fontWeight: 500,
                }}>
                  {count}
                </span>
              </div>
            </div>

            {count === 0 ? (
              <div style={{ padding: '32px 16px', textAlign: 'center', color: '#64748B', fontSize: 13 }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={COLORS.green}
                  strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 8 }}>
                  <path d="M20 6 9 17l-5-5" />
                </svg>
                <div>Aucune alerte</div>
              </div>
            ) : (
              <div style={{ padding: '4px 0' }}>
                {notifications.map(n => (
                  <div
                    key={n.id}
                    onClick={() => { setOpen(false); navigate(n.route); }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      width: '100%', padding: '10px 16px', cursor: 'pointer',
                      transition: 'background .12s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = '#F8FAFC'}
                    onMouseLeave={e => e.currentTarget.style.background = 'none'}
                  >
                    <span style={{
                      width: 8, height: 8, borderRadius: '50%',
                      background: n.color, flexShrink: 0,
                    }} />
                    <span style={{ fontSize: 12, color: '#334155', lineHeight: 1.4, flex: 1 }}>
                      {n.text}
                    </span>
                    <button
                      onClick={e => dismiss(n.id, e)}
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: '#94A3B8', fontSize: 14, padding: '2px 4px',
                        borderRadius: 4, flexShrink: 0, lineHeight: 1,
                        transition: 'color .12s',
                      }}
                      onMouseEnter={e => e.currentTarget.style.color = '#EF4444'}
                      onMouseLeave={e => e.currentTarget.style.color = '#94A3B8'}
                      title="Ignorer cette alerte"
                    >
                      &#x2715;
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
