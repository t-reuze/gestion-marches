import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const DEFAULT_SHORTCUTS = {
  globalSearch: 'ctrl+k',
  toggleSidebar: 'ctrl+b',
};

const SHORTCUT_LABELS = {
  globalSearch: 'Recherche globale',
  toggleSidebar: 'Afficher/masquer la sidebar',
};

const ShortcutsCtx = createContext(null);

export function ShortcutsProvider({ children }) {
  const [shortcuts, setShortcuts] = useState(() => {
    try {
      const saved = localStorage.getItem('gm-shortcuts');
      return saved ? { ...DEFAULT_SHORTCUTS, ...JSON.parse(saved) } : DEFAULT_SHORTCUTS;
    } catch { return DEFAULT_SHORTCUTS; }
  });

  // Recherche globale : état open/close partagé
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem('gm-shortcuts', JSON.stringify(shortcuts));
  }, [shortcuts]);

  const updateShortcut = useCallback((key, value) => {
    setShortcuts(prev => ({ ...prev, [key]: value }));
  }, []);

  const resetShortcuts = useCallback(() => {
    setShortcuts(DEFAULT_SHORTCUTS);
  }, []);

  return (
    <ShortcutsCtx.Provider value={{
      shortcuts, updateShortcut, resetShortcuts,
      SHORTCUT_LABELS, DEFAULT_SHORTCUTS,
      searchOpen, setSearchOpen,
    }}>
      {children}
    </ShortcutsCtx.Provider>
  );
}

export function useShortcuts() {
  return useContext(ShortcutsCtx);
}

/**
 * Vérifie si un événement clavier correspond à un raccourci défini.
 * Format raccourci : "ctrl+k", "alt+s", "shift+f", etc.
 */
export function matchesShortcut(e, shortcutStr) {
  if (!shortcutStr) return false;
  const parts = shortcutStr.toLowerCase().split('+').map(s => s.trim());
  const key = parts[parts.length - 1];
  const needCtrl = parts.includes('ctrl') || parts.includes('cmd');
  const needAlt = parts.includes('alt');
  const needShift = parts.includes('shift');

  if ((e.ctrlKey || e.metaKey) !== needCtrl) return false;
  if (e.altKey !== needAlt) return false;
  if (e.shiftKey !== needShift) return false;
  return e.key.toLowerCase() === key;
}
