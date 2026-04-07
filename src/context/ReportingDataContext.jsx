import { createContext, useContext, useState } from 'react';

const STORAGE_KEY = 'gm-reporting-data';

const Ctx = createContext(null);
export const useReportingData = () => useContext(Ctx);

export function ReportingDataProvider({ children }) {
  const [data, setDataState] = useState(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'); } catch { return null; }
  });

  function setData(parsed) {
    setDataState(parsed);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed)); } catch (_) {}
  }

  function clearData() {
    setDataState(null);
    try { localStorage.removeItem(STORAGE_KEY); } catch (_) {}
  }

  const rows = data?.rows || [];
  const meta = data?.meta || null;
  const fileName = data?.fileName || null;

  return (
    <Ctx.Provider value={{ data, rows, meta, fileName, setData, clearData }}>
      {children}
    </Ctx.Provider>
  );
}
