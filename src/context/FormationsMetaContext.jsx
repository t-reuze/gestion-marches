import { useState, useContext, createContext } from 'react';

const Ctx = createContext(null);
export function useFormationsMeta() { return useContext(Ctx); }

const KEY = 'gm-formations-meta';
function load()  { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { return {}; } }
function save(d) { try { localStorage.setItem(KEY, JSON.stringify(d)); } catch(_) {} }
function docsKey(id) { return 'gm-formation-docs-' + id; }
function loadDocs(id) { try { return JSON.parse(localStorage.getItem(docsKey(id)) || '[]'); } catch { return []; } }
function saveDocs(id, docs) { try { localStorage.setItem(docsKey(id), JSON.stringify(docs)); } catch(_) {} }

export function FormationsMetaProvider({ children }) {
  const [metas, setMetas] = useState(load);

  function getMeta(id) { return metas[id] || {}; }

  function _setMeta(id, fields) {
    const updated = { ...metas, [id]: { ...(metas[id] || {}), ...fields } };
    setMetas(updated);
    save(updated);
  }

  function getInscriptions(id) { return (metas[id] || {}).inscriptions || []; }

  function addInscription(id, insc) {
    _setMeta(id, { inscriptions: [...getInscriptions(id), { ...insc, id: Date.now().toString() }] });
  }

  function updateInscription(id, inscId, fields) {
    _setMeta(id, { inscriptions: getInscriptions(id).map(i => i.id === inscId ? { ...i, ...fields } : i) });
  }

  function removeInscription(id, inscId) {
    _setMeta(id, { inscriptions: getInscriptions(id).filter(i => i.id !== inscId) });
  }

  function getDocs(id) { return loadDocs(id); }

  function addDoc(id, doc) { saveDocs(id, [...loadDocs(id), doc]); }

  function removeDoc(id, docId) { saveDocs(id, loadDocs(id).filter(d => d.id !== docId)); }

  return (
    <Ctx.Provider value={{ getMeta, setMeta: _setMeta, getInscriptions, addInscription, updateInscription, removeInscription, getDocs, addDoc, removeDoc }}>
      {children}
    </Ctx.Provider>
  );
}
