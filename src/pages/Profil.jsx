import { useState, useMemo, useEffect } from 'react';
import Layout from '../components/Layout';
import { useShortcuts } from '../context/ShortcutsContext';
import { useMarcheMeta } from '../context/MarcheMetaContext';
import { marches, formations, formatDate } from '../data/mockData';

const LS_THEME = 'gm-theme';
const LS_PROFIL = 'gm-profil';

function ShortcutInput({ value, onChange }) {
  const [recording, setRecording] = useState(false);
  function handleKeyDown(e) {
    if (!recording) return;
    e.preventDefault(); e.stopPropagation();
    const parts = [];
    if (e.ctrlKey || e.metaKey) parts.push('ctrl');
    if (e.altKey) parts.push('alt');
    if (e.shiftKey) parts.push('shift');
    const key = e.key.toLowerCase();
    if (['control', 'meta', 'alt', 'shift'].includes(key)) return;
    parts.push(key);
    onChange(parts.join('+'));
    setRecording(false);
  }
  return (
    <input readOnly value={recording ? 'Appuyez...' : value.toUpperCase().replace(/\+/g, ' + ')}
      onFocus={() => setRecording(true)} onBlur={() => setRecording(false)} onKeyDown={handleKeyDown}
      style={{
        width: 160, padding: '6px 10px', borderRadius: 6, fontSize: 12, fontWeight: 600,
        border: recording ? '2px solid #3b82f6' : '1px solid #d1d5db',
        background: recording ? '#eff6ff' : '#f9fafb', color: recording ? '#3b82f6' : '#1f2937',
        cursor: 'pointer', outline: 'none', fontFamily: 'inherit',
      }} />
  );
}

function daysUntil(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  const now = new Date();
  return Math.ceil((d - now) / (1000 * 60 * 60 * 24));
}

export default function Profil() {
  const { shortcuts, updateShortcut, resetShortcuts, SHORTCUT_LABELS, DEFAULT_SHORTCUTS } = useShortcuts();
  const { getMeta } = useMarcheMeta();

  const [profil, setProfil] = useState(() => {
    try { return JSON.parse(localStorage.getItem(LS_PROFIL)) || {}; } catch { return {}; }
  });
  const [theme, setTheme] = useState(() => localStorage.getItem(LS_THEME) || 'light');

  const updateProfil = (key, val) => {
    const next = { ...profil, [key]: val };
    setProfil(next);
    localStorage.setItem(LS_PROFIL, JSON.stringify(next));
  };

  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    localStorage.setItem(LS_THEME, next);
    document.documentElement.setAttribute('data-theme', next);
  };

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, []);

  // Marchés avec deadlines
  const marchesAvecDeadline = useMemo(() => {
    return marches
      .map(m => {
        const meta = getMeta(m.id);
        const statut = meta.statut || m.statut;
        if (statut === 'cloture') return null;
        const deadline = m.dateLimiteDepot || m.dateAttributionPrevue;
        const days = daysUntil(deadline);
        return { ...m, ...meta, deadline, days, statut };
      })
      .filter(Boolean)
      .sort((a, b) => {
        if (a.days === null && b.days === null) return 0;
        if (a.days === null) return 1;
        if (b.days === null) return -1;
        return a.days - b.days;
      });
  }, [getMeta]);

  const urgents = marchesAvecDeadline.filter(m => m.days !== null && m.days <= 30);
  const initials = (profil.nom || 'U').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <Layout title="Mon Profil">
      <div style={{ maxWidth: 750, margin: '0 auto' }}>

        {/* Header profil */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 20, marginBottom: 28,
          padding: 24, background: 'linear-gradient(135deg, #001E45 0%, #0a3d7a 100%)',
          borderRadius: 16, color: '#fff',
        }}>
          <div style={{
            width: 64, height: 64, borderRadius: '50%', flexShrink: 0,
            background: 'rgba(255,255,255,.15)', border: '2px solid rgba(255,255,255,.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 24, fontWeight: 700,
          }}>
            {initials}
          </div>
          <div style={{ flex: 1 }}>
            <input value={profil.nom || ''} placeholder="Votre nom..."
              onChange={e => updateProfil('nom', e.target.value)}
              style={{
                background: 'transparent', border: 'none', borderBottom: '1px solid rgba(255,255,255,.3)',
                color: '#fff', fontSize: 20, fontWeight: 700, fontFamily: 'inherit', outline: 'none', width: '100%',
                padding: '2px 0',
              }} />
            <input value={profil.role || ''} placeholder="Fonction / Service..."
              onChange={e => updateProfil('role', e.target.value)}
              style={{
                background: 'transparent', border: 'none', borderBottom: '1px solid rgba(255,255,255,.15)',
                color: 'rgba(255,255,255,.7)', fontSize: 13, fontFamily: 'inherit', outline: 'none', width: '100%',
                padding: '2px 0', marginTop: 4,
              }} />
            <input value={profil.email || ''} placeholder="Email..."
              onChange={e => updateProfil('email', e.target.value)}
              style={{
                background: 'transparent', border: 'none',
                color: 'rgba(255,255,255,.5)', fontSize: 12, fontFamily: 'inherit', outline: 'none', width: '100%',
                padding: '2px 0', marginTop: 2,
              }} />
          </div>
        </div>

        {/* Deadlines urgentes */}
        {urgents.length > 0 && (
          <div style={{
            marginBottom: 20, borderRadius: 12, overflow: 'hidden',
            border: '1px solid #fecaca', background: '#fef2f2',
          }}>
            <div style={{ padding: '10px 16px', fontWeight: 700, fontSize: 14, color: '#991b1b' }}>
              Echeances a venir ({urgents.length})
            </div>
            {urgents.map(m => (
              <div key={m.id} style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '8px 16px',
                borderTop: '1px solid #fecaca', fontSize: 12,
              }}>
                <span style={{
                  padding: '2px 8px', borderRadius: 4, fontWeight: 700, fontSize: 11,
                  background: m.days <= 0 ? '#dc2626' : m.days <= 7 ? '#f59e0b' : '#3b82f6',
                  color: '#fff',
                }}>
                  {m.days <= 0 ? 'DEPASSEE' : `J-${m.days}`}
                </span>
                <span style={{ fontWeight: 600, color: '#111827', flex: 1 }}>{m.nom}</span>
                <span style={{ color: '#6b7280' }}>{formatDate(m.deadline)}</span>
              </div>
            ))}
          </div>
        )}

        {/* Marchés affectés */}
        <div style={{
          marginBottom: 20, borderRadius: 12, overflow: 'hidden',
          border: '1px solid #e5e7eb', background: '#fff',
        }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid #e5e7eb' }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: 0 }}>
              Marches ({marchesAvecDeadline.length} actifs)
            </h2>
          </div>
          <div style={{ maxHeight: 300, overflowY: 'auto' }}>
            {marchesAvecDeadline.map(m => (
              <div key={m.id} style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '8px 20px',
                borderBottom: '1px solid #f3f4f6', fontSize: 12,
              }}>
                <span style={{
                  width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                  background: { sourcing: '#0EA5E9', ouvert: '#3B82F6', analyse: '#F59E0B', attribution: '#8B5CF6', reporting: '#64748B' }[m.statut] || '#9CA3AF',
                }} />
                <span style={{ flex: 1, fontWeight: 500, color: '#111827' }}>{m.nom}</span>
                {m.responsable && <span style={{ color: '#9ca3af', fontSize: 11 }}>{m.responsable.split(' ')[0]}</span>}
                {m.deadline && (
                  <span style={{
                    fontSize: 10, padding: '1px 6px', borderRadius: 4,
                    background: m.days !== null && m.days <= 30 ? '#fef3c7' : '#f3f4f6',
                    color: m.days !== null && m.days <= 30 ? '#92400e' : '#6b7280',
                  }}>
                    {formatDate(m.deadline)}
                    {m.days !== null && m.days > 0 && ` (J-${m.days})`}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Theme */}
        <div style={{
          marginBottom: 20, borderRadius: 12, overflow: 'hidden',
          border: '1px solid #e5e7eb', background: '#fff',
        }}>
          <div style={{
            padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: 0 }}>Apparence</h2>
              <p style={{ fontSize: 13, color: '#6b7280', margin: '4px 0 0' }}>Theme {theme === 'dark' ? 'sombre' : 'clair'}</p>
            </div>
            <button onClick={toggleTheme} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600,
              border: '1px solid #d1d5db', background: theme === 'dark' ? '#1f2937' : '#f9fafb',
              color: theme === 'dark' ? '#f9fafb' : '#374151',
              cursor: 'pointer', fontFamily: 'inherit', transition: 'all .2s',
            }}>
              {theme === 'dark' ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
              )}
              {theme === 'dark' ? 'Mode clair' : 'Mode sombre'}
            </button>
          </div>
        </div>

        {/* Raccourcis clavier */}
        <div style={{
          marginBottom: 20, background: '#fff', borderRadius: 12,
          border: '1px solid #e5e7eb', overflow: 'hidden',
        }}>
          <div style={{
            padding: '14px 20px', borderBottom: '1px solid #e5e7eb',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: 0 }}>Raccourcis clavier</h2>
            <button onClick={resetShortcuts} style={{
              padding: '4px 12px', borderRadius: 6, border: '1px solid #d1d5db',
              background: '#f9fafb', color: '#374151', fontSize: 11, fontWeight: 600,
              cursor: 'pointer', fontFamily: 'inherit',
            }}>Reinitialiser</button>
          </div>
          <div style={{ padding: '4px 0' }}>
            {Object.entries(SHORTCUT_LABELS).map(([key, label]) => (
              <div key={key} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '10px 20px', borderBottom: '1px solid #f3f4f6',
              }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: '#111827' }}>{label}</div>
                <ShortcutInput value={shortcuts[key] || ''} onChange={val => updateShortcut(key, val)} />
              </div>
            ))}
            {[
              { label: 'Navigation onglets', shortcut: '1 - 8' },
              { label: 'Fermer modal', shortcut: 'ESC' },
            ].map((item, i) => (
              <div key={i} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '10px 20px', borderBottom: '1px solid #f3f4f6',
              }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: '#9ca3af' }}>{item.label}</div>
                <kbd style={{
                  padding: '4px 12px', borderRadius: 6, background: '#f3f4f6', border: '1px solid #d1d5db',
                  fontSize: 12, fontWeight: 600, color: '#374151', fontFamily: 'inherit',
                }}>{item.shortcut}</kbd>
              </div>
            ))}
          </div>
        </div>

      </div>
    </Layout>
  );
}
