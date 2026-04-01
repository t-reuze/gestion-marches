import { useState } from 'react';
import * as XLSX from 'xlsx';
import { validateExcelStructure, detectRowOffset } from '../../utils/excelCleaner';

/**
 * SmartExcelImport — composant de chargement Excel avec validation avant import.
 * Remplace avantageusement la zone de drop basique de Notation.jsx.
 *
 * Props :
 *   onImport({ wb, raw, fileName, sheetName, offset }) — appelé après validation OK
 *   marcheReference — optionnel, affiché dans le sous-titre
 */
export default function SmartExcelImport({ onImport, marcheReference }) {
  const [isDrag, setIsDrag] = useState(false);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);

  function processFile(file) {
    if (!file) return;
    if (!file.name.match(/\.xlsx?$/i)) {
      setReport({ valid: false, errors: ['Fichier .xlsx requis (format Excel 2007+)'], warnings: [], info: {}, fileName: file.name });
      return;
    }
    setLoading(true);
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const buf = e.target.result;
        const wb = XLSX.read(new Uint8Array(buf), { type: 'array' });
        const sheetName = wb.SheetNames[0];
        const ws = wb.Sheets[sheetName];
        const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

        const offset = detectRowOffset(raw);
        const rawForValidation = offset !== 0
          ? [...raw.slice(0, offset), ...raw.slice(offset * 2 || raw.length)]
          : raw;

        const validation = validateExcelStructure(rawForValidation);
        setReport({ ...validation, fileName: file.name, sheetName, offset, wb, raw, buf });
      } catch (err) {
        setReport({ valid: false, errors: ['Erreur de lecture : ' + err.message], warnings: [], info: {}, fileName: file?.name || '' });
      }
      setLoading(false);
    };
    reader.readAsArrayBuffer(file);
  }

  function confirmImport() {
    if (!report?.wb) return;
    onImport({ wb: report.wb, raw: report.raw, fileName: report.fileName, sheetName: report.sheetName, offset: report.offset || 0, buf: report.buf });
  }

  return (
    <div className="import-zone-wrapper">
      <div className="page-header">
        <div className="page-title">Charger un fichier d&#x27;&#xe9;valuation</div>
        <div className="page-sub">
          {marcheReference ? marcheReference + ' \u2014 ' : ''}
          Chargez le fichier Excel issu du template d&#x27;&#xe9;valuation des fournisseurs
        </div>
      </div>

      {!report && (
        <div
          className={'drop-zone' + (isDrag ? ' drag-over' : '')}
          onDragOver={e => { e.preventDefault(); setIsDrag(true); }}
          onDragLeave={() => setIsDrag(false)}
          onDrop={e => { e.preventDefault(); setIsDrag(false); processFile(e.dataTransfer.files[0]); }}
        >
          <div className="drop-icon">&#x1F4C2;</div>
          <div className="drop-title">Glissez-d&#xe9;posez votre fichier ici</div>
          <div className="drop-sub">Format .xlsx \u00b7 Template d\u2019\u00e9valuation fournisseurs Unicancer</div>
          <label className="btn btn-primary" style={{ marginTop: 16, cursor: 'pointer' }}>
            {loading ? 'Analyse\u2026' : 'Parcourir\u2026'}
            <input type="file" accept=".xlsx,.xls" style={{ display: 'none' }} onChange={e => { if (e.target.files[0]) processFile(e.target.files[0]); }} />
          </label>
        </div>
      )}

      {report && (
        <div className="fade-in">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, padding: '12px 16px', background: 'var(--bg-alt)', borderRadius: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: '50%',
              background: report.valid ? '#10B981' : '#EF4444',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontSize: 18, fontWeight: 800, flexShrink: 0,
            }}>
              {report.valid ? '\u2713' : '\u2715'}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 13 }}>{report.fileName}</div>
              <div style={{ fontSize: 11, color: report.valid ? '#10B981' : '#EF4444', fontWeight: 600 }}>
                {report.valid ? 'Structure valid\u00e9e \u2014 pr\u00eat \u00e0 importer' : 'Erreur(s) d\u00e9tect\u00e9e(s)'}
              </div>
            </div>
            <button className="btn btn-outline btn-sm" onClick={() => setReport(null)}>
              &#x21BA; Changer
            </button>
          </div>

          {report.errors?.length > 0 && (
            <div className="info-box red" style={{ marginBottom: 12 }}>
              <strong>Erreurs :</strong>
              <ul style={{ margin: '6px 0 0 0', paddingLeft: 18, fontSize: 12 }}>
                {report.errors.map((e, i) => <li key={i}>{e}</li>)}
              </ul>
            </div>
          )}

          {report.warnings?.length > 0 && (
            <div className="info-box" style={{ marginBottom: 12, background: '#FFFBEB', border: '1px solid #FCD34D', color: '#92400E' }}>
              <strong>Avertissements :</strong>
              <ul style={{ margin: '6px 0 0 0', paddingLeft: 18, fontSize: 12 }}>
                {report.warnings.map((w, i) => <li key={i}>{w}</li>)}
              </ul>
            </div>
          )}

          {report.info?.vendors && (
            <div className="card" style={{ marginBottom: 16 }}>
              <div className="card-header"><span className="card-title">&#x1F4CB; Structure d\u00e9tect\u00e9e</span></div>
              <div className="card-body" style={{ fontSize: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div>
                  <strong>{report.info.vendors.length} fournisseur{report.info.vendors.length > 1 ? 's' : ''} :</strong>{' '}
                  {report.info.vendors.map(v => v.name).join(' \u00b7 ')}
                </div>
                <div>
                  <strong>{report.info.questionCount} crit\u00e8re{report.info.questionCount > 1 ? 's' : ''}</strong>
                  {report.info.notesEmpty && (
                    <span style={{ marginLeft: 8, color: '#F59E0B' }}>
                      \u00b7 Colonnes notes vides (normal pour un nouveau fichier)
                    </span>
                  )}
                </div>
                {report.offset !== 0 && (
                  <div style={{ color: '#F59E0B' }}>
                    &#x26A0;&#xFE0F; D\u00e9calage de {report.offset} ligne{Math.abs(report.offset) > 1 ? 's' : ''} d\u00e9tect\u00e9 et corrig\u00e9 automatiquement.
                  </div>
                )}
              </div>
            </div>
          )}

          {report.valid && (
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-primary" onClick={confirmImport}>
                &#x25B6; Importer et d\u00e9marrer la notation
              </button>
              {report.warnings?.length > 0 && (
                <span style={{ fontSize: 11, color: 'var(--text-muted)', alignSelf: 'center' }}>
                  &#x26A0;&#xFE0F; Des avertissements existent, v\u00e9rifiez avant de continuer
                </span>
              )}
            </div>
          )}
        </div>
      )}

      <div className="info-box blue" style={{ marginTop: 16 }}>
        <strong>Format attendu :</strong> feuille 1 \u2014 ligne 4\u00a0=\u00a0en-t\u00eates fournisseurs (col. D\u2013I\u00a0=\u00a0r\u00e9ponses, col. J\u2013O\u00a0=\u00a0notes), lignes 5+\u00a0=\u00a0crit\u00e8res.
      </div>
    </div>
  );
}
