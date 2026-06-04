// ═══════════════════════════════════════════════════════════
// Apprentissage automatique des conventions par marché à partir
// de la BDD (Suivi_Invest) existante.
//
// Pour chaque marché distinct trouvé dans la BDD, on extrait :
//   - le libellé attendu en col C "Marché"
//   - les libellés de lots (col E) avec leur fréquence
//   - pour chaque lot, le type d'équipement majoritaire (col D)
//   - la présence d'un libellé groupé "Lots_X-Y" (signe d'agrégation consommables)
//   - les fournisseurs canoniques vus
//   - le taux Gain/Achats de référence majoritaire (col Y)
//   - statistiques quantité / montant pour la détection d'anomalies
//
// Le résultat est consommé par getInvestConfig() pour combler les marchés
// non explicitement configurés dans MARCHE_INVEST_CONFIG.
// ═══════════════════════════════════════════════════════════

import * as XLSX from 'xlsx';

// Lit la feuille BDD en limitant aux colonnes A-AB (28 réelles) — évite les
// problèmes de mémoire dus aux ranges XFD avec colonnes vides.
function readBddRows(wb) {
  const ws = wb.Sheets['BDD'];
  if (!ws) return [];
  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
  const wsClipped = { ...ws, '!ref': XLSX.utils.encode_range({
    s: { r: 0, c: 0 },
    e: { r: range.e.r, c: Math.min(range.e.c, 27) },
  }) };
  // header:1 puis re-build pour normaliser les espaces parasites des en-têtes (" CATTC ")
  const rows2d = XLSX.utils.sheet_to_json(wsClipped, { header: 1, defval: '', blankrows: false });
  if (rows2d.length === 0) return [];
  const headers = (rows2d[0] || []).map(h => String(h).trim());
  return rows2d.slice(1).map(row => {
    const o = {};
    for (let i = 0; i < headers.length; i++) o[headers[i]] = row[i] ?? '';
    return o;
  });
}

function topKey(map) {
  let best = null, bestN = 0;
  for (const [k, n] of Object.entries(map)) {
    if (n > bestN) { best = k; bestN = n; }
  }
  return best;
}

function median(arr) {
  if (arr.length === 0) return 0;
  const s = [...arr].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

function stddev(arr, med) {
  if (arr.length < 2) return 0;
  const variance = arr.reduce((s, v) => s + (v - med) ** 2, 0) / arr.length;
  return Math.sqrt(variance);
}

/**
 * Extrait les conventions par marché depuis la BDD.
 * @param {XLSX.WorkBook} wb
 * @returns {Object} { [marcheLabel]: { ... } }
 */
export function learnConfigFromBdd(wb) {
  const rows = readBddRows(wb);
  const byMarche = {};

  for (const r of rows) {
    const marche = String(r['Marché'] ?? '').trim();
    if (!marche || /^Insérer|^Pour tableau|^Penser/i.test(marche)) continue;

    const lot = String(r['Lot'] ?? '').trim();
    const type = String(r["Type d'équipement"] ?? '').trim();
    const fournisseur = String(r['Fournisseur'] ?? '').trim();
    const gainRef = Number(r['Gain/Achats de référence']);
    const ttc = Number(r['CATTC']);
    const qte = Number(r['QUANTITE']);

    if (!byMarche[marche]) {
      byMarche[marche] = {
        excelMarcheLabel: marche,
        lotCounts: {},
        lotTypes: {},        // lot → { type → count }
        fournisseurs: new Set(),
        gainRefHistogram: {},
        ttcsByFournisseur: {},
        quantites: [],
        rowCount: 0,
      };
    }
    const m = byMarche[marche];
    m.rowCount++;
    if (lot) {
      m.lotCounts[lot] = (m.lotCounts[lot] || 0) + 1;
      if (type) {
        if (!m.lotTypes[lot]) m.lotTypes[lot] = {};
        m.lotTypes[lot][type] = (m.lotTypes[lot][type] || 0) + 1;
      }
    }
    if (fournisseur) m.fournisseurs.add(fournisseur);
    if (Number.isFinite(gainRef) && gainRef > 0) {
      const key = gainRef.toFixed(3);
      m.gainRefHistogram[key] = (m.gainRefHistogram[key] || 0) + 1;
    }
    if (Number.isFinite(ttc) && ttc > 0 && fournisseur) {
      if (!m.ttcsByFournisseur[fournisseur]) m.ttcsByFournisseur[fournisseur] = [];
      m.ttcsByFournisseur[fournisseur].push(ttc);
    }
    if (Number.isFinite(qte) && qte > 0) m.quantites.push(qte);
  }

  // Post-traitement : déduire les conventions exploitables
  const out = {};
  for (const [marche, m] of Object.entries(byMarche)) {
    if (m.rowCount < 3) continue;  // marchés à trop peu de lignes : pas exploitable

    // 1. Type majoritaire par lot
    const typeEquipementByLotLabel = {};
    for (const [lot, types] of Object.entries(m.lotTypes)) {
      typeEquipementByLotLabel[lot] = topKey(types);
    }

    // 2. Détecter pattern "Lots_X-Y" (label groupé pour consommables)
    let consommablesGroupedLotLabel = null;
    let consommablesLotRange = null;
    let typeConsommablesDefault = null;
    for (const lot of Object.keys(m.lotCounts)) {
      const mm = lot.match(/Lots[_\s\-]+(\d+)[\-\s]+(\d+)/i);
      if (mm) {
        consommablesGroupedLotLabel = lot;
        consommablesLotRange = [Number(mm[1]), Number(mm[2])];
        typeConsommablesDefault = typeEquipementByLotLabel[lot] || 'Consommables';
        break;
      }
    }

    // 3. Extraire la référence PPE depuis les lot labels (ex: "PPE028")
    const ppeRefs = {};
    for (const lot of Object.keys(m.lotCounts)) {
      const mm = lot.match(/(PPE\d+|AL\d+)/i);
      if (mm) {
        const ref = mm[1].toUpperCase();
        ppeRefs[ref] = (ppeRefs[ref] || 0) + m.lotCounts[lot];
      }
    }
    const ppeRef = topKey(ppeRefs) || '';

    // 4. Taux gain majoritaire
    const gainRefDefault = parseFloat(topKey(m.gainRefHistogram) || '0') || null;

    // 5. Stats anomalies par fournisseur (médiane + écart-type des montants)
    const ttcStatsByFournisseur = {};
    for (const [f, vals] of Object.entries(m.ttcsByFournisseur)) {
      const med = median(vals);
      ttcStatsByFournisseur[f] = { median: med, stddev: stddev(vals, med), n: vals.length };
    }

    // 6. Stats quantité globale du marché
    const qteMed = median(m.quantites);
    const qteStddev = stddev(m.quantites, qteMed);

    out[marche] = {
      excelMarcheLabel: marche,
      ppeRef,
      typeEquipementByLotLabel,                  // { "Lot label complet" : "Type" }
      consommablesGroupedLotLabel,
      consommablesLotRange,
      typeEquipementDefaultForConsommables: typeConsommablesDefault,
      gainAchatsRefDefault: gainRefDefault,
      knownFournisseurs: [...m.fournisseurs],
      anomalies: {
        ttcStatsByFournisseur,                   // { "Agilent": { median, stddev, n } }
        qteMedian: qteMed,
        qteStddev: qteStddev,
        qteSuspectThreshold: Math.max(50, qteMed + 4 * qteStddev),
      },
      rowCount: m.rowCount,
    };
  }
  return out;
}

/**
 * Mappe l'ID d'un marché (mockData) vers le libellé "Marché" attendu en BDD,
 * en se basant sur les conventions apprises. Heuristique : on cherche le label
 * BDD qui contient la référence PPE/AL du marché ou son nom (tokens).
 */
export function findMatchingBddMarcheLabel(marcheRef, marcheNom, learnedConfigs) {
  const upperRef = String(marcheRef || '').toUpperCase();
  const labels = Object.keys(learnedConfigs);
  // 1. Référence PPE/AL exacte
  if (upperRef) {
    const exact = labels.find(l => learnedConfigs[l].ppeRef === upperRef);
    if (exact) return exact;
  }
  // 2. Référence dans le label
  if (upperRef) {
    const inLabel = labels.find(l => l.toUpperCase().includes(upperRef));
    if (inLabel) return inLabel;
  }
  // 3. Nom du marché (token)
  const nomNorm = String(marcheNom || '').toLowerCase();
  if (nomNorm) {
    const byNom = labels.find(l => l.toLowerCase().includes(nomNorm.split(' ')[0]));
    if (byNom) return byNom;
  }
  return null;
}
