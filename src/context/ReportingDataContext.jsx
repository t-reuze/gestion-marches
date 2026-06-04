import { createContext, useContext, useState, useRef } from 'react';

const STORAGE_KEY = 'gm-reporting-data';

const Ctx = createContext(null);
export const useReportingData = () => useContext(Ctx);

export function ReportingDataProvider({ children }) {
  const [data, setDataState] = useState(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'); } catch { return null; }
  });

  // Buffer du fichier source, conservé en mémoire pour la session
  // (non sérialisé dans le localStorage). Utilisé par l'outil d'alimentation Suivi_Invest.
  const fileBufferRef = useRef(null);

  function setData(parsed, buffer) {
    setDataState(parsed);
    if (buffer !== undefined) fileBufferRef.current = buffer;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed)); } catch (_) {}
  }

  function clearData() {
    setDataState(null);
    fileBufferRef.current = null;
    try { localStorage.removeItem(STORAGE_KEY); } catch (_) {}
  }

  function getFileBuffer() {
    return fileBufferRef.current;
  }

  const rows = data?.rows || [];
  const meta = data?.meta || null;
  const fileName = data?.fileName || null;

  return (
    <Ctx.Provider value={{ data, rows, meta, fileName, setData, clearData, getFileBuffer }}>
      {children}
    </Ctx.Provider>
  );
}
