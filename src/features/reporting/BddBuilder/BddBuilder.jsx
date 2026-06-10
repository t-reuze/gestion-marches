import { useState, useMemo, useRef, useEffect, useCallback, memo, Fragment } from 'react';
import * as XLSX from 'xlsx-js-style';
import { marches } from '../../../data/mockData';
import { getInvestConfig, isInvestConfigured, hasFullInvestConfig } from '../../../data/marcheInvestConfig';
import { parseAllotissement } from '../../../utils/bddBuilder/parseAllotissement';
import { parseSupplierReporting } from '../../../utils/bddBuilder/parseSupplierReporting';
import { loadNomenclature, topCandidates, deriveAliasesFromBdd } from '../../../utils/bddBuilder/matchClcc';
import { getProfilesMap, saveProfile, forgetProfile } from '../../../utils/bddBuilder/templateProfiles';
import { buildBddRows, summarize, computeCellStatus, BDD_COLUMNS, FORMULA_COLUMNS, COLUMN_EDITORS, MANUAL_COLUMNS } from '../../../utils/bddBuilder/buildBddRows';
import { rememberUserAlias } from '../../../utils/bddBuilder/userAliases';
import { learnConfigFromBdd, findMatchingBddMarcheLabel, readBddRowsForMarket } from '../../../utils/bddBuilder/learnConfigFromBdd';
import { marches as MARCHES_LIST } from '../../../data/mockData';
import { readSuiviInvest } from '../../../utils/bddBuilder/exportSuiviInvest';
import { useReportingData } from '../../../context/ReportingDataContext';
import { useBddPending } from '../../../context/BddPendingContext';

export default function BddBuilder({ onClose }) {
  const { fileName: sharedFileName, getFileBuffer } = useReportingData() || {};

  const [step, setStep] = useState(1);
  const [state, setState] = useState({
    marcheId: '',
    targetWb: null,
    targetFileName: '',
    nomenclature: [],
    learnedByLabel: {},          // conventions apprises depuis la BDD, keyed par "Marché" label
    allotissementLots: [],
    allotissementFileName: '',
    reportings: [],
    builtRows: [],
    excluded: new Set(),
    cellEdits: {},
  });

  // Stable : indispensable pour que les lignes mémoïsées de l'étape 4 ne se
  // re-rendent pas toutes à chaque frappe (les callbacks dérivés en dépendent).
  const update = useCallback((patch) => setState(s => ({ ...s, ...patch })), []);
  const cfg = state.marcheId ? getInvestConfig(state.marcheId) : null;

  // Résout la config apprise pour le marché actuellement sélectionné en cherchant
  // le label BDD correspondant (ex: id "anapath" → label BDD "Anatomopathologie").
  const learnedCfg = useMemo(() => {
    if (!state.marcheId || !state.learnedByLabel) return null;
    // Match par le excelMarcheLabel exact si présent dans learned
    if (cfg?.excelMarcheLabel && state.learnedByLabel[cfg.excelMarcheLabel]) {
      return state.learnedByLabel[cfg.excelMarcheLabel];
    }
    // Fallback : recherche heuristique par référence + nom
    const m = MARCHES_LIST.find(x => x.id === state.marcheId);
    const label = findMatchingBddMarcheLabel(m?.reference, m?.nom, state.learnedByLabel);
    return label ? state.learnedByLabel[label] : null;
  }, [state.marcheId, state.learnedByLabel, cfg]);

  // Pré-charge automatiquement le workbook depuis le fichier déjà fourni au Reporting.
  useEffect(() => {
    if (state.targetWb) return;
    const buf = typeof getFileBuffer === 'function' ? getFileBuffer() : null;
    if (!buf) return;
    try {
      const wb = XLSX.read(buf, { type: 'array', cellFormula: true, cellStyles: true });
      const nom = loadNomenclature(wb);
      const learned = learnConfigFromBdd(wb);
      update({
        targetWb: wb,
        targetFileName: sharedFileName || 'Suivi_Invest.xlsx',
        nomenclature: nom,
        learnedByLabel: learned,
      });
    } catch (_) {
      // Silencieux : l'utilisateur pourra ré-uploader dans l'étape 1.
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <Stepper step={step} />
      <div style={{ marginTop: 16 }}>
        {step === 1 && <Step1 state={state} update={update} next={() => setStep(2)} />}
        {step === 2 && <Step2 state={state} update={update} next={() => setStep(3)} prev={() => setStep(1)} />}
        {step === 3 && <Step3 state={state} update={update} cfg={cfg} next={() => { buildRows(state, cfg, learnedCfg, update); setStep(4); }} prev={() => setStep(2)} />}
        {step === 4 && <Step4 state={state} update={update} cfg={cfg} learnedCfg={learnedCfg} onRebuild={() => buildRows(state, cfg, learnedCfg, update)} prev={() => setStep(3)} onClose={onClose} />}
      </div>
    </div>
  );
}

function buildRows(state, cfg, learnedCfg, update) {
  const rows = buildBddRows(state.reportings, cfg, state.nomenclature, learnedCfg);
  update({ builtRows: rows, excluded: new Set(), cellEdits: {} });
}

// ═══════════════════════════════════════════════════════════
// Stepper en-tête
// ═══════════════════════════════════════════════════════════

const STEPS = [
  { n: 1, label: 'Marché & Suivi_Invest' },
  { n: 2, label: 'Allotissement' },
  { n: 3, label: 'Reportings fournisseurs' },
  { n: 4, label: 'Vérification & remplissage' },
];

function Stepper({ step }) {
  return (
    <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
      {STEPS.map((s) => {
        const isActive = s.n === step;
        const isDone   = s.n < step;
        return (
          <div key={s.n} style={{
            flex: 1, padding: '10px 12px', borderRadius: 6,
            border: '1px solid ' + (isActive ? 'var(--orange)' : 'var(--border)'),
            background: isActive ? 'var(--orange-tint, #FFF7ED)' : (isDone ? '#F0FDF4' : '#fff'),
            fontSize: 12, fontWeight: isActive ? 600 : 500,
            color: isActive ? 'var(--orange)' : (isDone ? '#16a34a' : 'var(--text-muted)'),
          }}>
            <div style={{ fontSize: 10, opacity: 0.7 }}>Étape {s.n}{isDone ? ' ✓' : ''}</div>
            {s.label}
          </div>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// Step 1 — sélection marché + upload Suivi_Invest
// ═══════════════════════════════════════════════════════════

function Step1({ state, update, next }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const marchesInvest = marches.filter(m => m.secteur === 'investissements');

  async function onFile(file) {
    setError(''); setLoading(true);
    try {
      const wb = await readSuiviInvest(file);
      const nom = loadNomenclature(wb);
      update({ targetWb: wb, targetFileName: file.name, nomenclature: nom });
    } catch (e) {
      setError(`Erreur lecture Suivi_Invest : ${e.message}`);
    }
    setLoading(false);
  }

  const canNext = state.marcheId && state.targetWb && isInvestConfigured(state.marcheId);

  return (
    <div>
      <Card title="Marché concerné">
        <select
          value={state.marcheId}
          onChange={e => update({ marcheId: e.target.value })}
          style={{ width: '100%', padding: 8, fontSize: 13 }}
        >
          <option value="">— Choisir un marché d'investissement —</option>
          {marchesInvest.map(m => (
            <option key={m.id} value={m.id}>
              {m.reference ? `[${m.reference}] ` : ''}{m.nom}{!hasFullInvestConfig(m.id) ? ' · config par défaut' : ''}
            </option>
          ))}
        </select>
        {state.marcheId && !hasFullInvestConfig(state.marcheId) && (
          <InfoBox kind="warn">
            Aucun mapping détaillé n'est défini pour ce marché : la nomenclature de lot et le libellé seront générés automatiquement,
            et le « Type d'équipement » devra être renseigné manuellement à la revue (étape 4) ou laissé vide.
          </InfoBox>
        )}
      </Card>

      <Card title="Fichier Suivi_Invest cible" style={{ marginTop: 12 }}>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '0 0 8px' }}>
          Chargez le fichier Suivi_Invest courant (sera utilisé comme modèle pour les formules et nomenclature).
        </p>
        <FileInput accept=".xlsx" onFile={onFile} loading={loading} hint="Format attendu : .xlsx (le fichier sert de modèle pour les formules et la nomenclature CLCC)." />
        {state.targetFileName && !error && (
          <div style={{ fontSize: 12, color: '#16a34a', marginTop: 8 }}>
            ✓ Chargé : <strong>{state.targetFileName}</strong> — {state.nomenclature.length} entrées de nomenclature
          </div>
        )}
        {error && <InfoBox kind="error">{error}</InfoBox>}
      </Card>

      <Nav canNext={canNext} next={next} />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// Step 2 — allotissement
// ═══════════════════════════════════════════════════════════

function Step2({ state, update, next, prev }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function onFile(file) {
    setError(''); setLoading(true);
    try {
      const lots = await parseAllotissement(file);
      update({ allotissementLots: lots, allotissementFileName: file.name });
    } catch (e) {
      setError(`Erreur : ${e.message}`);
    }
    setLoading(false);
  }

  return (
    <div>
      <Card title="Allotissement du marché">
        <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '0 0 8px' }}>
          Chargez le document d'allotissement (docx ou xlsx) pour associer les numéros de lot à leur intitulé.
        </p>
        <FileInput accept=".docx,.xlsx" onFile={onFile} loading={loading} hint="Documents acceptés : .docx ou .xlsx — utilisé pour mapper les n° de lot aux intitulés." />
        {error && <InfoBox kind="error">{error}</InfoBox>}

        {state.allotissementLots.length > 0 && (
          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 12, color: '#16a34a', marginBottom: 6 }}>
              ✓ {state.allotissementFileName} — {state.allotissementLots.length} lots détectés
            </div>
            <div style={{ maxHeight: 280, overflow: 'auto', border: '1px solid var(--border)', borderRadius: 4, padding: 8, fontSize: 12 }}>
              {state.allotissementLots.map(l => (
                <div key={l.numLot} style={{ padding: '2px 0' }}>
                  <strong style={{ display: 'inline-block', width: 36 }}>Lot {l.numLot}</strong> {l.objet}
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>

      <Nav canNext={state.allotissementLots.length > 0} next={next} prev={prev} />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// Step 3 — reportings fournisseurs (multi)
// ═══════════════════════════════════════════════════════════

function Step3({ state, update, cfg, next, prev }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [editMapIdx, setEditMapIdx] = useState(null);

  async function parseOne(file) {
    const r = await parseSupplierReporting(file, { nomenclature: state.nomenclature, profiles: getProfilesMap() });
    r._file = file;   // conservé pour pouvoir ré-appliquer un profil après édition
    return r;
  }

  async function onFiles(fileList) {
    setError(''); setLoading(true);
    try {
      const reportings = [...state.reportings];
      for (const file of fileList) {
        try { reportings.push(await parseOne(file)); }
        catch (e) { setError(`Erreur sur ${file.name} : ${e.message}`); }
      }
      update({ reportings });
    } finally { setLoading(false); }
  }

  // Re-parse tous les fichiers (après enregistrement/oubli d'un profil) pour ré-appliquer le mapping.
  async function reparseAll() {
    setLoading(true);
    try {
      const next = [];
      for (const r of state.reportings) {
        if (r._file) { try { next.push(await parseOne(r._file)); continue; } catch (_) { /* garde l'ancien */ } }
        next.push(r);
      }
      update({ reportings: next });
    } finally { setLoading(false); }
  }

  function remove(i) {
    const next = state.reportings.slice();
    next.splice(i, 1);
    update({ reportings: next });
    if (editMapIdx === i) setEditMapIdx(null);
  }

  async function onSaveProfile(fingerprint, roles, name) {
    saveProfile(fingerprint, { name, roles, savedAt: Date.now() });
    setEditMapIdx(null);
    await reparseAll();
  }
  async function onForgetProfile(fingerprint) {
    forgetProfile(fingerprint);
    setEditMapIdx(null);
    await reparseAll();
  }

  const totalLignes = state.reportings.reduce((s, r) => s + r.lignes.length, 0);

  return (
    <div>
      <Card title="Reportings fournisseurs">
        <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '0 0 8px' }}>
          Chargez tous les fichiers de reporting transmis par les fournisseurs pour ce marché (vous pouvez les sélectionner en une fois).
        </p>
        <FileInput accept=".xlsx,.xls" multiple onFile={onFiles} loading={loading} hint="Sélectionnez tous les fichiers de bons de commande remontés par les fournisseurs pour ce marché." />
        {error && <InfoBox kind="error">{error}</InfoBox>}

        {state.reportings.length > 0 && (
          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 12, marginBottom: 6 }}>
              <strong>{state.reportings.length}</strong> fichier{state.reportings.length > 1 ? 's' : ''} chargé{state.reportings.length > 1 ? 's' : ''} — {totalLignes} lignes au total
            </div>
            <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
                  <th style={{ padding: 6 }}>Fichier</th>
                  <th style={{ padding: 6 }}>Fournisseur</th>
                  <th style={{ padding: 6 }}>Détection</th>
                  <th style={{ padding: 6, textAlign: 'right' }}>Lignes</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {state.reportings.map((r, i) => (
                  <Fragment key={i}>
                    <tr style={{ borderBottom: '1px solid var(--border-soft, #f0f0f0)' }}>
                      <td style={{ padding: 6, fontFamily: 'DM Mono,monospace', fontSize: 11 }}>{r.fileName}</td>
                      <td style={{ padding: 6, fontWeight: 600 }}>{r.fournisseur}</td>
                      <td style={{ padding: 6 }}>
                        <DetectionBadge mode={r.mode} profileApplied={r.profileApplied} profileName={r.profileName} />
                      </td>
                      <td style={{ padding: 6, textAlign: 'right', color: r.lignes.length === 0 ? '#dc2626' : undefined, fontWeight: r.lignes.length === 0 ? 700 : 400 }}>{r.lignes.length}</td>
                      <td style={{ padding: 6, textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <button className="btn btn-xs btn-ghost" onClick={() => setEditMapIdx(editMapIdx === i ? null : i)} style={{ fontSize: 11 }}
                          title="Régler/mémoriser le mapping des colonnes pour ce type de fichier">⚙ Mapping</button>
                        <button className="btn btn-xs btn-ghost" onClick={() => remove(i)} style={{ fontSize: 11 }}>Retirer</button>
                      </td>
                    </tr>
                    {editMapIdx === i && (
                      <tr>
                        <td colSpan={5} style={{ padding: 0, background: '#F8FAFC' }}>
                          <MappingEditor
                            reporting={r}
                            onSave={(roles) => onSaveProfile(r.fingerprint, roles, r.fournisseur)}
                            onForget={() => onForgetProfile(r.fingerprint)}
                            onCancel={() => setEditMapIdx(null)}
                          />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
            <p style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 6 }}>
              ⚙ Mapping : si une colonne est mal détectée, corrigez-la une fois et « Enregistrer le profil » — tous les fichiers de la même structure (même empreinte) l'appliqueront automatiquement.
            </p>
          </div>
        )}
      </Card>

      <Nav canNext={state.reportings.length > 0 && cfg} next={next} prev={prev} />
    </div>
  );
}

function DetectionBadge({ mode, profileApplied, profileName }) {
  const label = mode === 'matrix' ? 'matrice' : 'transactionnel';
  const color = mode === 'matrix' ? { bg: '#ECFEFF', fg: '#0E7490' } : { bg: '#F0FDF4', fg: '#16a34a' };
  return (
    <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
      <span style={{ fontSize: 10, fontWeight: 700, background: color.bg, color: color.fg, borderRadius: 8, padding: '1px 7px' }}>{label}</span>
      {profileApplied && (
        <span style={{ fontSize: 10, fontWeight: 700, background: '#EEF2FF', color: '#4338CA', borderRadius: 8, padding: '1px 7px' }}
          title={`Profil mémorisé appliqué : ${profileName || ''}`}>profil ✓</span>
      )}
    </span>
  );
}

// Éditeur de mapping : associe chaque rôle BDD à une colonne du fichier (lettre Excel).
const MAPPING_ROLES = [
  { role: 'etablissement', label: 'Établissement' },
  { role: 'date',          label: 'Date' },
  { role: 'reference',     label: 'Référence' },
  { role: 'designation',   label: 'Désignation' },
  { role: 'quantite',      label: 'Quantité' },
  { role: 'montantTtc',    label: 'Montant TTC' },
  { role: 'lot',           label: 'N° de lot' },
];
const COL_LETTERS = Array.from({ length: 16 }, (_, i) => String.fromCharCode(65 + i)); // A..P

function MappingEditor({ reporting, onSave, onForget, onCancel }) {
  const [roles, setRoles] = useState(() => ({ ...(reporting.mapping || {}) }));
  const setRole = (role, val) => setRoles(r => {
    const next = { ...r };
    if (val === '') delete next[role]; else next[role] = Number(val);
    return next;
  });
  return (
    <div style={{ padding: 12 }}>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>
        Empreinte de structure : <span style={{ fontFamily: 'DM Mono,monospace', color: '#1f2937' }}>{reporting.fingerprint || '—'}</span>
        {reporting.profileApplied && <span style={{ color: '#4338CA', marginLeft: 8 }}>· profil actuellement appliqué</span>}
      </div>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        {MAPPING_ROLES.map(({ role, label }) => (
          <div key={role} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <label style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600 }}>{label}</label>
            <select value={roles[role] ?? ''} onChange={e => setRole(role, e.target.value)}
              style={{ padding: '3px 6px', fontSize: 11, border: '1px solid var(--border)', borderRadius: 4, minWidth: 90 }}>
              <option value="">— colonne —</option>
              {COL_LETTERS.map((L, idx) => <option key={idx} value={idx}>Col {L}</option>)}
            </select>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <button className="btn btn-xs btn-primary" style={{ fontSize: 11 }} onClick={() => onSave(roles)}>Enregistrer le profil</button>
        {reporting.profileApplied && <button className="btn btn-xs btn-outline" style={{ fontSize: 11 }} onClick={onForget}>Oublier le profil</button>}
        <button className="btn btn-xs btn-ghost" style={{ fontSize: 11 }} onClick={onCancel}>Annuler</button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// Step 4 — vérification & remplissage des lignes + export
// ═══════════════════════════════════════════════════════════

// Colonnes proposées au remplissage groupé (les colonnes "manuelles" à compléter).
// learnKey = clé dans learnedCfg.defaults (null = pas de valeur apprise, ex. année).
const BATCH_FIELDS = [
  { col: "Année d'installation",                          label: "Année d'installation",          step: 1,    learnKey: null,                hint: "déf. = année d'achat" },
  { col: 'Durée garantie (mois)',                         label: 'Durée garantie (mois)',          step: 1,    learnKey: 'dureeGarantieMois' },
  { col: 'Durée TCO -années',                             label: 'Durée TCO (années)',             step: 1,    learnKey: 'dureeTcoAnnees' },
  { col: 'Coût annuel du contrat de maintenance (TTC)',   label: 'Coût annuel maint. (TTC)',        step: 0.01, learnKey: 'coutMaintAnnuel' },
  { col: 'Gain/Achats de référence',                      label: 'Gain/Achats réf. (taux)',         step: 0.01, learnKey: 'gainRef' },
];

function Step4({ state, update, cfg, learnedCfg, onRebuild, prev, onClose }) {
  const { addRows } = useBddPending() || {};
  const [filter, setFilter] = useState('all');
  const [reconcileDone, setReconcileDone] = useState(false);

  // Réconciliation BDD→alias : déduit des correspondances libellé→CLCC en appariant
  // les montants des reportings aux lignes existantes de la BDD (même marché).
  const marcheLabel = learnedCfg?.excelMarcheLabel || cfg?.excelMarcheLabel || null;
  const derivedAliases = useMemo(() => {
    if (reconcileDone || !state.targetWb || !marcheLabel) return [];
    try {
      const bddRows = readBddRowsForMarket(state.targetWb, marcheLabel);
      if (!bddRows.length) return [];
      const lignes = state.reportings.flatMap(r => r.lignes);
      return deriveAliasesFromBdd(lignes, bddRows, state.nomenclature);
    } catch { return []; }
  }, [state.targetWb, marcheLabel, state.reportings, state.nomenclature, reconcileDone]);

  function applyReconciliation() {
    for (const d of derivedAliases) rememberUserAlias(d.raw, d.code);
    setReconcileDone(true);
    if (onRebuild) onRebuild();   // recalcule les lignes → les CLCC déduits passent au vert
  }

  const [adding, setAdding] = useState(false);
  const [expanded, setExpanded] = useState(new Set());
  // Valeurs du remplissage groupé, pré-saisies depuis les défauts appris de la BDD.
  const [batch, setBatch] = useState({});
  useEffect(() => {
    const d = learnedCfg?.defaults || {};
    setBatch({
      "Année d'installation": '',
      'Durée garantie (mois)': d.dureeGarantieMois != null ? Math.round(d.dureeGarantieMois) : '',
      'Durée TCO -années': d.dureeTcoAnnees != null ? Math.round(d.dureeTcoAnnees) : '',
      'Coût annuel du contrat de maintenance (TTC)': d.coutMaintAnnuel != null ? Math.round(d.coutMaintAnnuel * 100) / 100 : '',
      'Gain/Achats de référence': d.gainRef ?? '',
    });
  }, [learnedCfg]);

  const summary = useMemo(() => summarize(state.builtRows), [state.builtRows]);
  const indexedRows = useMemo(
    () => state.builtRows.map((r, i) => ({ row: r, idx: i })),
    [state.builtRows]
  );
  const visibleRows = useMemo(() => {
    if (filter === 'all') return indexedRows;
    return indexedRows.filter(({ row }) => row.status === filter);
  }, [indexedRows, filter]);
  const countIncluded = state.builtRows.length - state.excluded.size;

  // Refs vers l'état courant → callbacks stables (identité constante) pour ne pas
  // invalider la mémoïsation des lignes à chaque édition.
  const excludedRef = useRef(state.excluded); excludedRef.current = state.excluded;
  const editsRef = useRef(state.cellEdits);   editsRef.current = state.cellEdits;

  const toggleExclude = useCallback((idx) => {
    const next = new Set(excludedRef.current);
    if (next.has(idx)) next.delete(idx); else next.add(idx);
    update({ excluded: next });
  }, [update]);
  const toggleExpand = useCallback((idx) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx); else next.add(idx);
      return next;
    });
  }, []);
  const editCell = useCallback((idx, field, val) => {
    const cur = editsRef.current;
    update({ cellEdits: { ...cur, [idx]: { ...(cur[idx] || {}), [field]: val } } });
  }, [update]);
  // Édition de plusieurs champs en UNE fois (atomique) — nécessaire pour appliquer
  // une suggestion qui touche CLCC + type d'établissement sans écrasement.
  const editCells = useCallback((idx, patch) => {
    const cur = editsRef.current;
    update({ cellEdits: { ...cur, [idx]: { ...(cur[idx] || {}), ...patch } } });
  }, [update]);

  // Applique une (ou toutes les) valeur(s) du remplissage groupé à toutes les
  // lignes actuellement AFFICHÉES (filtre courant). Écrit dans cellEdits, donc
  // la valeur devient une saisie validée (cellule verte 'ok').
  function applyBatch(cols) {
    const cur = editsRef.current;
    const next = { ...cur };
    let touched = 0;
    for (const { idx } of visibleRows) {
      let rowEdits = null;
      for (const col of cols) {
        const v = batch[col];
        if (v === '' || v == null) continue;
        if (!rowEdits) rowEdits = { ...(next[idx] || {}) };
        rowEdits[col] = Number(v);
      }
      if (rowEdits) { next[idx] = rowEdits; touched++; }
    }
    if (touched) update({ cellEdits: next });
  }
  function expandAll() { setExpanded(new Set(visibleRows.map(({ idx }) => idx))); }
  function collapseAll() { setExpanded(new Set()); }
  function effectiveBdd(row, idx) {
    const override = state.cellEdits[idx] || {};
    return { ...row.bdd, ...override };
  }
  function doAddToPending() {
    setAdding(true);
    try {
      // Persiste les corrections CLCC manuelles : si l'utilisateur a édité le code
      // d'une ligne, on retient le mapping (libellé source → code corrigé) pour
      // que les prochains imports le reconnaissent automatiquement.
      for (const [idxStr, edits] of Object.entries(state.cellEdits || {})) {
        const idx = Number(idxStr);
        const row = state.builtRows[idx];
        if (!row) continue;
        const editedClcc = edits['CLCC unique'];
        if (!editedClcc) continue;
        // On utilise le libellé d'établissement BRUT du reporting (pas le code) comme clé.
        const sourceText = row.source?.rawEtablissement || row.match?.candidate?.nom || '';
        if (sourceText) rememberUserAlias(sourceText, editedClcc);
      }

      const toInsert = state.builtRows
        .map((r, i) => ({ r, i }))
        .filter(({ i }) => !state.excluded.has(i))
        .map(({ r, i }) => {
          const edits = state.cellEdits[i] || {};
          const editedFields = Object.keys(edits);
          return {
            bdd: effectiveBdd(r, i),
            source: r.source,
            warnings: r.warnings,
            meta: {
              kind: editedFields.length > 0 ? 'auto-edited' : 'auto',
              editedFields,
              originalConfidence: r.match?.confidence ?? null,
              originalStatus: r.status,
            },
          };
        });
      addRows(state.marcheId, toInsert);
      if (onClose) setTimeout(onClose, 200);
    } catch (e) { alert('Erreur : ' + e.message); }
    finally { setAdding(false); }
  }

  return (
    <div>
      <Card title="Récapitulatif">
        <div style={{ display: 'flex', gap: 16, fontSize: 13, marginBottom: 8, flexWrap: 'wrap' }}>
          <span><strong>{summary.total}</strong> lignes candidates</span>
          <span style={{ color: '#16a34a' }}>● {summary.ok} OK</span>
          <span style={{ color: '#f59e0b' }}>● {summary.warning} avertissement</span>
          <span style={{ color: '#dc2626' }}>● {summary.error} erreur</span>
          <span style={{ marginLeft: 'auto', color: 'var(--text-muted)' }}>
            À insérer : <strong>{countIncluded}</strong>
          </span>
        </div>

        <CellLegend />

        <BatchFillPanel
          batch={batch}
          setBatch={setBatch}
          learnedCfg={learnedCfg}
          visibleCount={visibleRows.length}
          onApply={applyBatch}
        />

        {derivedAliases.length > 0 && (
          <div style={{ border: '1px solid #C7D2FE', background: '#EEF2FF', borderRadius: 6, padding: '10px 12px', marginBottom: 10 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#3730A3', marginBottom: 4 }}>
              {derivedAliases.length} correspondance{derivedAliases.length > 1 ? 's' : ''} CLCC déduite{derivedAliases.length > 1 ? 's' : ''} de la BDD
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>
              Établissements non reconnus, rapprochés d'une ligne BDD existante par appariement du montant. Appliquer = mémoriser ces alias et recalculer.
            </div>
            <div style={{ maxHeight: 120, overflow: 'auto', fontSize: 11, marginBottom: 8 }}>
              {derivedAliases.map((d, i) => (
                <div key={i} style={{ padding: '1px 0' }}>
                  <span style={{ fontFamily: 'DM Mono,monospace' }}>“{d.raw}”</span> → <strong>{d.code}</strong>
                  {d.support > 1 && <span style={{ color: 'var(--text-muted)' }}> ·×{d.support}</span>}
                </div>
              ))}
            </div>
            <button className="btn btn-xs btn-primary" style={{ fontSize: 11 }} onClick={applyReconciliation}>
              Appliquer les {derivedAliases.length} correspondance{derivedAliases.length > 1 ? 's' : ''} et recalculer
            </button>
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
          {['all', 'ok', 'warning', 'error'].map(f => (
            <button key={f}
              className={'btn btn-xs ' + (filter === f ? 'btn-primary' : 'btn-outline')}
              onClick={() => setFilter(f)} style={{ fontSize: 11 }}>
              {f === 'all' ? 'Tout' : f === 'ok' ? 'OK' : f === 'warning' ? 'Avertissements' : 'Erreurs'}
            </button>
          ))}
          <span style={{ flex: 1 }} />
          <button className="btn btn-xs btn-outline" onClick={expandAll} style={{ fontSize: 11 }}>Tout déplier</button>
          <button className="btn btn-xs btn-outline" onClick={collapseAll} style={{ fontSize: 11 }}>Tout replier</button>
        </div>

        <div style={{ maxHeight: '58vh', overflow: 'auto', border: '1px solid var(--border)', borderRadius: 4 }}>
          <table style={{ width: '100%', fontSize: 11, borderCollapse: 'collapse' }}>
            <thead style={{ position: 'sticky', top: 0, background: '#F8FAFC', zIndex: 2 }}>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <th style={{ padding: 4, width: 24 }}></th>
                <th style={{ padding: 4, width: 24 }}></th>
                <th style={{ padding: 4 }}>CLCC</th>
                <th style={{ padding: 4 }}>Lot</th>
                <th style={{ padding: 4 }}>Type</th>
                <th style={{ padding: 4 }}>Fournisseur</th>
                <th style={{ padding: 4 }}>Désignation</th>
                <th style={{ padding: 4, textAlign: 'right' }}>Année</th>
                <th style={{ padding: 4, textAlign: 'right' }}>Qté</th>
                <th style={{ padding: 4, textAlign: 'right' }}>CA TTC</th>
                <th style={{ padding: 4 }}>Avertissements</th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.map(({ row: r, idx }) => (
                <BddRow
                  key={idx}
                  row={r}
                  idx={idx}
                  edits={state.cellEdits[idx]}
                  excluded={state.excluded.has(idx)}
                  isOpen={expanded.has(idx)}
                  nomenclature={state.nomenclature}
                  onToggleExclude={toggleExclude}
                  onToggleExpand={toggleExpand}
                  onEdit={editCell}
                  onEditMulti={editCells}
                />
              ))}
            </tbody>
          </table>
        </div>
        {/* Datalist CLCC unique partagée par toutes les cellules éditables (1 seule fois). */}
        <datalist id="bdd-clcc-list">
          {state.nomenclature.map((n, i) => <option key={i} value={n.nomenclature} />)}
        </datalist>
      </Card>

      <Nav
        prev={prev}
        canNext={countIncluded > 0 && !adding}
        nextLabel={adding ? 'Ajout...' : `Ajouter ${countIncluded} ligne${countIncluded > 1 ? 's' : ''} à la liste à exporter →`}
        next={doAddToPending}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Panneau de remplissage groupé : pré-saisi avec les valeurs apprises
// de la BDD, appliquable en masse aux lignes affichées (filtre courant).
// ─────────────────────────────────────────────────────────────
function BatchFillPanel({ batch, setBatch, learnedCfg, visibleCount, onApply }) {
  const hasLearned = !!(learnedCfg && learnedCfg.defaults);
  return (
    <div style={{ border: '1px solid #BAE6FD', background: '#F0FBFF', borderRadius: 6, padding: '10px 12px', marginBottom: 10 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: '#0E7490', marginBottom: 2 }}>
        Remplissage groupé des colonnes à compléter
      </div>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>
        {hasLearned
          ? <>Valeurs <strong>apprises de votre BDD</strong> (médianes). Vérifiez-les puis appliquez aux <strong>{visibleCount}</strong> ligne(s) affichée(s) — modifiable ensuite ligne par ligne.</>
          : <>Saisissez une valeur puis appliquez-la aux <strong>{visibleCount}</strong> ligne(s) affichée(s). <em>(Aucune valeur apprise : BDD non chargée ou marché non reconnu.)</em></>}
      </div>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        {BATCH_FIELDS.map(f => {
          const learned = f.learnKey && learnedCfg?.defaults?.[f.learnKey] != null;
          return (
            <div key={f.col} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                {f.label}
                {learned && <span style={{ background: '#CFFAFE', color: '#0E7490', borderRadius: 8, padding: '0 5px', fontSize: 8, fontWeight: 700 }}>appris</span>}
              </span>
              <div style={{ display: 'flex', gap: 4 }}>
                <input
                  type="number" step={f.step} value={batch[f.col] ?? ''} placeholder={f.hint || ''}
                  onChange={e => setBatch(b => ({ ...b, [f.col]: e.target.value }))}
                  style={{ width: 96, padding: '3px 6px', fontSize: 11, border: '1px solid var(--border)', borderRadius: 4 }}
                />
                <button className="btn btn-xs btn-outline" style={{ fontSize: 10 }}
                  onClick={() => onApply([f.col])} title="Appliquer cette valeur aux lignes affichées">
                  Appliquer
                </button>
              </div>
            </div>
          );
        })}
        <button className="btn btn-xs btn-primary" style={{ fontSize: 11, marginLeft: 'auto' }}
          onClick={() => onApply(BATCH_FIELDS.map(f => f.col))}
          title="Appliquer toutes les valeurs renseignées aux lignes affichées">
          Tout appliquer ↧
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Ligne du tableau de revue — MÉMOÏSÉE.
// Ne se re-rend que si SA propre donnée change (édition, exclusion,
// dépliage) : le statut des cellules n'est plus recalculé pour toutes
// les lignes à chaque frappe → étape 4 fluide même sur gros volumes.
// ─────────────────────────────────────────────────────────────
const BddRow = memo(function BddRow({
  row, idx, edits, excluded, isOpen, nomenclature, onToggleExclude, onToggleExpand, onEdit, onEditMulti,
}) {
  const b = useMemo(() => (edits ? { ...row.bdd, ...edits } : row.bdd), [row, edits]);
  const cellStatus = useMemo(
    () => computeCellStatus({ ...row, bdd: b }, edits ? Object.keys(edits) : null),
    [row, b, edits]
  );
  const rowBg = row.status === 'error' ? '#FEF2F2' : row.status === 'warning' ? '#FFFBEB' : undefined;
  const handleEdit = useCallback((field, val) => onEdit(idx, field, val), [onEdit, idx]);
  const handleEditMulti = useCallback((patch) => onEditMulti(idx, patch), [onEditMulti, idx]);

  return (
    <Fragment>
      <tr style={{ background: excluded ? '#F3F4F6' : rowBg, borderBottom: '1px solid #f0f0f0', opacity: excluded ? 0.5 : 1 }}>
        <td style={{ padding: 4, textAlign: 'center' }}>
          <input type="checkbox" checked={!excluded} onChange={() => onToggleExclude(idx)} />
        </td>
        <td style={{ padding: 4, textAlign: 'center', cursor: 'pointer', userSelect: 'none', color: 'var(--orange)', fontWeight: 700 }}
            onClick={() => onToggleExpand(idx)} title={isOpen ? 'Replier' : 'Déplier (toutes les colonnes)'}>
          {isOpen ? '▾' : '▸'}
        </td>
        <td style={{ padding: 3 }}><EditableCell col="CLCC unique" value={b['CLCC unique']} status={cellStatus['CLCC unique']} nomenclature={nomenclature} onChange={handleEdit} /></td>
        <td style={{ padding: 3, whiteSpace: 'nowrap' }}><EditableCell col="Lot" value={b['Lot']} status={cellStatus['Lot']} onChange={handleEdit} /></td>
        <td style={{ padding: 3 }}><EditableCell col="Type d'équipement" value={b["Type d'équipement"]} status={cellStatus["Type d'équipement"]} onChange={handleEdit} /></td>
        <td style={{ padding: 3, fontWeight: 600 }}><EditableCell col="Fournisseur" value={b['Fournisseur']} status={cellStatus['Fournisseur']} onChange={handleEdit} /></td>
        <td style={{ padding: 3 }}><EditableCell col="Nom equipement" value={b['Nom equipement']} status={cellStatus['Nom equipement']} onChange={handleEdit} ellipsis /></td>
        <td style={{ padding: 3, textAlign: 'right' }}><EditableCell col="Année" value={b['Année']} status={cellStatus['Année']} align="right" onChange={handleEdit} /></td>
        <td style={{ padding: 3, textAlign: 'right' }}><EditableCell col="QUANTITE" value={b['QUANTITE']} status={cellStatus['QUANTITE']} align="right" onChange={handleEdit} /></td>
        <td style={{ padding: 3, textAlign: 'right' }}><EditableCell col="CATTC" value={b['CATTC']} status={cellStatus['CATTC']} align="right" onChange={handleEdit} /></td>
        <td style={{ padding: 4, color: '#78350F' }}>{row.warnings?.join(' · ')}</td>
      </tr>
      {isOpen && (
        <tr>
          <td colSpan={11} style={{ padding: 0, background: '#FAFAFA' }}>
            <DetailGrid
              bdd={b}
              cellStatus={cellStatus}
              nomenclature={nomenclature}
              source={row.source}
              onEdit={handleEdit}
              onEditMulti={handleEditMulti}
            />
          </td>
        </tr>
      )}
    </Fragment>
  );
});

// Cellule cliquable : affiche du texte léger ; passe en champ de saisie au clic.
// Un seul champ est monté à la fois (celui en cours d'édition) → DOM léger.
// Rouge/orange si statut error/warning ; bordure discrète sinon (signale l'éditabilité).
function fmtCellVal(col, value) {
  if (col === 'CATTC') return typeof value === 'number' ? value.toFixed(2) : (value || '');
  return value == null ? '' : String(value);
}
function EditableCell({ col, value, status, nomenclature, align, ellipsis, onChange }) {
  const editor = COLUMN_EDITORS[col];
  const [editing, setEditing] = useState(false);
  const flag = status === 'error' || status === 'warning';
  const border = flag ? STATUS_BORDER[status] : '#E8EAED';
  const bg = flag ? STATUS_BG[status] : 'transparent';

  if (!editor) {
    return <span style={{ fontSize: 11 }}>{fmtCellVal(col, value)}</span>;
  }

  if (!editing) {
    const display = fmtCellVal(col, value);
    return (
      <span
        onClick={() => setEditing(true)}
        title="Cliquer pour modifier"
        style={{
          display: 'block',
          maxWidth: ellipsis ? 232 : undefined,
          overflow: ellipsis ? 'hidden' : undefined,
          textOverflow: ellipsis ? 'ellipsis' : undefined,
          whiteSpace: 'nowrap',
          background: bg, border: `1px solid ${border}`, borderRadius: 4,
          padding: '1px 5px', cursor: 'text', minHeight: 15,
          textAlign: align || 'left',
          color: display === '' ? '#CBD5E1' : '#1f2937',
        }}
      >
        {display === '' ? '∅' : display}
      </span>
    );
  }

  const commit = () => setEditing(false);
  const inputStyle = {
    width: '100%', padding: '1px 5px', fontSize: 11,
    border: `1px solid ${STATUS_BORDER[status] || 'var(--orange)'}`, borderRadius: 4,
    background: '#fff', textAlign: align || 'left', boxSizing: 'border-box',
  };
  const onKey = (e) => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') commit(); };

  if (editor.kind === 'clcc-select') {
    return <input autoFocus list="bdd-clcc-list" value={value || ''}
      onChange={e => onChange(col, e.target.value)} onBlur={commit} onKeyDown={onKey} style={inputStyle} />;
  }
  if (editor.kind === 'select') {
    return (
      <select autoFocus value={value || ''} onChange={e => onChange(col, e.target.value)} onBlur={commit} style={inputStyle}>
        <option value="">—</option>
        {editor.options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    );
  }
  if (editor.kind === 'number') {
    return <input autoFocus type="number" step={editor.step || 1}
      value={value === '' || value == null ? '' : value}
      onChange={e => onChange(col, e.target.value === '' ? '' : Number(e.target.value))}
      onBlur={commit} onKeyDown={onKey} style={{ ...inputStyle, textAlign: 'right' }} />;
  }
  return <input autoFocus type="text" value={value || ''}
    onChange={e => onChange(col, e.target.value)} onBlur={commit} onKeyDown={onKey} style={inputStyle} />;
}

// ─────────────────────────────────────────────────────────────
// Vue détail : grille des 28 cellules BDD pour la ligne courante.
// Chaque cellule : couleur selon statut + champ d'édition adapté.
// ─────────────────────────────────────────────────────────────

const STATUS_BG = {
  'ok':       '#D1FAE5',
  'warning':  '#FEF3C7',
  'error':    '#FEE2E2',
  'todo':     '#EEF2FF',
  'prefill':  '#ECFEFF',
  'empty-ok': '#FFFFFF',
  'formula':  '#EEF2F6',
};
const STATUS_BORDER = {
  'ok':       '#10B981',
  'warning':  '#F59E0B',
  'error':    '#DC2626',
  'todo':     '#6366F1',
  'prefill':  '#06B6D4',
  'empty-ok': '#E5E7EB',
  'formula':  '#94A3B8',
};

const COLUMN_GROUPS = [
  { title: 'Identité', cols: ['Etablissement', 'CLCC unique', 'Marché', "Type d'équipement", 'Lot'] },
  { title: 'Achat',    cols: ['Fournisseur', 'Nom equipement', "Date précise d'Achat", 'Année', "Année d'installation", 'QUANTITE', 'CATTC'] },
  { title: 'Maintenance & TCO', cols: ['Durée garantie (mois)', 'Coût annuel du contrat de maintenance (TTC)', 'Durée TCO -années', 'Année activation maintenance'] },
  { title: 'Gain/Achats (saisie)', cols: ['Gain/Achats de référence'] },
  { title: 'Calculé par Excel', cols: [
    'Contrat de maintenance en cours ?', 'Comptabilisé maintenance',
    "Coût maintenance total à aujourd'hui (Ficitf)", 'TCO Final TTC',
    "Coût maintenance total à aujourd'hui (Réel avec TCO)",
    'Potentiellement à renouveller (TCO terminé)\r\nATTENTION , si la durée TCO n\'est pas remplie',
    "Année de changement théorique \r\n(Annee d'installation + TCO)",
    'TCO en temps réel (A mettre en U?)',
    'Gain/Achats\r\n(euros)\r\nAncienne Formule DGOS',
    'Gain/Achats \r\nMaintenance (euros)',
    'Gain/Achats\r\n(euros)\r\nNouvelle formule DGOS',
  ]},
];

const COL_LETTER = (() => {
  const m = {};
  BDD_COLUMNS.forEach((c, i) => {
    let n = i, s = '';
    do { s = String.fromCharCode(65 + (n % 26)) + s; n = Math.floor(n / 26) - 1; } while (n >= 0);
    m[c] = s;
  });
  return m;
})();

function shortLabel(col) {
  // Réduit les libellés sur 2 lignes pour l'affichage
  return col.replace(/\r\n/g, ' ').replace(/\s+/g, ' ').trim();
}

function DetailGrid({ bdd, cellStatus, nomenclature, source, onEdit, onEditMulti }) {
  const rawEtab = source?.rawEtablissement || '';
  // Top-3 candidats CLCC pour ce libellé (suggestions de correction).
  const suggestions = useMemo(
    () => (rawEtab ? topCandidates(rawEtab, nomenclature, 3) : []),
    [rawEtab, nomenclature]
  );
  const applySuggestion = (s) => {
    if (onEditMulti) onEditMulti({ 'CLCC unique': s.nomenclature, 'Etablissement': s.type || bdd['Etablissement'] });
    else onEdit('CLCC unique', s.nomenclature);
  };
  return (
    <div style={{ padding: 12 }}>
      {source?.fileName && (
        <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 8 }}>
          Source : <span style={{ fontFamily: 'DM Mono,monospace' }}>{source.fileName}</span>
          {source.aggregated ? ` — ${source.aggregated} BC agrégés` : (source.row ? ` (ligne ${source.row})` : '')}
        </div>
      )}
      {rawEtab && (
        <div style={{ marginBottom: 10, fontSize: 11 }}>
          <span style={{ color: 'var(--text-muted)' }}>
            Libellé source : <span style={{ fontFamily: 'DM Mono,monospace', color: '#1f2937' }}>“{rawEtab}”</span>
          </span>
          {suggestions.length > 0 && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', marginTop: 4 }}>
              <span style={{ color: 'var(--text-muted)', fontSize: 10, fontWeight: 600 }}>Suggestions CLCC :</span>
              {suggestions.map((s, i) => {
                const isCurrent = s.nomenclature === bdd['CLCC unique'];
                const pct = Math.round(s.score * 100);
                const tone = s.score >= 0.7 ? '#10B981' : s.score >= 0.4 ? '#F59E0B' : '#94A3B8';
                return (
                  <button key={i} onClick={() => applySuggestion(s)} disabled={isCurrent}
                    title={`${s.nom}${s.ville ? ' — ' + s.ville : ''} · confiance ${pct}%`}
                    style={{
                      cursor: isCurrent ? 'default' : 'pointer', fontSize: 11,
                      border: `1px solid ${isCurrent ? '#10B981' : 'var(--border)'}`,
                      background: isCurrent ? '#D1FAE5' : '#fff', color: '#1f2937',
                      borderRadius: 999, padding: '2px 9px', display: 'inline-flex', alignItems: 'center', gap: 5,
                    }}>
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: tone, display: 'inline-block' }} />
                    <strong>{s.nomenclature}</strong>
                    <span style={{ color: 'var(--text-muted)', fontSize: 9 }}>{pct}%</span>
                    {isCurrent && <span style={{ color: '#059669', fontSize: 9 }}>✓ actuel</span>}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
      {COLUMN_GROUPS.map(group => (
        <div key={group.title} style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 700, marginBottom: 4 }}>
            {group.title}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 6 }}>
            {group.cols.map(col => (
              <DetailCell
                key={col}
                col={col}
                value={bdd[col]}
                status={cellStatus[col]}
                nomenclature={nomenclature}
                onChange={(v) => onEdit(col, v)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function DetailCell({ col, value, status, nomenclature, onChange }) {
  const editor = COLUMN_EDITORS[col];
  const isFormula = FORMULA_COLUMNS.has(col);
  const bg = STATUS_BG[status] || '#fff';
  const border = STATUS_BORDER[status] || '#E5E7EB';
  return (
    <div style={{ background: bg, border: `1px solid ${border}`, borderRadius: 4, padding: '6px 8px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
        <span style={{ fontSize: 9, color: 'var(--text-muted)', fontWeight: 600 }}>
          {COL_LETTER[col]} · {shortLabel(col).slice(0, 36)}
        </span>
        <StatusDot status={status} />
      </div>
      {isFormula ? (
        <div style={{ fontSize: 11, fontStyle: 'italic', color: '#475569' }}>
          → calculé par Excel
        </div>
      ) : !editor ? (
        <div style={{ fontSize: 11, color: '#1f2937' }}>{value || '—'}</div>
      ) : editor.kind === 'clcc-select' ? (
        <input list={`clcc-list-${col}`} value={value || ''}
          onChange={e => onChange(e.target.value)}
          style={{ width: '100%', padding: '3px 6px', fontSize: 11, border: 'none', background: 'transparent' }} />
      ) : editor.kind === 'select' ? (
        <select value={value || ''} onChange={e => onChange(e.target.value)}
          style={{ width: '100%', padding: '3px 6px', fontSize: 11, border: 'none', background: 'transparent' }}>
          <option value="">—</option>
          {editor.options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : editor.kind === 'number' ? (
        <input type="number" step={editor.step || 1} value={value === '' || value == null ? '' : value}
          onChange={e => onChange(e.target.value === '' ? '' : Number(e.target.value))}
          style={{ width: '100%', padding: '3px 6px', fontSize: 11, border: 'none', background: 'transparent' }} />
      ) : editor.kind === 'excel-serial-date' ? (
        <ExcelDateInput value={value} onChange={onChange} />
      ) : (
        <input type="text" value={value || ''} onChange={e => onChange(e.target.value)}
          style={{ width: '100%', padding: '3px 6px', fontSize: 11, border: 'none', background: 'transparent' }} />
      )}
      {editor?.kind === 'clcc-select' && (
        <datalist id={`clcc-list-${col}`}>
          {nomenclature.map((n, i) => <option key={i} value={n.nomenclature} />)}
        </datalist>
      )}
    </div>
  );
}

function StatusDot({ status }) {
  const color = STATUS_BORDER[status] || '#94A3B8';
  return <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: color }} />;
}

function CellPill({ status, children }) {
  const bg = STATUS_BG[status] || '#fff';
  const border = STATUS_BORDER[status] || '#E5E7EB';
  return (
    <span style={{ display: 'inline-block', background: bg, border: `1px solid ${border}`, borderRadius: 4, padding: '1px 6px' }}>
      {children}
    </span>
  );
}

function CellLegend() {
  const items = [
    { label: 'OK (confiance ≥ 70 %)', status: 'ok' },
    { label: 'À vérifier (40-70 %)',   status: 'warning' },
    { label: 'Erreur (vide ou < 40 %)', status: 'error' },
    { label: 'Pré-rempli (à vérifier)', status: 'prefill' },
    { label: 'À compléter (saisie acheteur)', status: 'todo' },
    { label: 'Optionnel — vide OK',    status: 'empty-ok' },
    { label: 'Calculé par Excel',      status: 'formula' },
  ];
  return (
    <div style={{ display: 'flex', gap: 12, fontSize: 11, color: 'var(--text-muted)', marginBottom: 10, flexWrap: 'wrap' }}>
      {items.map(i => (
        <span key={i.status} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <span style={{
            display: 'inline-block', width: 12, height: 12, borderRadius: 3,
            background: STATUS_BG[i.status], border: `1px solid ${STATUS_BORDER[i.status]}`,
          }} />
          {i.label}
        </span>
      ))}
    </div>
  );
}

// Champ d'édition pour une date stockée en serial Excel.
const JS_EPOCH_UTC_BB = Date.UTC(1899, 11, 30);
function excelSerialToISO(n) {
  if (n == null || n === '' || isNaN(Number(n))) return '';
  const d = new Date(JS_EPOCH_UTC_BB + Math.round(Number(n)) * 86400000);
  return d.toISOString().slice(0, 10);
}
function isoToExcelSerial(iso) {
  if (!iso) return '';
  const d = new Date(iso + 'T00:00:00Z');
  if (isNaN(d.getTime())) return '';
  return Math.round((d.getTime() - JS_EPOCH_UTC_BB) / 86400000);
}
function ExcelDateInput({ value, onChange }) {
  const iso = useMemo(() => excelSerialToISO(value), [value]);
  return (
    <input type="date" value={iso}
      onChange={e => onChange(e.target.value ? isoToExcelSerial(e.target.value) : '')}
      style={{ width: '100%', padding: '3px 6px', fontSize: 11, border: 'none', background: 'transparent' }} />
  );
}

// ═══════════════════════════════════════════════════════════
// Helpers UI
// ═══════════════════════════════════════════════════════════

function Card({ title, children, style }) {
  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 6, padding: 12, background: '#fff', ...style }}>
      {title && <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-2, #334155)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>{title}</div>}
      {children}
    </div>
  );
}

function InfoBox({ kind, children }) {
  const palette = {
    error: { bg: '#FEE2E2', col: '#991B1B' },
    warn:  { bg: '#FEF3C7', col: '#78350F' },
    info:  { bg: '#DBEAFE', col: '#1E3A8A' },
  }[kind] || { bg: '#F3F4F6', col: 'var(--text)' };
  return (
    <div style={{ marginTop: 8, padding: 8, background: palette.bg, color: palette.col, fontSize: 12, borderRadius: 4 }}>
      {children}
    </div>
  );
}

function FileInput({ accept, multiple, onFile, loading, hint }) {
  const ref = useRef();
  const [dragOver, setDragOver] = useState(false);
  function handleFiles(list) {
    if (!list || list.length === 0) return;
    if (multiple) onFile(Array.from(list));
    else onFile(list[0]);
  }
  return (
    <div
      className={'drop-zone' + (dragOver ? ' drag-over' : '')}
      onDragOver={e => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={e => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
      onClick={() => ref.current?.click()}
      style={{ cursor: 'pointer', padding: 28 }}
    >
      <input ref={ref} type="file" accept={accept} multiple={multiple}
        style={{ display: 'none' }}
        onChange={e => { handleFiles(e.target.files); e.target.value = ''; }} />
      <div className="drop-icon" aria-hidden="true">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--orange)' }}>
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
      </div>
      {loading ? (
        <div className="drop-title">Chargement…</div>
      ) : (
        <>
          <div className="drop-title">
            Glisser {multiple ? 'les fichiers' : 'un fichier'} ici ou <span style={{ color: 'var(--orange)' }}>parcourir</span>
          </div>
          {hint && <div className="drop-sub">{hint}</div>}
        </>
      )}
    </div>
  );
}

function Nav({ prev, next, canNext, nextLabel }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16 }}>
      <div>{prev && <button className="btn btn-outline" onClick={prev}>← Précédent</button>}</div>
      <div>{next && <button className="btn btn-primary" onClick={next} disabled={!canNext}>{nextLabel || 'Suivant →'}</button>}</div>
    </div>
  );
}

