import { useState } from 'react';
import Layout from '../components/Layout';
import { useShortcuts } from '../context/ShortcutsContext';

function ShortcutInput({ value, onChange }) {
  const [recording, setRecording] = useState(false);

  function handleKeyDown(e) {
    if (!recording) return;
    e.preventDefault();
    e.stopPropagation();

    const parts = [];
    if (e.ctrlKey || e.metaKey) parts.push('ctrl');
    if (e.altKey) parts.push('alt');
    if (e.shiftKey) parts.push('shift');

    const key = e.key.toLowerCase();
    // Ignorer les touches modificateurs seules
    if (['control', 'meta', 'alt', 'shift'].includes(key)) return;

    parts.push(key);
    onChange(parts.join('+'));
    setRecording(false);
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <input
        readOnly
        value={recording ? 'Appuyez sur une touche...' : value.toUpperCase().replace(/\+/g, ' + ')}
        onFocus={() => setRecording(true)}
        onBlur={() => setRecording(false)}
        onKeyDown={handleKeyDown}
        style={{
          width: 200, padding: '8px 12px', borderRadius: 8,
          border: recording ? '2px solid #3b82f6' : '1px solid #d1d5db',
          background: recording ? '#eff6ff' : '#f9fafb',
          fontSize: 13, fontFamily: 'inherit', fontWeight: 600,
          color: recording ? '#3b82f6' : '#1f2937',
          cursor: 'pointer', outline: 'none',
          transition: 'all .15s',
        }}
      />
      {recording && (
        <span style={{ fontSize: 11, color: '#6b7280' }}>
          Combinaison de touches...
        </span>
      )}
    </div>
  );
}

export default function Profil() {
  const { shortcuts, updateShortcut, resetShortcuts, SHORTCUT_LABELS, DEFAULT_SHORTCUTS } = useShortcuts();

  return (
    <Layout title="Profil & Raccourcis">
      <div style={{ maxWidth: 700, margin: '0 auto' }}>

        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 16, marginBottom: 32,
          padding: 24, background: 'linear-gradient(135deg, #001E45 0%, #0a3d7a 100%)',
          borderRadius: 16, color: '#fff',
        }}>
          <div style={{
            width: 56, height: 56, borderRadius: '50%',
            background: 'rgba(255,255,255,.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 22, fontWeight: 700,
          }}>
            U
          </div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700 }}>Utilisateur</div>
            <div style={{ fontSize: 13, opacity: .7 }}>Unicancer - Gestion des Marches</div>
          </div>
        </div>

        {/* Raccourcis clavier */}
        <div style={{
          background: '#fff', borderRadius: 12,
          border: '1px solid #e5e7eb', overflow: 'hidden',
        }}>
          <div style={{
            padding: '16px 20px', borderBottom: '1px solid #e5e7eb',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: 0 }}>
                Raccourcis clavier
              </h2>
              <p style={{ fontSize: 13, color: '#6b7280', margin: '4px 0 0' }}>
                Cliquez sur un raccourci pour le modifier, puis appuyez sur la nouvelle combinaison.
              </p>
            </div>
            <button
              onClick={resetShortcuts}
              style={{
                padding: '6px 14px', borderRadius: 8,
                border: '1px solid #d1d5db', background: '#f9fafb',
                color: '#374151', fontSize: 12, fontWeight: 600,
                cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              Reinitialiser
            </button>
          </div>

          <div style={{ padding: '8px 0' }}>
            {Object.entries(SHORTCUT_LABELS).map(([key, label]) => (
              <div key={key} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '14px 20px',
                borderBottom: '1px solid #f3f4f6',
              }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500, color: '#111827' }}>{label}</div>
                  <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>
                    Par defaut : {DEFAULT_SHORTCUTS[key]?.toUpperCase().replace(/\+/g, ' + ')}
                  </div>
                </div>
                <ShortcutInput
                  value={shortcuts[key] || ''}
                  onChange={val => updateShortcut(key, val)}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Raccourcis fixes (non modifiables) */}
        <div style={{
          marginTop: 20, background: '#fff', borderRadius: 12,
          border: '1px solid #e5e7eb', overflow: 'hidden',
        }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #e5e7eb' }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: 0 }}>
              Raccourcis fixes
            </h2>
            <p style={{ fontSize: 13, color: '#6b7280', margin: '4px 0 0' }}>
              Ces raccourcis ne sont pas modifiables.
            </p>
          </div>
          <div style={{ padding: '8px 0' }}>
            {[
              { label: 'Navigation entre onglets', shortcut: '1 - 8', desc: 'Sur une page marche, appuyez sur le numero de l\'onglet' },
              { label: 'Fermer un modal', shortcut: 'ESC', desc: 'Ferme le modal ou panneau actif' },
            ].map((item, i) => (
              <div key={i} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '14px 20px', borderBottom: '1px solid #f3f4f6',
              }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500, color: '#111827' }}>{item.label}</div>
                  <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>{item.desc}</div>
                </div>
                <kbd style={{
                  padding: '6px 14px', borderRadius: 8,
                  background: '#f3f4f6', border: '1px solid #d1d5db',
                  fontSize: 13, fontWeight: 600, color: '#374151',
                  fontFamily: 'inherit',
                }}>
                  {item.shortcut}
                </kbd>
              </div>
            ))}
          </div>
        </div>

      </div>
    </Layout>
  );
}
