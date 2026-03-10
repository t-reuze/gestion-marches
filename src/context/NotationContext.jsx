import { createContext, useContext, useState } from 'react';

const Ctx = createContext(null);

export function NotationProvider({ children }) {
  const [sessions, setSessions] = useState({});

  function getSession(id) { return sessions[id] || null; }

  function setSession(id, data) {
    setSessions(s => ({ ...s, [id]: data }));
  }

  function clearSession(id) {
    setSessions(s => { const n = { ...s }; delete n[id]; return n; });
    try { localStorage.removeItem('gm-notation-' + id); } catch(_) {}
  }

  return (
    <Ctx.Provider value={{ getSession, setSession, clearSession }}>
      {children}
    </Ctx.Provider>
  );
}

export const useNotation = () => useContext(Ctx);
