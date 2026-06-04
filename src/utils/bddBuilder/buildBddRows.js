import { matchEtablissement } from './matchClcc.js';
import { canonFournisseur } from './fournisseurCanon.js';

// ═══════════════════════════════════════════════════════════
// Assemble les lignes BDD finales à partir des lignes fournisseur
// parsées et de la config du marché.
// Chaque ligne de sortie a :
//  - bdd : objet keyed by nom de colonne BDD (tel qu'attendu par l'export xlsx)
//  - source : { fileName, sheet, row } pour traçabilité
//  - status : 'ok' | 'warning' | 'error'
//  - warnings : string[]
// ═══════════════════════════════════════════════════════════

export const BDD_COLUMNS = [
  'Etablissement',                                          // A
  'CLCC unique',                                            // B
  'Marché',                                                 // C
  "Type d'équipement",                                      // D
  'Lot',                                                    // E
  'Fournisseur',                                            // F
  'Nom equipement',                                         // G
  "Date précise d'Achat",                                   // H
  'Année',                                                  // I
  "Année d'installation",                                   // J
  'QUANTITE',                                               // K
  'CATTC',                                                  // L
  'Durée garantie (mois)',                                  // M
  'Contrat de maintenance en cours ?',                      // N
  'Coût annuel du contrat de maintenance (TTC)',            // O
  'Durée TCO -années',                                      // P
  'Comptabilisé maintenance',                               // Q (formule)
  "Coût maintenance total à aujourd'hui (Ficitf)",          // R (formule)
  'Année activation maintenance',                           // S
  'TCO Final TTC',                                          // T (formule)
  "Coût maintenance total à aujourd'hui (Réel avec TCO)",   // U (formule)
  'Potentiellement à renouveller (TCO terminé)\r\nATTENTION , si la durée TCO n\'est pas remplie', // V
  "Année de changement théorique \r\n(Annee d'installation + TCO)",  // W
  'TCO en temps réel (A mettre en U?)',                     // X (formule)
  'Gain/Achats de référence',                               // Y
  'Gain/Achats\r\n(euros)\r\nAncienne Formule DGOS',        // Z
  'Gain/Achats \r\nMaintenance (euros)',                    // AA (formule)
  'Gain/Achats\r\n(euros)\r\nNouvelle formule DGOS',        // AB
];

// Colonnes calculées par formule Excel — pas de remplissage côté algo.
export const FORMULA_COLUMNS = new Set([
  'Contrat de maintenance en cours ?',
  'Comptabilisé maintenance',
  "Coût maintenance total à aujourd'hui (Ficitf)",
  'Année activation maintenance',
  'TCO Final TTC',
  "Coût maintenance total à aujourd'hui (Réel avec TCO)",
  'Potentiellement à renouveller (TCO terminé)\r\nATTENTION , si la durée TCO n\'est pas remplie',
  "Année de changement théorique \r\n(Annee d'installation + TCO)",
  'TCO en temps réel (A mettre en U?)',
  'Gain/Achats\r\n(euros)\r\nAncienne Formule DGOS',
  'Gain/Achats \r\nMaintenance (euros)',
  'Gain/Achats\r\n(euros)\r\nNouvelle formule DGOS',
]);

// Colonnes obligatoires pour avoir une ligne « propre » (sans erreur critique).
// Le taux Gain/Achats de référence est volontairement obligatoire : il doit être
// renseigné par l'acheteur à la revue (négocié au cas par cas, jamais auto-rempli).
export const REQUIRED_COLUMNS = new Set([
  'Etablissement', 'CLCC unique', 'Marché', "Type d'équipement", 'Lot',
  'Fournisseur', 'Nom equipement', 'Année', 'QUANTITE', 'CATTC',
  'Gain/Achats de référence',
]);

// Colonnes optionnelles : leur absence n'est pas problématique (signal "empty-ok").
export const OPTIONAL_COLUMNS = new Set([
  "Année d'installation", 'Durée garantie (mois)',
  'Coût annuel du contrat de maintenance (TTC)', 'Durée TCO -années',
  "Date précise d'Achat",
]);

const JS_EPOCH_UTC = Date.UTC(1899, 11, 30);

function dateToExcelSerial(d) {
  if (!d) return '';
  const ms = d.getTime();
  return Math.round((ms - JS_EPOCH_UTC) / 86400000);
}

function resolveTypeEquipement(numLot, lotLabel, cfg, learnedCfg) {
  // 1. Config manuelle par n° de lot (priorité haute)
  if (cfg.typeEquipementByLot && cfg.typeEquipementByLot[numLot]) {
    return cfg.typeEquipementByLot[numLot];
  }
  // 2. Config apprise depuis la BDD : par libellé de lot complet
  if (learnedCfg?.typeEquipementByLotLabel?.[lotLabel]) {
    return learnedCfg.typeEquipementByLotLabel[lotLabel];
  }
  // 3. Range consommables (manuel ou appris)
  if (isConsommableLot(numLot, cfg, learnedCfg)) {
    return cfg.typeEquipementDefaultForConsommables
        || learnedCfg?.typeEquipementDefaultForConsommables
        || 'Consommables';
  }
  return '';
}

function isConsommableLot(numLot, cfg, learnedCfg) {
  const range = cfg.consommablesLotRange || learnedCfg?.consommablesLotRange;
  return !!(range && numLot >= range[0] && numLot <= range[1]);
}

function resolveLotLabel(numLot, cfg, learnedCfg) {
  if (isConsommableLot(numLot, cfg, learnedCfg)) {
    const grouped = cfg.consommablesGroupedLotLabel || learnedCfg?.consommablesGroupedLotLabel;
    if (grouped) return grouped;
  }
  return cfg.lotLabel(numLot);
}

function makeEmptyBdd() {
  return {
    'Etablissement':                                          '',
    'CLCC unique':                                            '',
    'Marché':                                                 '',
    "Type d'équipement":                                      '',
    'Lot':                                                    '',
    'Fournisseur':                                            '',
    'Nom equipement':                                         '',
    "Date précise d'Achat":                                   '',
    'Année':                                                  '',
    "Année d'installation":                                   '',
    'QUANTITE':                                               '',
    'CATTC':                                                  '',
    'Durée garantie (mois)':                                  '',
    'Contrat de maintenance en cours ?':                      '',
    'Coût annuel du contrat de maintenance (TTC)':            '',
    'Durée TCO -années':                                      '',
    'Comptabilisé maintenance':                               '',
    "Coût maintenance total à aujourd'hui (Ficitf)":          '',
    'Année activation maintenance':                           '',
    'TCO Final TTC':                                          '',
    "Coût maintenance total à aujourd'hui (Réel avec TCO)":   '',
    'Potentiellement à renouveller (TCO terminé)\r\nATTENTION , si la durée TCO n\'est pas remplie': '',
    "Année de changement théorique \r\n(Annee d'installation + TCO)": '',
    'TCO en temps réel (A mettre en U?)':                     '',
    'Gain/Achats de référence':                               '',
    'Gain/Achats\r\n(euros)\r\nAncienne Formule DGOS':        '',
    'Gain/Achats \r\nMaintenance (euros)':                    '',
    'Gain/Achats\r\n(euros)\r\nNouvelle formule DGOS':        '',
  };
}

// Construit une ligne BDD à partir d'UNE ligne fournisseur (mode équipement, 1 BC = 1 ligne).
function buildIndividualRow({ ligne, fournisseur, fileName, cfg, nomenclature, learnedCfg }) {
  const warnings = [];
  const match = matchEtablissement(ligne.etablissement, nomenclature);
  if (!match.nomenclature) warnings.push(`Établissement non reconnu : "${ligne.etablissement}"`);
  else if (match.confidence < 0.7) warnings.push(`Établissement faible confiance (${match.confidence.toFixed(2)}) : "${ligne.etablissement}" → ${match.nomenclature}`);

  const lotLabel = resolveLotLabel(ligne.numLot, cfg, learnedCfg);
  const typeEquip = resolveTypeEquipement(ligne.numLot, lotLabel, cfg, learnedCfg);
  const fournisseurCanon = canonFournisseur(fournisseur);

  if (!ligne.quantite || ligne.quantite <= 0) warnings.push(`Quantité nulle`);
  if (!ligne.montantTtc || ligne.montantTtc <= 0) warnings.push(`Montant TTC nul`);
  warnings.push(`Taux Gain/Achats à renseigner manuellement`);

  const bdd = makeEmptyBdd();
  bdd['Etablissement']             = match.type || '';
  bdd['CLCC unique']               = match.nomenclature || '';
  bdd['Marché']                    = cfg.excelMarcheLabel;
  bdd["Type d'équipement"]         = typeEquip;
  bdd['Lot']                       = lotLabel;
  bdd['Fournisseur']               = fournisseurCanon;
  bdd['Nom equipement']            = ligne.designation || '';
  bdd["Date précise d'Achat"]      = ligne.date ? dateToExcelSerial(ligne.date) : '';
  bdd['Année']                     = ligne.annee || '';
  bdd['QUANTITE']                  = ligne.quantite ?? '';
  bdd['CATTC']                     = ligne.montantTtc ?? '';
  bdd['Année activation maintenance'] = ligne.anneeActivationMaintenance ?? '';
  // Gain/Achats de référence : volontairement laissé vide.
  // L'acheteur DOIT le renseigner à l'étape de revue (la cellule apparaît en rouge).

  const hasCritical = warnings.some(w => /non reconnu|Quantité nulle|Montant TTC nul/i.test(w));
  const status = hasCritical ? 'error' : (warnings.length > 0 ? 'warning' : 'ok');

  return {
    bdd,
    source: {
      fileName, sheet: ligne.sourceSheet, row: ligne.sourceRow,
      rawEtablissement: ligne.etablissement,
    },
    match,
    status,
    warnings,
  };
}

// Construit une ligne BDD AGRÉGÉE pour les consommables (somme TTC sur le tuple).
function buildAggregatedConsommableRow({ tuple, lignes, cfg }) {
  const warnings = [];
  const totalTtc = lignes.reduce((s, l) => s + (Number(l.montantTtc) || 0), 0);
  const fileNames = [...new Set(lignes.map(l => l.fileName))];

  if (totalTtc === 0) warnings.push(`Aucun montant TTC pour ce groupe`);
  if (!tuple.clcc) warnings.push(`CLCC non identifié`);
  warnings.push(`Taux Gain/Achats à renseigner manuellement`);

  const bdd = makeEmptyBdd();
  bdd['Etablissement']     = tuple.etabType;
  bdd['CLCC unique']       = tuple.clcc;
  bdd['Marché']            = cfg.excelMarcheLabel;
  bdd["Type d'équipement"] = tuple.typeEquip;
  bdd['Lot']               = tuple.lotLabel;
  bdd['Fournisseur']       = tuple.fournisseur;
  bdd['Nom equipement']    = tuple.fournisseur;   // BDD : pour les consommables, le "nom" = nom du fournisseur
  bdd['Année']             = tuple.annee;
  bdd['QUANTITE']          = 1;                    // BDD : qté = 1 pour les consommables agrégés
  bdd['CATTC']             = totalTtc;
  // Gain/Achats de référence laissé vide : à renseigner par l'acheteur en revue.

  const hasCritical = !tuple.clcc;
  const status = hasCritical ? 'error' : (warnings.length > 0 ? 'warning' : 'ok');

  return {
    bdd,
    source: {
      fileName: fileNames.join(' + '),
      aggregated: lignes.length,
      // Pour les agrégats, on conserve le libellé d'origine de la première ligne
      // afin de pouvoir mémoriser un alias si l'utilisateur corrige le CLCC.
      rawEtablissement: lignes[0]?.etablissement || '',
    },
    status,
    warnings,
  };
}

/**
 * Construit toutes les lignes BDD à partir des reportings fournisseur parsés.
 * - Lots équipement (hors plage consommables) → 1 ligne par BC
 * - Lots consommables (dans plage consommables) → 1 ligne agrégée par
 *   (CLCC, Fournisseur canonique, Année, Lot label, Type) avec somme du CATTC
 *
 * @param {Array<{fournisseur, fileName, lignes}>} reportings
 * @param {Object} marcheConfig - de marcheInvestConfig.js
 * @param {Array} nomenclature - de matchClcc.loadNomenclature
 * @returns Array<{ bdd, source, match?, status, warnings }>
 */
// Déduplication cross-fichier : si deux reportings (ex. 1 mid-year + 1 end-year)
// décrivent les mêmes BC, on ne compte chaque BC qu'une fois.
// Clé stricte : numLot + etab + désignation + référence + qté + montants + date.
function dedupeAcrossFiles(reportings) {
  const seen = new Map();
  let removed = 0;
  for (const rpt of reportings) {
    for (const l of rpt.lignes) {
      const k = [
        l.numLot,
        String(l.etablissement || '').toLowerCase().trim(),
        String(l.designation || '').toLowerCase().trim(),
        String(l.reference || '').toLowerCase().trim(),
        l.quantite || 0,
        Math.round((l.montantTtc || 0) * 100),
        Math.round((l.prixTtc || 0) * 100),
        l.date ? l.date.toISOString() : '',
      ].join('|');
      if (seen.has(k)) { removed++; continue; }
      seen.set(k, { ligne: l, fournisseur: rpt.fournisseur, fileName: rpt.fileName });
    }
  }
  return { unique: [...seen.values()], removed };
}

/**
 * @param {Array} reportings
 * @param {Object} marcheConfig
 * @param {Array} nomenclature
 * @param {Object} [learnedCfg] - config apprise depuis la BDD existante (optionnel)
 */
export function buildBddRows(reportings, marcheConfig, nomenclature, learnedCfg = null) {
  const individualRows = [];
  const consommableBuckets = new Map();

  const { unique } = dedupeAcrossFiles(reportings);

  for (const { ligne, fournisseur, fileName } of unique) {
    const fournisseurCanon = canonFournisseur(fournisseur);
    if (!isConsommableLot(ligne.numLot, marcheConfig, learnedCfg)) {
      individualRows.push(buildIndividualRow({
        ligne, fournisseur, fileName, cfg: marcheConfig, nomenclature, learnedCfg,
      }));
      continue;
    }
    // Mode consommables : on accumule
    const match = matchEtablissement(ligne.etablissement, nomenclature);
    const annee = ligne.annee || '';
    const lotLabel = resolveLotLabel(ligne.numLot, marcheConfig, learnedCfg);
    const tuple = {
      annee,
      clcc: match.nomenclature,
      etabType: match.type,
      fournisseur: fournisseurCanon,
      lotLabel,
      typeEquip: resolveTypeEquipement(ligne.numLot, lotLabel, marcheConfig, learnedCfg),
    };
    const key = `${tuple.annee}|${tuple.clcc}|${tuple.fournisseur}|${tuple.lotLabel}|${tuple.typeEquip}`;
    let bucket = consommableBuckets.get(key);
    if (!bucket) {
      bucket = { tuple, lignes: [] };
      consommableBuckets.set(key, bucket);
    }
    bucket.lignes.push({ ...ligne, fileName });
  }

  const aggregatedRows = [...consommableBuckets.values()].map(b =>
    buildAggregatedConsommableRow({ tuple: b.tuple, lignes: b.lignes, cfg: marcheConfig })
  );

  return [...individualRows, ...aggregatedRows];
}

export function summarize(rows) {
  const s = { total: rows.length, ok: 0, warning: 0, error: 0 };
  for (const r of rows) s[r.status]++;
  return s;
}

/**
 * Calcule le statut visuel d'une cellule pour la vue revue.
 * Statuts possibles :
 *   - 'formula'  : cellule calculée par Excel (gris, non éditable)
 *   - 'ok'       : valeur présente avec haute confiance (vert)
 *   - 'warning'  : valeur présente mais incertaine — confiance < 70 % (orange)
 *   - 'error'    : valeur attendue mais manquante / confiance < 40 % (rouge)
 *   - 'empty-ok' : cellule optionnelle laissée vide intentionnellement (blanc/neutre)
 *
 * Utilise la confiance du match CLCC (row.match.confidence) pour propager
 * l'incertitude sur les colonnes Etablissement et CLCC unique.
 */
export function computeCellStatus(row) {
  const bdd = row.bdd;
  const conf = row.match?.confidence ?? null;
  const out = {};
  const isEmpty = (v) => v === '' || v == null || (typeof v === 'number' && !Number.isFinite(v));

  for (const col of BDD_COLUMNS) {
    if (FORMULA_COLUMNS.has(col)) { out[col] = 'formula'; continue; }
    const val = bdd[col];
    const empty = isEmpty(val) || (col === 'QUANTITE' && Number(val) === 0) || (col === 'CATTC' && Number(val) === 0);

    if (col === 'CLCC unique' || col === 'Etablissement') {
      if (empty) out[col] = 'error';
      else if (conf != null && conf < 0.4) out[col] = 'error';
      else if (conf != null && conf < 0.7) out[col] = 'warning';
      else out[col] = 'ok';
      continue;
    }

    if (REQUIRED_COLUMNS.has(col)) {
      out[col] = empty ? 'error' : 'ok';
      continue;
    }
    if (OPTIONAL_COLUMNS.has(col)) {
      out[col] = empty ? 'empty-ok' : 'ok';
      continue;
    }
    // Colonnes restantes (ex: Gain/Achats de référence) : ok si remplie, neutre sinon.
    out[col] = empty ? 'empty-ok' : 'ok';
  }
  return out;
}

// Type d'éditeur recommandé pour chaque colonne (pour l'UI Step 4).
export const COLUMN_EDITORS = {
  'Etablissement':                      { kind: 'select', options: ['Unicancer', 'Etablissement affilié'] },
  'CLCC unique':                        { kind: 'clcc-select' },
  'Marché':                             { kind: 'text' },
  "Type d'équipement":                  { kind: 'text' },
  'Lot':                                { kind: 'text' },
  'Fournisseur':                        { kind: 'text' },
  'Nom equipement':                     { kind: 'text' },
  "Date précise d'Achat":               { kind: 'excel-serial-date' },
  'Année':                              { kind: 'number', step: 1 },
  "Année d'installation":               { kind: 'number', step: 1 },
  'QUANTITE':                           { kind: 'number', step: 1 },
  'CATTC':                              { kind: 'number', step: 0.01 },
  'Durée garantie (mois)':              { kind: 'number', step: 1 },
  'Coût annuel du contrat de maintenance (TTC)': { kind: 'number', step: 0.01 },
  'Durée TCO -années':                  { kind: 'number', step: 1 },
  'Année activation maintenance':       { kind: 'number', step: 1 },
  'Gain/Achats de référence':           { kind: 'number', step: 0.01 },
};
