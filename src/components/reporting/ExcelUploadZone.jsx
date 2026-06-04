import { useState, useRef } from 'react';
import { parseReportingExcel } from '../../data/excelReportingParser';
import { useReportingData } from '../../context/ReportingDataContext';
import { useBddPending } from '../../context/BddPendingContext';
import BddBuilderModal from '../../features/reporting/BddBuilder/BddBuilderModal';
import BddManualEntryModal from '../../features/reporting/BddBuilder/BddManualEntryModal';
import QualityReportModal from '../../features/reporting/BddBuilder/QualityReportModal';
import {
  readSuiviInvestFromBuffer, cloneWorkbookBdd,
  appendBddRows, downloadWorkbook,
} from '../../utils/bddBuilder/exportSuiviInvest';

export default function ExcelUploadZone() {
  const { rows, fileName, setData, getFileBuffer } = useReportingData();
  const { totalCount, byMarche, getAllRows, clearAll } = useBddPending() || {};
  const [dragOver, setDragOver] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showUpload, setShowUpload] = useState(false);
  const [builderOpen, setBuilderOpen] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [report, setReport] = useState(null);  // rapport qualité post-export
  const inputRef = useRef();

  const hasData = rows.length > 0;
  const pendingTotal = totalCount ? totalCount() : 0;
  const pendingMarches = byMarche ? Object.keys(byMarche).length : 0;

  async function handleExport() {
    setExporting(true);
    try {
      const buffer = getFileBuffer ? getFileBuffer() : null;
      if (!buffer) {
        alert('Le fichier Suivi_Invest source a été perdu (rechargement de page). Cliquez sur "Remplacer" pour le recharger, puis réessayez.');
        return;
      }
      const wb = readSuiviInvestFromBuffer(buffer);
      const allRows = getAllRows ? getAllRows() : [];
      const stamp = new Date().toISOString().slice(0, 10);
      if (allRows.length === 0) {
        // Téléchargement à blanc — utile pour vérifier le contenu actuel.
        downloadWorkbook(wb, `Suivi_Invest_${stamp}.xlsx`);
        return;
      }
      const wbClone = cloneWorkbookBdd(wb);
      appendBddRows(wbClone, allRows);
      downloadWorkbook(wbClone, `Suivi_Invest_${stamp}_maj.xlsx`);
      const stats = computeQualityReport(allRows, byMarche);
      setReport(stats);
      clearAll();
    } catch (e) {
      alert('Erreur export : ' + e.message);
    } finally {
      setExporting(false);
    }
  }

  function computeQualityReport(rows, byMarcheRaw) {
    const stats = {
      total: rows.length,
      auto: 0, autoEdited: 0, manual: 0,
      byKind: { auto: [], 'auto-edited': [], manual: [] },
      byStatus: { ok: 0, warning: 0, error: 0 },
      byMarche: {},
      avgConfidence: 0,
      anomalies: 0,
    };
    let confSum = 0, confCount = 0;
    const marcheNames = byMarcheRaw || {};
    for (const r of rows) {
      const kind = r.meta?.kind || 'auto';
      stats.byKind[kind] = stats.byKind[kind] || [];
      stats.byKind[kind].push(r);
      if (kind === 'auto-edited') stats.autoEdited++;
      else if (kind === 'manual') stats.manual++;
      else stats.auto++;
      const st = r.meta?.originalStatus || 'ok';
      stats.byStatus[st] = (stats.byStatus[st] || 0) + 1;
      if (typeof r.meta?.originalConfidence === 'number') {
        confSum += r.meta.originalConfidence;
        confCount++;
      }
    }
    for (const [marcheId, rs] of Object.entries(marcheNames)) {
      stats.byMarche[marcheId] = rs.length;
    }
    stats.avgConfidence = confCount > 0 ? confSum / confCount : null;
    return stats;
  }

  function handleFile(file) {
    if (!file) return;
    setError('');
    setLoading(true);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const buffer = e.target.result;
        const parsed = parseReportingExcel(buffer);
        if (parsed.rows.length === 0) {
          setError('Aucune donnée trouvée dans le fichier.');
        } else {
          setData({ ...parsed, fileName: file.name }, buffer);
          setShowUpload(false);
        }
      } catch (err) {
        setError('Erreur de lecture : ' + err.message);
      }
      setLoading(false);
    };
    reader.onerror = () => { setError('Erreur de lecture du fichier.'); setLoading(false); };
    reader.readAsArrayBuffer(file);
  }

  function onDrop(e) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && (file.name.endsWith('.xlsx') || file.name.endsWith('.xls'))) handleFile(file);
    else setError('Format non supporté. Utilisez un fichier .xlsx ou .xls');
  }

  function onInputChange(e) {
    handleFile(e.target.files[0]);
    e.target.value = '';
  }

  // --- Mode compact : données déjà chargées ---
  if (hasData && !showUpload) {
    return (
      <>
        <div className="reporting-upload-bar">
          <span className="reporting-file-info">
            Données : <strong>{fileName || 'fichier.xlsx'}</strong> — {rows.length.toLocaleString('fr-FR')} lignes
            {pendingTotal > 0 && (
              <span style={{ marginLeft: 12, color: 'var(--orange)', fontSize: 11, fontWeight: 600 }}>
                · {pendingTotal} ligne{pendingTotal > 1 ? 's' : ''} en attente d'export
                {pendingMarches > 1 ? ` (${pendingMarches} marchés)` : ''}
              </span>
            )}
          </span>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button
              className="btn btn-sm btn-outline"
              onClick={() => setShowUpload(true)}
              style={{ fontSize: 11 }}
            >
              Remplacer
            </button>
            <button
              className="btn btn-sm btn-outline"
              onClick={() => setBuilderOpen(true)}
              style={{ fontSize: 11 }}
              title="Alimenter à partir des reportings fournisseurs (mode auto)"
            >
              + Auto
            </button>
            <button
              className="btn btn-sm btn-outline"
              onClick={() => setManualOpen(true)}
              style={{ fontSize: 11 }}
              title="Saisir une ligne à la main"
            >
              + Manuel
            </button>
            <button
              className="btn btn-sm btn-primary"
              onClick={handleExport}
              disabled={exporting}
              style={{ fontSize: 11 }}
              title={pendingTotal === 0
                ? 'Télécharger le Suivi_Invest tel quel (sans ajout)'
                : `Télécharger le Suivi_Invest avec ${pendingTotal} ligne(s) ajoutée(s)`}
            >
              {exporting ? 'Export...' : `Exporter${pendingTotal > 0 ? ` (+${pendingTotal})` : ''} ↓`}
            </button>
          </div>
        </div>
        {builderOpen && <BddBuilderModal onClose={() => setBuilderOpen(false)} />}
        {manualOpen && <BddManualEntryModal onClose={() => setManualOpen(false)} />}
        {report && <QualityReportModal report={report} onClose={() => setReport(null)} />}
      </>
    );
  }

  // --- Mode complet : premier chargement ou remplacement ---
  return (
    <div className="reporting-upload-section">
      <div
        className={'drop-zone' + (dragOver ? ' drag-over' : '')}
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        style={{ width: '100%', cursor: 'pointer' }}
      >
        <input ref={inputRef} type="file" accept=".xlsx,.xls" style={{ display: 'none' }} onChange={onInputChange} />
        <UploadIcon />
        {loading ? (
          <div className="drop-title">Chargement en cours…</div>
        ) : (
          <>
            <div className="drop-title">
              Glisser un fichier Excel ici ou <span style={{ color: 'var(--orange)' }}>parcourir</span>
            </div>
            <div className="drop-sub">
              Chargez le fichier Suivi_Invest (ex&nbsp;: 2025.xlsx)
            </div>
          </>
        )}
      </div>

      {hasData && (
        <button
          className="btn btn-xs btn-ghost"
          onClick={() => setShowUpload(false)}
          style={{ marginTop: 6, fontSize: 11 }}
        >
          Annuler
        </button>
      )}

      {error && <div className="info-box red" style={{ marginTop: 8, fontSize: 12 }}>{error}</div>}
    </div>
  );
}

function UploadIcon() {
  return (
    <div className="drop-icon" aria-hidden="true">
      <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--orange)' }}>
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="17 8 12 3 7 8" />
        <line x1="12" y1="3" x2="12" y2="15" />
      </svg>
    </div>
  );
}
