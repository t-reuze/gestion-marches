import { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import {
  validateExcelStructure, detectRowOffset,
  detectStructure, normalize,
  saveProfile, loadProfile, listProfiles,
} from '../../utils/excelCleaner';

/**
 * SmartExcelImport — import Excel avec validation, profils templates et aperçu.
 *
 * Props :
 *   onImport({ wb, raw, fileName, sheetName, offset, buf }) — après validation OK
 *   marcheReference — optionnel, affiché dans le sous-titre et nom de profil par défaut
 */
export default function SmartExcelImport({ onImport, marcheReference }) {
  const [isDrag, setIsDrag]                 = useState(false);
  const [report, setReport]                 = useState(null);
  const [loading, setLoading]               = useState(false);
  const [profiles, setProfiles]             = useState([]);
  const [selectedProfile, setSelectedProfile] = useState('');
  const [headerRow, setHeaderRow]           = useState(0);
  const [previewData, setPreviewData]       = useState(null);
  const [showSave, setShowSave]             = useState(false);
  const [profileName, setProfileName]       = useState('');
  const [saveFeedback, setSaveFeedback]     = useState('');

  // Charger la liste des profils au montage
  useEffect(() => {
    setProfiles(listProfiles());
  }, []);

  // Recalculer l'aperçu quand headerRow ou profil change
  useEffect(() => {
    if (!report?.raw) return;
    const p = selectedProfile ? loadProfile(selectedProfile) : {};
    const result = normalize(report.raw, { ...(p || {}), headerRow });
    setPreviewData(result);
  }, [report, headerRow, selectedProfile]);

  function applyProfile(name) {
    setSelectedProfile(name);
    if (!name) return;
    const p = loadProfile(name);
    if (p?.headerRow != null) setHeaderRow(p.headerRow);
  }

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
        const wb  = XLSX.read(new Uint8Array(buf), { type: 'array' });
        const sheetName = wb.SheetNames[0];
        const ws  = wb.Sheets[sheetName];
        const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

        // Appliquer le profil sélectionné si présent
        const activeProfile = selectedProfile ? loadProfile(selectedProfile) : null;

        // Détecter la structure (en-tête heuristique + cellules fusionnées)
        const structure = detectStructure(ws);
        const detectedHeaderRow = activeProfile?.headerRow ?? structure.headerRow;
        setHeaderRow(detectedHeaderRow);

        // Valider avec l'offset legacy si besoin
        const offset = detectRowOffset(raw);
        const rawForValidation = offset !== 0
          ? [...raw.slice(0, offset), ...raw.slice(offset * 2 || raw.length)]
          : raw;
        const validation = validateExcelStructure(rawForValidation);

        setReport({ ...validation, fileName: file.name, sheetName, offset, wb, raw, buf, structure });
        setShowSave(false);
        setProfileName(marcheReference || '');
      } catch (err) {
        setReport({ valid: false, errors: ['Erreur de lecture : ' + err.message], warnings: [], info: {}, fileName: file?.name || '' });
      }
      setLoading(false);
    };
    reader.readAsArrayBuffer(file);
  }

  function handleSaveProfile() {
    if (!profileName.trim()) return;
    const ok = saveProfile(profileName, {
      headerRow,
      columnMapping: {},
      skipPatterns: ['^\\s*$', '^total', '^page\\s+\\d'],
    });
    if (ok) {
      setSaveFeedback('Profil « ' + profileName.trim() + ' » sauvegardé !');
      const updated = listProfiles();
      setProfiles(updated);
      setSelectedProfile(profileName.trim());
      setTimeout(() => setSaveFeedback(''), 3000);
      setShowSave(false);
    }
  }

  function confirmImport() {
    if (!report?.wb) return;
    // Mettre à jour le headerRow dans le profil actif si sélectionné
    if (selectedProfile) {
      const existing = loadProfile(selectedProfile) || {};
      saveProfile(selectedProfile, { ...existing, headerRow });
    }
    onImport({
      wb: report.wb,
      raw: report.raw,
      fileName: report.fileName,
      sheetName: report.sheetName,
      offset: report.offset || 0,
      buf: report.buf,
    });
  }

  const previewRows    = previewData?.rows?.slice(0, 5) || [];
  const previewHeaders = previewData?.headers?.slice(0, 8) || [];

  return (
    <div className="import-zone-wrapper">
      <div className="page-header">
        <div className="page-title">Charger un fichier d&apos;évaluation</div>
        <div className="page-sub">
          {marcheReference ? marcheReference + ' — ' : ''}
          Chargez le fichier Excel issu du template d&apos;évaluation des fournisseurs
        </div>
      </div>

      {/* Sélecteur de profil avant chargement */}
      {profiles.length > 0 && !report && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-header"><span className="card-title">Appliquer un profil</span></div>
          <div className="card-body">
            <select
              className="info-field-input"
              value={selectedProfile}
              onChange={e => applyProfile(e.target.value)}
              style={{ maxWidth: 360 }}
            >
              <option value="">— Détection automatique —</option>
              {profiles.map(p => (
                <option key={p.name} value={p.name}>
                  {p.name}{p.savedAt ? ' · ' + new Date(p.savedAt).toLocaleDateString('fr-FR') : ''}
                </option>
              ))}
            </select>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
              Un profil sauvegardé applique automatiquement la ligne d’en-tête et les mappings définis.
            </div>
          </div>
        </div>
      )}

      {/* Zone de drop */}
      {!report && (
        <div
          className={'drop-zone' + (isDrag ? ' drag-over' : '')}
          onDragOver={e => { e.preventDefault(); setIsDrag(true); }}
          onDragLeave={() => setIsDrag(false)}
          onDrop={e => { e.preventDefault(); setIsDrag(false); processFile(e.dataTransfer.files[0]); }}
        >
          <div className="drop-icon"></div>
          <div className="drop-title">Glissez-déposez votre fichier ici</div>
          <div className="drop-sub">Format .xlsx · Template d’évaluation fournisseurs Unicancer</div>
          <label className="btn btn-primary" style={{ marginTop: 16, cursor: 'pointer' }}>
            {loading ? 'Analyse…' : 'Parcourir…'}
            <input type="file" accept=".xlsx,.xls" style={{ display: 'none' }} onChange={e => { if (e.target.files[0]) processFile(e.target.files[0]); }} />
          </label>
        </div>
      )}

      {report && (
        <div className="fade-in">

          {/* Barre statut fichier */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, padding: '12px 16px', background: 'var(--bg-alt)', borderRadius: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: '50%',
              background: report.valid ? '#10B981' : '#EF4444',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontSize: 18, fontWeight: 800, flexShrink: 0,
            }}>
              {report.valid ? '✓' : '✗'}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 13 }}>{report.fileName}</div>
              <div style={{ fontSize: 11, color: report.valid ? '#10B981' : '#EF4444', fontWeight: 600 }}>
                {report.valid ? 'Structure validée — prêt à importer' : 'Erreur(s) détectée(s)'}
              </div>
            </div>
            <button className="btn btn-outline btn-sm" onClick={() => { setReport(null); setPreviewData(null); }}>
              ↺ Changer
            </button>
          </div>

          {/* Erreurs */}
          {report.errors?.length > 0 && (
            <div className="info-box red" style={{ marginBottom: 12 }}>
              <strong>Erreurs :</strong>
              <ul style={{ margin: '6px 0 0 0', paddingLeft: 18, fontSize: 12 }}>
                {report.errors.map((e, i) => <li key={i}>{e}</li>)}
              </ul>
            </div>
          )}

          {/* Avertissements */}
          {report.warnings?.length > 0 && (
            <div className="info-box" style={{ marginBottom: 12, background: '#FFFBEB', border: '1px solid #FCD34D', color: '#92400E' }}>
              <strong>Avertissements :</strong>
              <ul style={{ margin: '6px 0 0 0', paddingLeft: 18, fontSize: 12 }}>
                {report.warnings.map((w, i) => <li key={i}>{w}</li>)}
              </ul>
            </div>
          )}

          {/* Structure Unicancer détectée */}
          {report.info?.vendors && (
            <div className="card" style={{ marginBottom: 16 }}>
              <div className="card-header"><span className="card-title">Structure détectée</span></div>
              <div className="card-body" style={{ fontSize: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div>
                  <strong>{report.info.vendors.length} fournisseur{report.info.vendors.length > 1 ? 's' : ''} :</strong>{' '}
                  {report.info.vendors.map(v => v.name).join(' · ')}
                </div>
                <div>
                  <strong>{report.info.questionCount} critère{report.info.questionCount > 1 ? 's' : ''}</strong>
                  {report.info.notesEmpty && (
                    <span style={{ marginLeft: 8, color: '#F59E0B' }}>
                      · Colonnes notes vides (normal pour un nouveau fichier)
                    </span>
                  )}
                </div>
                {report.offset !== 0 && (
                  <div style={{ color: '#F59E0B' }}>
                    Décalage de {report.offset} ligne{Math.abs(report.offset) > 1 ? 's' : ''} détecté et corrigé automatiquement.
                  </div>
                )}
                {report.structure?.mergedCells?.length > 0 && (
                  <div style={{ color: 'var(--text-muted)' }}>
                    {report.structure.mergedCells.length} cellule{report.structure.mergedCells.length > 1 ? 's fusionnées' : ' fusionnée'} détectée{report.structure.mergedCells.length > 1 ? 's' : ''}.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Gestion du profil */}
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="card-title">Profil de template</span>
              <button className="btn btn-outline btn-sm" onClick={() => setShowSave(s => !s)}>
                {showSave ? 'Annuler' : 'Sauvegarder ce profil'}
              </button>
            </div>
            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div className="info-grid">
                <div className="info-field">
                  <label className="info-field-label">Profil appliqué</label>
                  <select
                    className="info-field-input"
                    value={selectedProfile}
                    onChange={e => applyProfile(e.target.value)}
                  >
                    <option value="">— Détection automatique —</option>
                    {profiles.map(p => (
                      <option key={p.name} value={p.name}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div className="info-field">
                  <label className="info-field-label">Ligne d’en-tête (index 0-based)</label>
                  <input
                    className="info-field-input"
                    type="number"
                    min={0}
                    max={20}
                    value={headerRow}
                    onChange={e => setHeaderRow(Math.max(0, parseInt(e.target.value) || 0))}
                    style={{ width: 80 }}
                  />
                </div>
              </div>

              {showSave && (
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', paddingTop: 8, borderTop: '1px solid var(--border)' }}>
                  <input
                    className="info-field-input"
                    type="text"
                    placeholder="Nom du profil (ex : unicancer_accélérateurs)"
                    value={profileName}
                    onChange={e => setProfileName(e.target.value)}
                    style={{ flex: 1 }}
                    onKeyDown={e => { if (e.key === 'Enter') handleSaveProfile(); }}
                  />
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={handleSaveProfile}
                    disabled={!profileName.trim()}
                  >
                    Enregistrer
                  </button>
                </div>
              )}

              {saveFeedback && (
                <div style={{ fontSize: 11, color: '#10B981', fontWeight: 600 }}>✓ {saveFeedback}</div>
              )}
            </div>
          </div>

          {/* Aperçu des données normalisées */}
          {previewRows.length > 0 && (
            <div className="card" style={{ marginBottom: 16 }}>
              <div className="card-header">
                <span className="card-title">
                  Aperçu — {previewData.rows.length} ligne{previewData.rows.length > 1 ? 's' : ''}
                  {previewData.skipped > 0 && (
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 400, marginLeft: 6 }}>
                      ({previewData.skipped} ignorée{previewData.skipped > 1 ? 's' : ''})
                    </span>
                  )}
                </span>
              </div>
              <div className="card-body" style={{ overflowX: 'auto', padding: 0 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                  <thead>
                    <tr>
                      {previewHeaders.map((h, i) => (
                        <th key={i} style={{
                          padding: '6px 10px', textAlign: 'left',
                          background: 'var(--bg-alt)', borderBottom: '2px solid var(--border)',
                          fontWeight: 700, whiteSpace: 'nowrap',
                          maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis',
                        }}>
                          {h || '—'}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.map((row, ri) => (
                      <tr key={ri} style={{ borderBottom: '1px solid var(--border)' }}>
                        {previewHeaders.map((h, ci) => (
                          <td key={ci} style={{
                            padding: '5px 10px', maxWidth: 160,
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                            color: 'var(--text-muted)',
                          }}>
                            {row[h] || '—'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Bouton import */}
          {report.valid && (
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <button className="btn btn-primary" onClick={confirmImport}>
                Importer et démarrer la notation
              </button>
              {report.warnings?.length > 0 && (
                <span style={{ fontSize: 11, color: 'var(--text-muted)', alignSelf: 'center' }}>
                  Des avertissements existent, vérifiez avant de continuer
                </span>
              )}
            </div>
          )}
        </div>
      )}

      <div className="info-box blue" style={{ marginTop: 16 }}>
        <strong>Format attendu :</strong> feuille 1 — ligne 4 = en-têtes fournisseurs (col. D–I = réponses, col. J–O = notes), lignes 5+ = critères.
      </div>
    </div>
  );
}
