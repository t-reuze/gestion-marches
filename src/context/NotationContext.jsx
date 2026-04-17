import { createContext, useContext, useState, useRef } from 'react';

const Ctx = createContext(null);

const HISTORY_KEY = 'gm-notation-history';
const MAX_HISTORY = 100;

function loadHistory() {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '{}'); }
  catch { return {}; }
}

function saveHistory(h) {
  try { localStorage.setItem(HISTORY_KEY, JSON.stringify(h)); } catch (_) {}
}

export function NotationProvider({ children }) {
  const [sessions, setSessions] = useState({});
  const [noteHistory, setNoteHistory] = useState(loadHistory);
  const prevSessionsRef = useRef({});

  function getSession(id) { return sessions[id] || null; }

  function setSession(id, data) {
    const prev = prevSessionsRef.current[id];
    // Detect note changes for history
    if (prev && prev.questions && data && data.questions) {
      const entries = [];
      const now = Date.now();
      data.questions.forEach((q, qIdx) => {
        const prevQ = prev.questions[qIdx];
        if (!prevQ) return;
        const vendors = data.vendors || [];
        vendors.forEach(v => {
          const oldVal = prevQ.notes?.[v.name];
          const newVal = q.notes?.[v.name];
          if (oldVal !== newVal && (oldVal != null || newVal != null)) {
            entries.push({
              timestamp: now,
              questionIdx: qIdx,
              questionLabel: q.question || q.label || ('Q' + (qIdx + 1)),
              vendor: v.name,
              oldValue: oldVal ?? null,
              newValue: newVal ?? null,
            });
          }
        });
      });
      if (entries.length > 0) {
        setNoteHistory(h => {
          const updated = { ...h };
          const list = [...(updated[id] || []), ...entries];
          updated[id] = list.slice(-MAX_HISTORY);
          saveHistory(updated);
          return updated;
        });
      }
    }
    prevSessionsRef.current[id] = data;
    setSessions(s => ({ ...s, [id]: data }));
  }

  function clearSession(id) {
    delete prevSessionsRef.current[id];
    setSessions(s => { const n = { ...s }; delete n[id]; return n; });
    try { localStorage.removeItem('gm-notation-' + id); } catch(_) {}
  }

  function getHistory(marcheId) {
    return noteHistory[marcheId] || [];
  }

  return (
    <Ctx.Provider value={{ getSession, setSession, clearSession, getHistory }}>
      {children}
    </Ctx.Provider>
  );
}

export const useNotation = () => useContext(Ctx);
