import { useState, useMemo, useRef, useEffect, Fragment } from 'react';
import * as XLSX from 'xlsx-js-style';
import { marches } from '../../../data/mockData';
import { getInvestConfig, isInvestConfigured, hasFullInvestConfig } from '../../../data/marcheInvestConfig';
import { parseAllotissement } from '../../../utils/bddBuilder/parseAllotissement';
import { parseSupplierReporting } from '../../../utils/bddBuilder/parseSupplierReporting';
import { loadNomenclature } from '../../../utils/bddBuilder/matchClcc';
import { buildBddRows, summarize, computeCellStatus, BDD_COLUMNS, FORMULA_COLUMNS, COLUMN_EDITORS } from '../../../utils/bddBuilder/buildBddRows';
import { rememberUserAlias } from '../../../utils/bddBuilder/userAliases';
import { learnConfigFromBdd, findMatchingBddMarcheLabel } from '../../../utils/bddBuilder/learnConfigFromBdd';
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

  const update = (patch) => setState(s => ({ ...s, ...patch }));
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
        {step === 4 && <Step4 state={state} update={update} cfg={cfg} prev={() => setStep(3)} onClose={onClose} />}
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
  { n: 4, label: 'Vérification & export' },
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

  async function onFiles(fileList) {
    setError(''); setLoading(true);
    try {
      const reportings = [...state.reportings];
      for (const file of fileList) {
        try {
          const r = await parseSupplierReporting(file);
          reportings.push(r);
        } catch (e) {
          setError(`Erreur sur ${file.name} : ${e.message}`);
        }
      }
      update({ reportings });
    } finally {
      setLoading(false);
    }
  }

  function remove(i) {
    const next = state.reportings.slice();
    next.splice(i, 1);
    update({ reportings: next });
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
              <strong>{state.reportings.length}</strong> fichier{state.reportings.length > 1 ? 's' : ''} chargé{state.reportings.length > 1 ? 's' : ''} — {totalLignes} lignes de bons de commande au total
            </div>
            <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
                  <th style={{ padding: 6 }}>Fichier</th>
                  <th style={{ padding: 6 }}>Fournisseur détecté</th>
                  <th style={{ padding: 6, textAlign: 'right' }}>Lignes</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {state.reportings.map((r, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--border-soft, #f0f0f0)' }}>
                    <td style={{ padding: 6, fontFamily: 'DM Mono,monospace', fontSize: 11 }}>{r.fileName}</td>
                    <td style={{ padding: 6, fontWeight: 600 }}>{r.fournisseur}</td>
                    <td style={{ padding: 6, textAlign: 'right' }}>{r.lignes.length}</td>
                    <td style={{ padding: 6, textAlign: 'right' }}>
                      <button className="btn btn-xs btn-ghost" onClick={() => remove(i)} style={{ fontSize: 11 }}>Retirer</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Nav canNext={state.reportings.length > 0 && cfg} next={next} prev={prev} />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// Step 4 — revue des lignes + export
// ═══════════════════════════════════════════════════════════

function Step4({ state, update, prev, onClose }) {
  const { addRows } = useBddPending() || {};
  const [filter, setFilter] = useState('all');
  const [adding, setAdding] = useState(false);
  const [expanded, setExpanded] = useState(new Set());

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

  function toggleExclude(idx) {
    const next = new Set(state.excluded);
    if (next.has(idx)) next.delete(idx); else next.add(idx);
    update({ excluded: next });
  }
  function toggleExpand(idx) {
    const next = new Set(expanded);
    if (next.has(idx)) next.delete(idx); else next.add(idx);
    setExpanded(next);
  }
  function expandAll() { setExpanded(new Set(visibleRows.map(({ idx }) => idx))); }
  function collapseAll() { setExpanded(new Set()); }
  function editCell(idx, field, val) {
    const edits = { ...state.cellEdits, [idx]: { ...(state.cellEdits[idx] || {}), [field]: val } };
    update({ cellEdits: edits });
  }
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

        <div style={{ maxHeight: 580, overflow: 'auto', border: '1px solid var(--border)', borderRadius: 4 }}>
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
              {visibleRows.map(({ row: r, idx }) => {
                const excluded = state.excluded.has(idx);
                const b = effectiveBdd(r, idx);
                const isOpen = expanded.has(idx);
                const cellStatus = computeCellStatus({ ...r, bdd: b });
                const rowBg = r.status === 'error' ? '#FEF2F2' : r.status === 'warning' ? '#FFFBEB' : undefined;
                return (
                  <Fragment key={idx}>
                    <tr style={{ background: excluded ? '#F3F4F6' : rowBg, borderBottom: '1px solid #f0f0f0', opacity: excluded ? 0.5 : 1 }}>
                      <td style={{ padding: 4, textAlign: 'center' }}>
                        <input type="checkbox" checked={!excluded} onChange={() => toggleExclude(idx)} />
                      </td>
                      <td style={{ padding: 4, textAlign: 'center', cursor: 'pointer', userSelect: 'none', color: 'var(--orange)', fontWeight: 700 }}
                          onClick={() => toggleExpand(idx)} title={isOpen ? 'Replier' : 'Déplier'}>
                        {isOpen ? '▾' : '▸'}
                      </td>
                      <td style={{ padding: 4 }}><CellPill status={cellStatus['CLCC unique']}>{b['CLCC unique'] || '∅'}</CellPill></td>
                      <td style={{ padding: 4, whiteSpace: 'nowrap' }}>{b['Lot']}</td>
                      <td style={{ padding: 4 }}><CellPill status={cellStatus["Type d'équipement"]}>{b["Type d'équipement"] || '∅'}</CellPill></td>
                      <td style={{ padding: 4, fontWeight: 600 }}>{b['Fournisseur']}</td>
                      <td style={{ padding: 4, maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={b['Nom equipement']}>{b['Nom equipement']}</td>
                      <td style={{ padding: 4, textAlign: 'right' }}>{b['Année'] || '—'}</td>
                      <td style={{ padding: 4, textAlign: 'right' }}>{b['QUANTITE']}</td>
                      <td style={{ padding: 4, textAlign: 'right' }}>{typeof b['CATTC'] === 'number' ? b['CATTC'].toFixed(2) : ''}</td>
                      <td style={{ padding: 4, color: '#78350F' }}>{r.warnings?.join(' · ')}</td>
                    </tr>
                    {isOpen && (
                      <tr key={idx + '-detail'}>
                        <td colSpan={11} style={{ padding: 0, background: '#FAFAFA' }}>
                          <DetailGrid
                            bdd={b}
                            cellStatus={cellStatus}
                            nomenclature={state.nomenclature}
                            source={r.source}
                            onEdit={(field, val) => editCell(idx, field, val)}
                          />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
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
// Vue détail : grille des 28 cellules BDD pour la ligne courante.
// Chaque cellule : couleur selon statut + champ d'édition adapté.
// ─────────────────────────────────────────────────────────────

const STATUS_BG = {
  'ok':       '#D1FAE5',
  'warning':  '#FEF3C7',
  'error':    '#FEE2E2',
  'empty-ok': '#FFFFFF',
  'formula':  '#EEF2F6',
};
const STATUS_BORDER = {
  'ok':       '#10B981',
  'warning':  '#F59E0B',
  'error':    '#DC2626',
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

function DetailGrid({ bdd, cellStatus, nomenclature, source, onEdit }) {
  return (
    <div style={{ padding: 12 }}>
      {source?.fileName && (
        <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 8 }}>
          Source : <span style={{ fontFamily: 'DM Mono,monospace' }}>{source.fileName}</span>
          {source.aggregated ? ` — ${source.aggregated} BC agrégés` : (source.row ? ` (ligne ${source.row})` : '')}
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

