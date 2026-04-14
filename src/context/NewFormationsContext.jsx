import { createContext, useContext, useState } from 'react';

const Ctx = createContext(null);
export const useNewFormations = () => useContext(Ctx);

const STORAGE_KEY = 'gm-new-formations';

export function NewFormationsProvider({ children }) {
  const [items, setItems] = useState(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; }
  });

  function persist(next) {
    setItems(next);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch (_) {}
  }

  function addFormation(data) {
    const id = data.id || ('f-' + Date.now().toString(36));
    const formation = {
      id,
      nom: data.nom || '',
      dateEcheance: data.dateEcheance || '',
      renouvellement: data.renouvellement || false,
      responsablePedagogique: data.responsablePedagogique || '',
      contact: data.contact || '',
      commentaires: data.commentaires || '',
      __userAdded: true,
    };
    persist([...items, formation]);
    return formation;
  }

  function removeFormation(id) {
    persist(items.filter(f => f.id !== id));
  }

  return <Ctx.Provider value={{ newFormations: items, addFormation, removeFormation }}>{children}</Ctx.Provider>;
}
