import { createContext, useContext, useState } from 'react';

const Ctx = createContext(null);
export const useNewMarches = () => useContext(Ctx);

const STORAGE_KEY = 'gm-new-marches';

export function NewMarchesProvider({ children }) {
  const [items, setItems] = useState(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; }
  });

  function persist(next) {
    setItems(next);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch (_) {}
  }

  function addMarche(data) {
    const id = data.id || ('m-' + Date.now().toString(36));
    const marche = {
      id,
      reference: data.reference || '',
      nom: data.nom || '',
      secteur: data.secteur,
      description: data.description || '',
      statut: data.statut || 'ouvert',
      dateOuverture: data.dateOuverture || '',
      dateLimiteDepot: data.dateLimiteDepot || '',
      dateAttributionPrevue: '',
      responsable: data.responsable || '',
      service: data.service || '',
      nbLots: 0,
      nbOffresRecues: 0,
      hasAnalyse: false,
      hasReporting: false,
      budgetEstime: data.budgetEstime || '',
      progression: 0,
      tags: data.tags || [],
      __userAdded: true,
    };
    persist([...items, marche]);
    return marche;
  }

  function removeMarche(id) {
    persist(items.filter(m => m.id !== id));
  }

  function updateMarche(id, patch) {
    persist(items.map(m => m.id === id ? { ...m, ...patch } : m));
  }

  return <Ctx.Provider value={{ newMarches: items, addMarche, removeMarche, updateMarche }}>{children}</Ctx.Provider>;
}
