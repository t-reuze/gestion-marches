import { createContext, useContext, useState } from 'react';

const Ctx = createContext(null);
export const useMarcheMeta = () => useContext(Ctx);

export function MarcheMetaProvider({ children }) {
  const [metas, setMetas] = useState(() => {
    try { return JSON.parse(localStorage.getItem('gm-metas') || '{}'); } catch { return {}; }
  });

  function getMeta(id) { return metas[id] || {}; }

  function setMeta(id, fields) {
    const updated = { ...metas, [id]: { ...(metas[id] || {}), ...fields } };
    setMetas(updated);
    try { localStorage.setItem('gm-metas', JSON.stringify(updated)); } catch(_) {}
  }

  function getAllMeta() { return metas; }

  return <Ctx.Provider value={{ getMeta, setMeta, getAllMeta }}>{children}</Ctx.Provider>;
}
