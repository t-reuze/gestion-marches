import { createContext, useContext, useState } from 'react';
import { DEFAULT_TEMPLATES } from '../data/sourcingTemplates';

const LS_KEY = 'gm-sourcing-templates';
const Ctx = createContext(null);
export const useSourcingTemplates = () => useContext(Ctx);

function genId() { return 'tpl-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

export function SourcingTemplatesProvider({ children }) {
  const [userTemplates, setUserTemplates] = useState(() => {
    try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]'); } catch { return []; }
  });

  function persist(next) {
    setUserTemplates(next);
    try { localStorage.setItem(LS_KEY, JSON.stringify(next)); } catch (_) {}
  }

  function allTemplates() {
    return [...DEFAULT_TEMPLATES, ...userTemplates];
  }

  function getTemplate(id) {
    return allTemplates().find(t => t.id === id) || null;
  }

  function saveAsNewTemplate(nom, sections) {
    const tpl = { id: genId(), nom: nom.trim(), type: 'custom', sections };
    persist([...userTemplates, tpl]);
    return tpl;
  }

  function overwriteTemplate(id, nom, sections) {
    const idx = userTemplates.findIndex(t => t.id === id);
    if (idx < 0) return null;
    const updated = { ...userTemplates[idx], nom: nom.trim(), sections };
    const next = [...userTemplates];
    next[idx] = updated;
    persist(next);
    return updated;
  }

  function deleteTemplate(id) {
    persist(userTemplates.filter(t => t.id !== id));
  }

  return (
    <Ctx.Provider value={{ userTemplates, allTemplates, getTemplate, saveAsNewTemplate, overwriteTemplate, deleteTemplate }}>
      {children}
    </Ctx.Provider>
  );
}
