import { useState, useRef } from 'react';
import { parseReportingExcel } from '../../data/excelReportingParser';
import { useReportingData } from '../../context/ReportingDataContext';

export default function ExcelUploadZone() {
  const { rows, fileName, setData, clearData } = useReportingData();
  const [dragOver, setDragOver] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showUpload, setShowUpload] = useState(false);
  const inputRef = useRef();

  const hasData = rows.length > 0;

  function handleFile(file) {
    if (!file) return;
    setError('');
    setLoading(true);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = parseReportingExcel(e.target.result);
        if (parsed.rows.length === 0) {
          setError('Aucune donnée trouvée dans le fichier.');
        } else {
          setData({ ...parsed, fileName: file.name });
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
      <div className="reporting-upload-bar">
        <span className="reporting-file-info">
          Données : <strong>{fileName || 'fichier.xlsx'}</strong> — {rows.length.toLocaleString('fr-FR')} lignes
        </span>
        <button
          className="btn btn-sm btn-outline"
          onClick={() => setShowUpload(true)}
          style={{ fontSize: 11 }}
        >
          Remplacer le fichier
        </button>
      </div>
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
        style={{ width: '100%' }}
      >
        <input ref={inputRef} type="file" accept=".xlsx,.xls" style={{ display: 'none' }} onChange={onInputChange} />
        {loading ? (
          <div className="drop-zone-text">Chargement en cours...</div>
        ) : (
          <div className="drop-zone-text">
            Glisser un fichier Excel ici ou <span style={{ color: 'var(--orange)', fontWeight: 600 }}>cliquer pour parcourir</span>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
              Chargez le fichier de données reporting (ex : 2025.xlsx)
            </div>
          </div>
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
