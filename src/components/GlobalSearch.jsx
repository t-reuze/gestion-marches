import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { marches, formations, clccs } from '../data/mockData';
import { useNewMarches } from '../context/NewMarchesContext';
import { useNewFormations } from '../context/NewFormationsContext';
import { useShortcuts, matchesShortcut } from '../context/ShortcutsContext';

const MAX_PER_CATEGORY = 5;

const icons = {
  marches: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="16" y1="13" x2="8" y2="13"/>
      <line x1="16" y1="17" x2="8" y2="17"/>
      <polyline points="10 9 9 9 8 9"/>
    </svg>
  ),
  formations: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
      <path d="M6 12v5c0 2 4 3 6 3s6-1 6-3v-5"/>
    </svg>
  ),
  contacts: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
};

function highlight(text, query) {
  if (!query) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark style={{ background: '#dbeafe', color: '#1e40af', borderRadius: 2, padding: '0 1px' }}>
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </>
  );
}

export default function GlobalSearch() {
  const { shortcuts, searchOpen: open, setSearchOpen: setOpen } = useShortcuts();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);
  const navigate = useNavigate();

  const { newMarches } = useNewMarches() || { newMarches: [] };
  const { newFormations } = useNewFormations() || { newFormations: [] };

  // Keyboard shortcut (configurable)
  useEffect(() => {
    function onKeyDown(e) {
      if (matchesShortcut(e, shortcuts.globalSearch)) {
        e.preventDefault();
        setOpen(prev => !prev);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [shortcuts.globalSearch, setOpen]);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const allMarches = useMemo(() => {
    const ids = new Set(marches.map(m => m.id));
    return [...marches, ...(newMarches || []).filter(m => !ids.has(m.id))];
  }, [newMarches]);

  const allFormations = useMemo(() => {
    const ids = new Set(formations.map(f => f.id));
    return [...formations, ...(newFormations || []).filter(f => !ids.has(f.id))];
  }, [newFormations]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];

    const matchedMarches = allMarches
      .filter(m =>
        m.nom?.toLowerCase().includes(q) ||
        m.reference?.toLowerCase().includes(q) ||
        m.secteur?.toLowerCase().includes(q)
      )
      .slice(0, MAX_PER_CATEGORY)
      .map(m => ({
        type: 'marches',
        id: m.id,
        title: m.nom,
        subtitle: [m.reference, m.secteur, m.statut].filter(Boolean).join(' - '),
        path: `/marche/${m.id}`,
      }));

    const matchedFormations = allFormations
      .filter(f =>
        f.nom?.toLowerCase().includes(q) ||
        f.responsablePedagogique?.toLowerCase().includes(q)
      )
      .slice(0, MAX_PER_CATEGORY)
      .map(f => ({
        type: 'formations',
        id: f.id,
        title: f.nom,
        subtitle: f.responsablePedagogique ? `Resp. ${f.responsablePedagogique}` : '',
        path: `/formations/${f.id}`,
      }));

    const matchedContacts = (clccs || [])
      .filter(c => {
        const contactNames = (c.contacts || []).map(ct => `${ct.prenom} ${ct.nom} ${ct.fonction}`).join(' ').toLowerCase();
        return (
          c.nom?.toLowerCase().includes(q) ||
          c.ville?.toLowerCase().includes(q) ||
          contactNames.includes(q)
        );
      })
      .slice(0, MAX_PER_CATEGORY)
      .map(c => ({
        type: 'contacts',
        id: c.id,
        title: c.nom,
        subtitle: [c.ville, ...(c.contacts || []).map(ct => `${ct.prenom} ${ct.nom}`)].filter(Boolean).join(' - '),
        path: '/contacts',
      }));

    return [...matchedMarches, ...matchedFormations, ...matchedContacts];
  }, [query, allMarches, allFormations]);

  // Reset selection when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [results.length, query]);

  const goTo = useCallback((path) => {
    setOpen(false);
    navigate(path);
  }, [navigate]);

  // Keyboard navigation inside modal
  const onInputKeyDown = useCallback((e) => {
    if (e.key === 'Escape') {
      setOpen(false);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(i => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && results[selectedIndex]) {
      e.preventDefault();
      goTo(results[selectedIndex].path);
    }
  }, [results, selectedIndex, goTo]);

  // Group results by type for display
  const grouped = useMemo(() => {
    const groups = {};
    results.forEach((r, flatIndex) => {
      if (!groups[r.type]) groups[r.type] = [];
      groups[r.type].push({ ...r, flatIndex });
    });
    return groups;
  }, [results]);

  const categoryLabels = {
    marches: 'Marches',
    formations: 'Formations',
    contacts: 'Contacts',
  };

  if (!open) return null;

  return (
    <div
      className="global-search-overlay"
      onClick={() => setOpen(false)}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-start',
        paddingTop: '12vh',
        background: 'rgba(0,0,0,0.45)',
        backdropFilter: 'blur(4px)',
        animation: 'gsOverlayIn .18s ease-out',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 560,
          background: '#fff',
          borderRadius: 14,
          boxShadow: '0 25px 60px rgba(0,0,0,.25)',
          overflow: 'hidden',
          animation: 'gsCardIn .2s ease-out',
        }}
      >
        {/* Search input */}
        <div style={{ display: 'flex', alignItems: 'center', padding: '14px 18px', borderBottom: '1px solid #e5e7eb', gap: 10 }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={onInputKeyDown}
            placeholder="Rechercher un marche, une formation, un contact..."
            style={{
              flex: 1,
              border: 'none',
              outline: 'none',
              fontSize: 15,
              fontFamily: 'inherit',
              background: 'transparent',
              color: '#1f2937',
            }}
          />
          <kbd style={{
            fontSize: 11,
            padding: '2px 6px',
            borderRadius: 4,
            background: '#f3f4f6',
            border: '1px solid #d1d5db',
            color: '#6b7280',
            fontFamily: 'inherit',
            lineHeight: '18px',
          }}>
            Esc
          </kbd>
        </div>

        {/* Results */}
        <div style={{ maxHeight: 380, overflowY: 'auto', padding: '6px 0' }}>
          {query.trim() && results.length === 0 && (
            <div style={{ padding: '28px 18px', textAlign: 'center', color: '#9ca3af', fontSize: 14 }}>
              Aucun resultat pour "{query}"
            </div>
          )}

          {Object.entries(grouped).map(([type, items]) => (
            <div key={type}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '8px 18px 4px',
                fontSize: 11, fontWeight: 600, textTransform: 'uppercase',
                color: '#6b7280', letterSpacing: '.5px',
              }}>
                {icons[type]}
                {categoryLabels[type]}
              </div>
              {items.map(item => {
                const isSelected = item.flatIndex === selectedIndex;
                return (
                  <button
                    key={`${item.type}-${item.id}`}
                    onClick={() => goTo(item.path)}
                    onMouseEnter={() => setSelectedIndex(item.flatIndex)}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      width: '100%',
                      textAlign: 'left',
                      padding: '8px 18px',
                      margin: '1px 6px',
                      borderRadius: 8,
                      border: 'none',
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                      background: isSelected ? '#eff6ff' : 'transparent',
                      outline: isSelected ? '2px solid #3b82f6' : 'none',
                      transition: 'background .1s, outline .1s',
                      width: 'calc(100% - 12px)',
                    }}
                  >
                    <span style={{ fontSize: 14, fontWeight: 500, color: isSelected ? '#1d4ed8' : '#1f2937' }}>
                      {highlight(item.title, query)}
                    </span>
                    {item.subtitle && (
                      <span style={{ fontSize: 12, color: '#9ca3af', marginTop: 1 }}>
                        {highlight(item.subtitle, query)}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}

          {!query.trim() && (
            <div style={{ padding: '28px 18px', textAlign: 'center', color: '#9ca3af', fontSize: 14 }}>
              Commencez a taper pour rechercher...
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '8px 18px',
          borderTop: '1px solid #e5e7eb',
          fontSize: 12, color: '#9ca3af',
        }}>
          <div style={{ display: 'flex', gap: 12 }}>
            <span><kbd style={kbdStyle}>↑↓</kbd> naviguer</span>
            <span><kbd style={kbdStyle}>Enter</kbd> ouvrir</span>
            <span><kbd style={kbdStyle}>Esc</kbd> fermer</span>
          </div>
          <span style={{ opacity: 0.7 }}>{(shortcuts.globalSearch || 'ctrl+k').replace('+', '+').toUpperCase()}</span>
        </div>
      </div>

      {/* Animations */}
      <style>{`
        @keyframes gsOverlayIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes gsCardIn {
          from { opacity: 0; transform: scale(.97) translateY(-8px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>
  );
}

const kbdStyle = {
  fontSize: 11,
  padding: '1px 5px',
  borderRadius: 3,
  background: '#f3f4f6',
  border: '1px solid #d1d5db',
  fontFamily: 'inherit',
};
