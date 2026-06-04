import { useEffect, useMemo, useState, cloneElement } from 'react';
import * as XLSX from 'xlsx-js-style';
import { marches } from '../../../data/mockData';
import { getInvestConfig, isInvestConfigured, hasFullInvestConfig } from '../../../data/marcheInvestConfig';
import { loadNomenclature } from '../../../utils/bddBuilder/matchClcc';
import { useReportingData } from '../../../context/ReportingDataContext';
import { useBddPending } from '../../../context/BddPendingContext';
import { parseReportingExcel } from '../../../data/excelReportingParser';

// ═══════════════════════════════════════════════════════════
// Modale d'alimentation manuelle : 1 formulaire ligne-par-ligne.
// Chaque "Ajouter" pousse une ligne dans BddPendingContext.
// ═══════════════════════════════════════════════════════════

const TYPES_EQUIPEMENT = [
  'Automate', 'Logiciels', 'Consommables', 'Equipements et logiciels',
  'Accélérateur', 'Mammographe', 'IRM', 'TEP-CT', 'SPECT-CT', 'scanner diag', 'scanner RT',
  'Détecteurs', 'Fantômes', 'Cuves a eau', 'Matrices',
  'Contentions consommables', 'Contentions non consommables',
  'Bolus marqueurs cutanés', 'Reconnaissance surfacique', 'Identitovigilance',
  'Service contrôle qualité', 'Prestations', 'Autres',
];

const EMPTY_FORM = {
  numLot: '',
  clcc: '',
  typeEquipement: '',
  fournisseur: '',
  nomEquipement: '',
  date: '',
  anneeInstallation: '',
  quantite: '',
  cattc: '',
  dureeGarantieMois: '',
  coutMaintAnnuel: '',
  dureeTco: '',
  gainAchatsRef: '',
};

const REQUIRED = ['clcc', 'typeEquipement', 'numLot', 'fournisseur', 'nomEquipement', 'date', 'quantite', 'cattc'];

const JS_EPOCH_UTC = Date.UTC(1899, 11, 30);
function dateStrToExcelSerial(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00Z');
  if (isNaN(d.getTime())) return '';
  return Math.round((d.getTime() - JS_EPOCH_UTC) / 86400000);
}

export default function BddManualEntryModal({ onClose }) {
  const { getFileBuffer, setData } = useReportingData() || {};
  const { addRows, getRows, removeRow } = useBddPending() || {};

  const [marcheId, setMarcheId] = useState('');
  const [nomenclature, setNomenclature] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [loadError, setLoadError] = useState('');
  const [needsUpload, setNeedsUpload] = useState(false);

  function loadFromBuffer(buf) {
    try {
      const wb = XLSX.read(buf, { type: 'array' });
      const nom = loadNomenclature(wb);
      setNomenclature(nom);
      setLoadError('');
      setNeedsUpload(false);
    } catch (e) {
      setLoadError(`Erreur lecture nomenclature : ${e.message}`);
    }
  }

  // Charge la nomenclature depuis le buffer en mémoire à l'ouverture
  useEffect(() => {
    const buf = typeof getFileBuffer === 'function' ? getFileBuffer() : null;
    if (!buf) {
      setNeedsUpload(true);
      return;
    }
    loadFromBuffer(buf);
  }, [getFileBuffer]);

  function handleUploadSuiviInvest(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const buffer = e.target.result;
      try {
        // Re-parse les rows pour ne pas casser les graphs si déjà chargés.
        const parsed = parseReportingExcel(buffer);
        if (setData) setData({ ...parsed, fileName: file.name }, buffer);
      } catch (_) {
        if (setData) setData({ rows: [], meta: null, fileName: file.name }, buffer);
      }
      loadFromBuffer(buffer);
    };
    reader.onerror = () => setLoadError('Erreur de lecture du fichier');
    reader.readAsArrayBuffer(file);
  }

  // Ferme sur Échap
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  const cfg = marcheId ? getInvestConfig(marcheId) : null;
  const marchesInvest = useMemo(() => marches.filter(m => m.secteur === 'investissements'), []);
  const pendingRows = marcheId ? (getRows ? getRows(marcheId) : []) : [];

  function setField(k, v) {
    setForm(f => ({ ...f, [k]: v }));
    if (errors[k]) setErrors(e => ({ ...e, [k]: undefined }));
  }

  function validate() {
    const errs = {};
    for (const k of REQUIRED) {
      if (form[k] === '' || form[k] == null) errs[k] = true;
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function buildRow() {
    const numLot = Number(form.numLot);
    const clccEntry = nomenclature.find(n => n.nomenclature === form.clcc);
    // Si la valeur saisie n'est pas dans la nomenclature, on suppose un établissement affilié
    // (les CLCC sont une liste exhaustive et bien connue).
    const etablissementType = clccEntry?.type || 'Etablissement affilié';
    const date = form.date;
    const annee = date ? Number(date.slice(0, 4)) : '';
    const dateSerial = dateStrToExcelSerial(date);

    const bdd = {
      'Etablissement':                                          etablissementType,
      'CLCC unique':                                            form.clcc,
      'Marché':                                                 cfg?.excelMarcheLabel || '',
      "Type d'équipement":                                      form.typeEquipement,
      'Lot':                                                    cfg?.lotLabel ? cfg.lotLabel(numLot) : `Lot_${numLot}`,
      'Fournisseur':                                            form.fournisseur.trim(),
      'Nom equipement':                                         form.nomEquipement.trim(),
      "Date précise d'Achat":                                   dateSerial,
      'Année':                                                  annee,
      "Année d'installation":                                   form.anneeInstallation ? Number(form.anneeInstallation) : '',
      'QUANTITE':                                               Number(form.quantite),
      'CATTC':                                                  Number(form.cattc),
      'Durée garantie (mois)':                                  form.dureeGarantieMois ? Number(form.dureeGarantieMois) : '',
      'Contrat de maintenance en cours ?':                      '',
      'Coût annuel du contrat de maintenance (TTC)':            form.coutMaintAnnuel ? Number(form.coutMaintAnnuel) : '',
      'Durée TCO -années':                                      form.dureeTco ? Number(form.dureeTco) : '',
      'Comptabilisé maintenance':                               '',
      "Coût maintenance total à aujourd'hui (Ficitf)":          '',
      'Année activation maintenance':                           '',
      'TCO Final TTC':                                          '',
      "Coût maintenance total à aujourd'hui (Réel avec TCO)":   '',
      'Potentiellement à renouveller (TCO terminé)\r\nATTENTION , si la durée TCO n\'est pas remplie': '',
      "Année de changement théorique \r\n(Annee d'installation + TCO)": '',
      'TCO en temps réel (A mettre en U?)':                     '',
      'Gain/Achats de référence':                               form.gainAchatsRef ? Number(form.gainAchatsRef) : '',
      'Gain/Achats\r\n(euros)\r\nAncienne Formule DGOS':        '',
      'Gain/Achats \r\nMaintenance (euros)':                    '',
      'Gain/Achats\r\n(euros)\r\nNouvelle formule DGOS':        '',
    };
    return {
      bdd,
      source: { fileName: 'Saisie manuelle' },
      warnings: [],
      meta: { kind: 'manual', originalConfidence: 1.0 },
    };
  }

  function handleAdd() {
    if (!cfg) return;
    if (!validate()) return;
    const row = buildRow();
    addRows(marcheId, [row]);
    setForm(EMPTY_FORM);
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(15, 23, 42, 0.55)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        padding: '3vh 3vw', overflow: 'auto',
      }}
    >
      <div onClick={e => e.stopPropagation()} style={{
        width: 'min(1100px, 100%)', background: '#fff', borderRadius: 8,
        boxShadow: '0 20px 60px rgba(0,0,0,0.25)', overflow: 'hidden',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 16px', borderBottom: '1px solid var(--border)',
          background: 'linear-gradient(90deg, #FFF7ED, #fff)',
        }}>
          <div>
            <div style={{ fontSize: 10, color: 'var(--orange)', fontWeight: 600, letterSpacing: 0.6, textTransform: 'uppercase' }}>
              Reporting · Saisie manuelle
            </div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>Ajouter une ligne au Suivi_Invest</div>
          </div>
          <button onClick={onClose} aria-label="Fermer"
            style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 20, padding: '4px 10px', color: 'var(--text-muted)', borderRadius: 4 }}>
            ×
          </button>
        </div>

        <div style={{ padding: 16 }}>
          {needsUpload && (
            <div style={{ padding: 12, background: '#FEF3C7', color: '#78350F', borderRadius: 6, fontSize: 12, marginBottom: 12 }}>
              <div style={{ fontWeight: 600, marginBottom: 6 }}>
                Le fichier Suivi_Invest n'est pas chargé en mémoire.
              </div>
              <div style={{ marginBottom: 8 }}>
                Cela arrive après un rechargement de page. Sélectionnez-le ci-dessous pour récupérer la nomenclature des centres.
              </div>
              <input type="file" accept=".xlsx,.xls"
                onChange={e => { if (e.target.files[0]) handleUploadSuiviInvest(e.target.files[0]); e.target.value = ''; }}
                style={{ fontSize: 12 }}
              />
            </div>
          )}
          {loadError && (
            <div style={{ padding: 8, background: '#FEE2E2', color: '#991B1B', borderRadius: 4, fontSize: 12, marginBottom: 12 }}>
              {loadError}
            </div>
          )}

          {/* Sélecteur marché */}
          <div style={{ marginBottom: 12 }}>
            <Label>Marché</Label>
            <select value={marcheId} onChange={e => setMarcheId(e.target.value)}
              style={{ width: '100%', padding: 8, fontSize: 13 }}
              disabled={pendingRows.length > 0}
            >
              <option value="">— Choisir un marché —</option>
              {marchesInvest.filter(m => isInvestConfigured(m.id)).map(m => (
                <option key={m.id} value={m.id}>
                  {m.reference ? `[${m.reference}] ` : ''}{m.nom}{!hasFullInvestConfig(m.id) ? ' · config par défaut' : ''}
                </option>
              ))}
            </select>
            {pendingRows.length > 0 && (
              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>
                Marché verrouillé tant que des lignes en attente existent pour ce marché.
              </div>
            )}
          </div>

          {/* Formulaire */}
          {marcheId && cfg && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
                <Field label="N° de lot *" error={errors.numLot}>
                  <input type="number" min="1" value={form.numLot} onChange={e => setField('numLot', e.target.value)} placeholder="ex: 5" />
                </Field>
                <Field label="Centre / Établissement *" error={errors.clcc} span={2}>
                  <input
                    list="centres-list"
                    value={form.clcc}
                    onChange={e => setField('clcc', e.target.value)}
                    placeholder="ex: Rennes, CHU_Reims, CH_Roanne, CHRU_Lille…"
                  />
                </Field>
                <datalist id="centres-list">
                  {nomenclature.map((n, i) => (
                    <option key={i} value={n.nomenclature}>
                      {n.type === 'Unicancer' ? 'CLCC' : 'EA'} — {n.nom}{n.ville ? ` (${n.ville})` : ''}
                    </option>
                  ))}
                </datalist>
                <Field label="Type d'équipement *" error={errors.typeEquipement}>
                  <input list="types-equip" value={form.typeEquipement} onChange={e => setField('typeEquipement', e.target.value)} placeholder="ex: Automate" />
                  <datalist id="types-equip">
                    {TYPES_EQUIPEMENT.map(t => <option key={t} value={t} />)}
                  </datalist>
                </Field>
                <Field label="Fournisseur *" error={errors.fournisseur} span={2}>
                  <input value={form.fournisseur} onChange={e => setField('fournisseur', e.target.value)} placeholder="ex: Leica" />
                </Field>
                <Field label="Nom équipement *" error={errors.nomEquipement} span={2}>
                  <input value={form.nomEquipement} onChange={e => setField('nomEquipement', e.target.value)} placeholder="ex: HistoCore SPECTRA ST" />
                </Field>
                <Field label="Date d'achat *" error={errors.date}>
                  <input type="date" value={form.date} onChange={e => setField('date', e.target.value)} />
                </Field>
                <Field label="Année installation">
                  <input type="number" min="1990" max="2099" value={form.anneeInstallation} onChange={e => setField('anneeInstallation', e.target.value)} placeholder="auto = année d'achat" />
                </Field>
                <Field label="Quantité *" error={errors.quantite}>
                  <input type="number" min="1" value={form.quantite} onChange={e => setField('quantite', e.target.value)} placeholder="1" />
                </Field>
                <Field label="CA TTC (€) *" error={errors.cattc}>
                  <input type="number" min="0" step="0.01" value={form.cattc} onChange={e => setField('cattc', e.target.value)} placeholder="ex: 48195" />
                </Field>
                <Field label="Durée garantie (mois)">
                  <input type="number" min="0" value={form.dureeGarantieMois} onChange={e => setField('dureeGarantieMois', e.target.value)} placeholder="24" />
                </Field>
                <Field label="Coût annuel maintenance TTC (€)">
                  <input type="number" min="0" step="0.01" value={form.coutMaintAnnuel} onChange={e => setField('coutMaintAnnuel', e.target.value)} placeholder="ex: 4800" />
                </Field>
                <Field label="Durée TCO (années)">
                  <input type="number" min="0" value={form.dureeTco} onChange={e => setField('dureeTco', e.target.value)} placeholder="7" />
                </Field>
                <Field label="Gain/Achats de référence (taux)">
                  <input type="number" min="0" max="1" step="0.01" value={form.gainAchatsRef} onChange={e => setField('gainAchatsRef', e.target.value)} placeholder="0.15" />
                </Field>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
                <button className="btn btn-outline" onClick={() => setForm(EMPTY_FORM)}>Réinitialiser</button>
                <button className="btn btn-primary" onClick={handleAdd}>+ Ajouter à la liste à exporter</button>
              </div>

              {/* Lignes déjà ajoutées */}
              {pendingRows.length > 0 && (
                <div style={{ marginTop: 18 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6, color: '#16a34a' }}>
                    {pendingRows.length} ligne{pendingRows.length > 1 ? 's' : ''} en attente d'export pour ce marché
                  </div>
                  <div style={{ maxHeight: 220, overflow: 'auto', border: '1px solid var(--border)', borderRadius: 4 }}>
                    <table style={{ width: '100%', fontSize: 11, borderCollapse: 'collapse' }}>
                      <thead style={{ position: 'sticky', top: 0, background: '#F8FAFC' }}>
                        <tr style={{ borderBottom: '1px solid var(--border)' }}>
                          <th style={{ padding: 4, textAlign: 'left' }}>CLCC</th>
                          <th style={{ padding: 4, textAlign: 'left' }}>Lot</th>
                          <th style={{ padding: 4, textAlign: 'left' }}>Fournisseur</th>
                          <th style={{ padding: 4, textAlign: 'left' }}>Désignation</th>
                          <th style={{ padding: 4, textAlign: 'right' }}>Année</th>
                          <th style={{ padding: 4, textAlign: 'right' }}>Qté</th>
                          <th style={{ padding: 4, textAlign: 'right' }}>CA TTC</th>
                          <th style={{ padding: 4, textAlign: 'left' }}>Source</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {pendingRows.map((r, i) => (
                          <tr key={i} style={{ borderBottom: '1px solid #f0f0f0' }}>
                            <td style={{ padding: 4 }}>{r.bdd['CLCC unique']}</td>
                            <td style={{ padding: 4, whiteSpace: 'nowrap' }}>{r.bdd['Lot']}</td>
                            <td style={{ padding: 4, fontWeight: 600 }}>{r.bdd['Fournisseur']}</td>
                            <td style={{ padding: 4, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={r.bdd['Nom equipement']}>{r.bdd['Nom equipement']}</td>
                            <td style={{ padding: 4, textAlign: 'right' }}>{r.bdd['Année'] || '—'}</td>
                            <td style={{ padding: 4, textAlign: 'right' }}>{r.bdd['QUANTITE']}</td>
                            <td style={{ padding: 4, textAlign: 'right' }}>{typeof r.bdd['CATTC'] === 'number' ? r.bdd['CATTC'].toFixed(2) : ''}</td>
                            <td style={{ padding: 4, fontSize: 10, color: 'var(--text-muted)' }}>{r.source?.fileName || '—'}</td>
                            <td style={{ padding: 4, textAlign: 'right' }}>
                              <button className="btn btn-xs btn-ghost" onClick={() => removeRow(marcheId, i)} style={{ fontSize: 10 }}>Retirer</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Label({ children }) {
  return <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600, marginBottom: 4 }}>{children}</div>;
}

function Field({ label, error, span, children }) {
  const baseStyle = {
    width: '100%', padding: '6px 8px', fontSize: 12,
    border: error ? '1px solid #dc2626' : '1px solid var(--border)',
    borderRadius: 4, background: '#fff',
  };
  // Clone l'enfant unique en lui injectant les styles cohérents.
  const styled = (children && typeof children === 'object' && !Array.isArray(children))
    ? cloneElement(children, { style: { ...baseStyle, ...(children.props?.style || {}) } })
    : children;
  return (
    <div style={{ gridColumn: span ? `span ${span}` : undefined }}>
      <Label>{label}</Label>
      {styled}
    </div>
  );
}
