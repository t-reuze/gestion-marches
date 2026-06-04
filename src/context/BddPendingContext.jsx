import { createContext, useContext, useState } from 'react';

// ═══════════════════════════════════════════════════════════
// Lignes BDD en attente d'export, organisées par marché.
// Persistées en localStorage pour survivre aux rechargements.
// Structure : { [marcheId]: Array<{ bdd, source?, status?, warnings? }> }
// ═══════════════════════════════════════════════════════════

const STORAGE_KEY = 'gm-bdd-pending';

const Ctx = createContext(null);
export const useBddPending = () => useContext(Ctx);

function readStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeStorage(byMarche) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(byMarche));
  } catch (_) { /* quota dépassé : on garde en mémoire seulement */ }
}

export function BddPendingProvider({ children }) {
  const [byMarche, setByMarche] = useState(readStorage);

  function update(next) {
    setByMarche(next);
    writeStorage(next);
  }

  function addRows(marcheId, rows) {
    if (!marcheId || !rows?.length) return;
    const existing = byMarche[marcheId] || [];
    update({ ...byMarche, [marcheId]: [...existing, ...rows] });
  }

  function removeRow(marcheId, idx) {
    const list = byMarche[marcheId] || [];
    if (idx < 0 || idx >= list.length) return;
    const next = list.slice();
    next.splice(idx, 1);
    if (next.length === 0) {
      const copy = { ...byMarche };
      delete copy[marcheId];
      update(copy);
    } else {
      update({ ...byMarche, [marcheId]: next });
    }
  }

  function clearMarche(marcheId) {
    if (!(marcheId in byMarche)) return;
    const copy = { ...byMarche };
    delete copy[marcheId];
    update(copy);
  }

  function clearAll() {
    update({});
  }

  function getRows(marcheId) {
    return byMarche[marcheId] || [];
  }

  function getAllRows() {
    return Object.values(byMarche).flat();
  }

  function totalCount() {
    return Object.values(byMarche).reduce((s, arr) => s + arr.length, 0);
  }

  return (
    <Ctx.Provider value={{
      byMarche, addRows, removeRow, clearMarche, clearAll,
      getRows, getAllRows, totalCount,
    }}>
      {children}
    </Ctx.Provider>
  );
}
