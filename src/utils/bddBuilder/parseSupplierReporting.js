import * as XLSX from 'xlsx';
import { matchEtablissement } from './matchClcc.js';
import { fingerprintWorkbook } from './templateProfiles.js';

// ═══════════════════════════════════════════════════════════
// Parse d'un fichier Excel de reporting fournisseur.
// Gère tous les onglets "Lots X-Y" (ignore "Partenariats_*").
// Retourne :
//   {
//     fournisseur: string,            // extrait du fichier ou des en-têtes
//     fileName: string,
//     lignes: [{ numLot, date, annee, etablissement, reference, designation,
//                anneeActivationMaintenance, quantite, prixTtc, montantTtc,
//                sourceSheet, sourceRow }]
//   }
// ═══════════════════════════════════════════════════════════

const COL_KEYS = {
  lot:            [/^lot$/i],
  chronologie:    [/chrono[a-z]*/i, /n°\s*de\s*commande/i, /num[eé]ro\s*commande/i],
  date:           [/^date\b/i, /date\s*d'?achat/i, /date\s*commande/i],
  // 2024+ : "Etablissement (nom + ville)". 2023 : "Nom CLCC (+ ville)". Illumina 2024 : "Etablissement" seul + "Ville".
  etablissement:  [/etablissement/i, /nom\s*clcc/i, /^clcc(\s|$)/i],
  ville:          [/^ville$/i],
  reference:      [/r[ée]f[ée]rence\s*commerciale/i],
  designation:    [/d[ée]signation/i],
  anneeMaint:     [/ann[ée]e\s*d'?activation/i, /contrat\s*de\s*maintenance/i],
  quantite:       [/^quantit[ée]\s*en\s*unit[ée]/i, /^quantit[ée]$/i],
  prixHt:         [/prix\s*unitaire\s*ht/i],
  tauxRemise:     [/taux\s*de\s*remise/i],
  puhtRemise:     [/puht\s*remis[ée]/i],
  tva:            [/^tva$/i],
  puTtc:          [/pu\s*remis[ée]\s*ttc/i],
  montantTtc:     [/quantit[ée]\s*[x*]\s*prix\s*ttc/i, /montant\s*ttc/i, /total\s*ttc/i],
};

function normalizeHeader(s) {
  return String(s).replace(/[\r\n\t]+/g, ' ').replace(/\s+/g, ' ').trim();
}

function matchHeader(cell) {
  const s = normalizeHeader(cell);
  for (const [key, patterns] of Object.entries(COL_KEYS)) {
    if (patterns.some(re => re.test(s))) return key;
  }
  return null;
}

// ─── Typage de contenu (détection de rôle indépendante des libellés) ───
function numVal(v) {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (v == null || v === '') return null;
  const n = parseFloat(String(v).replace(/[€\s]/g, '').replace(',', '.'));
  return isNaN(n) ? null : n;
}
function looksDate(v) {
  if (typeof v === 'number') return v > 1000 && v < 100000;   // serial Excel plausible
  return !!parseDate(v).date;
}
// Colonne de DATES (serials) à ne jamais prendre pour un montant : majorité de
// valeurs date-like ET magnitude médiane dans la fenêtre des serials récents
// (~2007–2031). Les montants en milliers (4 986, 33 156…) ne tombent pas dans
// cette fenêtre serrée, donc ils ne sont pas exclus.
function isSerialDateColumn(stat) {
  return stat.dateRatio >= 0.7 && stat.medMag >= 43000 && stat.medMag <= 48000;
}

// Détecte TOUS les en-têtes candidats d'un onglet (gère les tableaux empilés).
// Un en-tête = une ligne qui matche >= 3 rôles connus dont une ancre
// (établissement ou désignation). Les lignes de données ne matchent pas les
// libellés d'en-tête, donc elles sont naturellement exclues.
function findHeaderCandidates(rows, maxScan = 60) {
  const cands = [];
  for (let i = 0; i < Math.min(maxScan, rows.length); i++) {
    const row = rows[i] || [];
    const colMap = {};
    row.forEach((cell, idx) => {
      const k = matchHeader(cell);
      if (k && !(k in colMap)) colMap[k] = idx;
    });
    const roles = Object.keys(colMap);
    const hasAnchor = ('etablissement' in colMap) || ('designation' in colMap);
    if (hasAnchor && roles.length >= 3) cands.push({ rowIdx: i, colMap });
  }
  return cands;
}

// Complète les rôles manquants d'un bloc par DÉTECTION DE CONTENU :
//  - montant : colonne numérique (non-date) de plus grande magnitude médiane
//  - désignation : colonne texte la plus longue (hors étab/ville/référence)
//  - date : colonne la plus "date-like" si aucune trouvée par libellé
// Rend le parsing robuste au renommage des colonnes (ex. template PPE037 :
// "Marché Prix de base TTC remisé", "Nom équipement commandé + options").
function resolveMissingRoles(rows, start, end, colMap) {
  const ncol = Math.max(0, ...rows.slice(start, end).map(r => (r ? r.length : 0)));
  const stats = [];
  for (let c = 0; c < ncol; c++) {
    let n = 0, num = 0, date = 0, rawLenSum = 0;
    const mags = [];
    for (let r = start; r < end; r++) {
      const v = rows[r]?.[c];
      if (v === '' || v == null) continue;
      n++;
      rawLenSum += String(v).length;
      if (looksDate(v)) date++;
      const nv = numVal(v);
      if (nv != null) { num++; mags.push(Math.abs(nv)); }
    }
    mags.sort((a, b) => a - b);
    stats[c] = {
      n, dateRatio: n ? date / n : 0, numRatio: n ? num / n : 0,
      avgRawLen: n ? rawLenSum / n : 0, medMag: mags.length ? mags[Math.floor(mags.length / 2)] : 0,
    };
  }

  // date : fallback uniquement si non trouvée par libellé (rare — "Date" présent partout).
  // Conservateur : valeurs très majoritairement date-like ET dans une fenêtre de serials récents.
  if (colMap.date == null) {
    let best = null;
    for (let c = 0; c < ncol; c++) {
      if (Object.values(colMap).includes(c)) continue;
      const s = stats[c];
      if (s && s.n > 0 && s.dateRatio >= 0.8 && s.medMag >= 40000 && s.medMag <= 48000) {
        if (!best || s.dateRatio > best.dateRatio) best = { c, dateRatio: s.dateRatio };
      }
    }
    if (best) colMap.date = best.c;
  }

  // montant : colonne NUMÉRIQUE de plus grande magnitude médiane, hors colonnes déjà
  // assignées (index/lot/date/qté/réf…). On n'exclut PAS via dateRatio : un montant
  // (ex. 46 836) tombe dans la plage des serials de dates — la date est déjà exclue
  // par son rôle, donc le plus gros numérique restant = le montant.
  if (colMap.montantTtc == null && colMap.puTtc == null) {
    const used = new Set(Object.values(colMap));
    let best = null;
    for (let c = 0; c < ncol; c++) {
      if (used.has(c)) continue;
      const s = stats[c];
      if (!s || s.n === 0 || s.numRatio < 0.6) continue;
      if (isSerialDateColumn(s)) continue;   // jamais une colonne de dates comme montant
      // Priorité à la COUVERTURE (nb de valeurs) puis à la magnitude : évite de
      // choisir une colonne quasi-vide à grosse magnitude (ex. colonne fantôme).
      if (!best || s.n > best.n || (s.n === best.n && s.medMag > best.medMag)) best = { c, n: s.n, medMag: s.medMag };
    }
    if (best && best.medMag >= 1) colMap.montantTtc = best.c;
  }

  // désignation : colonne majoritairement NON numérique / non date, la plus longue,
  // hors colonnes déjà assignées. (Robuste aux références type "L981558/..." sans
  // lettres consécutives, que looksText raterait.)
  if (colMap.designation == null) {
    const used = new Set(Object.values(colMap));
    let best = null;
    for (let c = 0; c < ncol; c++) {
      if (used.has(c)) continue;
      const s = stats[c];
      if (s && s.n > 0 && s.numRatio < 0.5 && s.dateRatio < 0.5 && s.avgRawLen >= 3) {
        if (!best || s.avgRawLen > best.avgRawLen) best = { c, avgRawLen: s.avgRawLen };
      }
    }
    if (best) colMap.designation = best.c;
  }
}

// Déduit la plage de lots d'après le nom du sheet :
// - "Lots 13 à 40" / "Lots 13-40" → {from:13, to:40}
// - "Lots 13, 14, 15" → {from:13, to:15}
// - "Lots 13" → {from:13, to:13}
function lotRangeFromSheetName(sheetName) {
  const m = sheetName.match(/lots?\s*(\d+)\s*(?:à|\-|to)\s*(\d+)/i);
  if (m) return { from: Number(m[1]), to: Number(m[2]) };
  // Liste explicite : "Lots 13, 14, 15"
  const mList = sheetName.match(/lots?\s*((?:\d+\s*,?\s*)+)/i);
  if (mList) {
    const nums = mList[1].match(/\d+/g)?.map(Number) || [];
    if (nums.length) return { from: Math.min(...nums), to: Math.max(...nums) };
  }
  return null;
}

// Année par défaut depuis le nom de fichier (ex: "..._2023_..." → 2023).
function yearFromFileName(name) {
  const m = name.match(/(20\d{2})/);
  return m ? Number(m[1]) : null;
}

// Liste de fournisseurs reconnus (extensible). Sert à reconnaître le nom dans le nom de fichier
// quand l'en-tête "Fournisseur :" est vide.
const KNOWN_SUPPLIERS = [
  'AGILENT', 'ILLUMINA', 'PROMEGA', 'STILLA', 'SYNORIS', 'HAMILTON',
  'THERMOFISHER', 'THERMO FISHER', 'TELEMIS', 'STARLAB', 'EUROGENTEC',
  'AATI', 'PERKINELMER', 'PERKIN ELMER', 'QIAGEN', 'BIO-RAD', 'BIORAD',
  'NEB', 'NEW ENGLAND BIOLABS', 'LIFE TECHNOLOGIES', 'LIFE TECH',
  'LEICA', 'HAMAMATSU', 'ROCHE', 'DIAPATH', 'MM FRANCE',
];

// Tokens à ignorer dans le nom de fichier (ni année, ni code marché, ni mot générique).
const FILENAME_NOISE_RE = /^(BM|ACP|PPE\d*|AL\d*|UNICANCER|REPORTING|REPROTING|SUIVI|DES|COMMANDES|COMMANDE|COPIE|COPY|OF|MARCHE|MARCHES|ANAPATH|BIOMOL|DEC|JANV|NOV|OCT|OUI|REMPLI|COMPLETEE|MI|ANNEE|BILAN|RETOURS?)$/i;

function extractFournisseur(headerBlock, fileName) {
  // 1. Chercher "Fournisseur : XXX" ou "Titulaire : XXX" dans les premières lignes
  for (const row of headerBlock) {
    for (const cell of row) {
      const s = String(cell || '');
      const m = s.match(/(?:fournisseur|titulaire)\s*:\s*(.+)$/i);
      if (m && m[1].trim()) return m[1].trim();
    }
  }
  // 2. Chercher un fournisseur connu dans le nom de fichier
  const upper = fileName.toUpperCase();
  for (const sup of KNOWN_SUPPLIERS) {
    if (upper.includes(sup)) return sup;
  }
  // 3. Fallback : premier token alphabétique majuscule >= 3 chars du nom de fichier
  const tokens = fileName.replace(/\.(xlsx|xls)$/i, '').split(/[_\s\-\.()]/).filter(Boolean);
  for (const t of tokens) {
    if (/^\d+$/.test(t)) continue;               // année / nombre
    if (t.length < 3) continue;
    if (FILENAME_NOISE_RE.test(t)) continue;      // code marché / mot générique
    if (t === t.toUpperCase()) return t;          // tout en majuscules = nom de fournisseur probable
  }
  // 4. Dernier recours : premier token non-bruité (jamais un code marché / mot générique)
  const clean = tokens.find(t => !/^\d+$/.test(t) && t.length >= 3 && !FILENAME_NOISE_RE.test(t));
  return clean || 'Inconnu';
}

// Excel serial date (1900 system) → JS Date UTC. Jour 1 = 1900-01-01, bug Excel "1900-02-29" toléré.
function excelSerialToDate(n) {
  const epoch = Date.UTC(1899, 11, 30); // 1899-12-30
  return new Date(epoch + Math.round(n) * 86400000);
}

function parseDate(val) {
  if (val === null || val === undefined || val === '') return { date: null, annee: null };
  // Nombre serial Excel
  if (typeof val === 'number' && val > 1000 && val < 100000) {
    const d = excelSerialToDate(val);
    return { date: d, annee: d.getUTCFullYear() };
  }
  const s = String(val).trim();
  // Format "YYYY-MXX" (mois numéro)
  const m1 = s.match(/^(\d{4})[-_\s]*[Mm](\d{1,2})$/);
  if (m1) {
    const y = Number(m1[1]), mo = Number(m1[2]);
    return { date: new Date(Date.UTC(y, mo - 1, 1)), annee: y };
  }
  // Format DD/MM/YYYY
  const m2 = s.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})$/);
  if (m2) {
    let y = Number(m2[3]);
    if (y < 100) y += 2000;
    return { date: new Date(Date.UTC(y, Number(m2[2]) - 1, Number(m2[1]))), annee: y };
  }
  // Format YYYY-MM-DD
  const m3 = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (m3) {
    return { date: new Date(Date.UTC(+m3[1], +m3[2] - 1, +m3[3])), annee: +m3[1] };
  }
  // Format YYYYMMDD compact
  const m4 = s.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (m4) {
    return { date: new Date(Date.UTC(+m4[1], +m4[2] - 1, +m4[3])), annee: +m4[1] };
  }
  // Dernier recours : l'année seule
  const my = s.match(/(\d{4})/);
  if (my) return { date: null, annee: Number(my[1]) };
  return { date: null, annee: null };
}

function parseNum(val) {
  if (val === '' || val == null) return null;
  if (typeof val === 'number') return val;
  const cleaned = String(val).replace(/[€\s]/g, '').replace(',', '.');
  const n = parseFloat(cleaned);
  return isNaN(n) ? null : n;
}

// Mots-clés qui marquent les lignes de récapitulatif (totaux, sous-totaux) à exclure.
const TOTAL_RE = /^(total(?:\s|$|aux|\sg[ée]n[ée]ral)|sous[-\s]?total|cumul|montant\s*total)/i;

function isDataRow(cells, colMap) {
  const des  = String(cells[colMap.designation] ?? '').trim();
  const etab = String(cells[colMap.etablissement] ?? '').trim();
  const qte  = parseNum(cells[colMap.quantite]);
  const mnt  = parseNum(cells[colMap.montantTtc]);

  // Exclure les lignes de total : la désignation matche un mot-clé "TOTAL"
  // alors que l'établissement est vide.
  if (!etab && TOTAL_RE.test(des)) return false;

  // Ligne avec au moins une désignation OU un établissement et une quantité/montant > 0
  return (
    (des !== '' || etab !== '') &&
    ((qte != null && qte > 0) || (mnt != null && mnt > 0))
  );
}

function isLotSheet(sheetName) {
  return /^\s*lots?\s*\d/i.test(sheetName);
}

// Onglets à NE PAS parser comme données de commandes : schéma différent
// (ex. "Partenariats_Scientifiques" = Etablissement/Année/Sujet, sans montant).
// Tout autre onglet est tenté : findHeaderRow le rejette de toute façon s'il
// n'a pas d'en-tête de commandes valide. Indispensable pour les fichiers dont
// l'onglet de données s'appelle "Reporting" (ex. marché Enceintes blindées).
function isExcludedSheet(sheetName) {
  return /partenariat/i.test(sheetName);
}

// Heuristique : si la colonne identifiée par le header text est quasi-vide
// alors qu'une colonne adjacente contient des nombres > 0, on décale.
// Robuste aux templates où une colonne fantôme s'est glissée entre l'entête et les données.
function autoCorrectColMap(rows, header, dataRowsToCheck = 12) {
  const startRow = header.rowIdx + 1;
  const endRow = Math.min(startRow + dataRowsToCheck, rows.length);
  const numericKeys = ['montantTtc', 'puTtc', 'quantite', 'prixHt', 'puhtRemise'];

  function score(c) {
    if (c == null) return null;
    let nz = 0, total = 0;
    for (let r = startRow; r < endRow; r++) {
      const v = rows[r]?.[c];
      if (v == null || v === '') continue;
      total++;
      const n = typeof v === 'number' ? v : parseFloat(String(v).replace(/[€\s]/g, '').replace(',', '.'));
      if (!isNaN(n) && n > 0) nz++;
    }
    return { total, nz, ratio: total > 0 ? nz / total : 0 };
  }

  for (const key of numericKeys) {
    const c = header.colMap[key];
    if (c == null) continue;
    const cur = score(c);
    if (cur.total === 0 || cur.ratio < 0.2) {
      // Cherche un meilleur candidat sur ±2 colonnes
      let best = { col: c, ratio: cur.ratio };
      for (const off of [1, -1, 2, -2]) {
        const nc = c + off;
        if (nc < 0) continue;
        const sc = score(nc);
        if (sc && sc.total > 0 && sc.ratio > 0.5 && sc.ratio > best.ratio) {
          best = { col: nc, ratio: sc.ratio };
        }
      }
      if (best.col !== c) header.colMap[key] = best.col;
    }
  }
}

function parseSheet(ws, sheetName, fallbackYear, profileRoles) {
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', blankrows: false });
  if (rows.length === 0) return { lignes: [], mapping: null };

  const candidates = findHeaderCandidates(rows);
  if (candidates.length === 0) return { lignes: [], mapping: null };

  const sheetLotRange = lotRangeFromSheetName(sheetName);
  const lignes = [];
  let usedMapping = null;

  // Chaque bloc va de son en-tête jusqu'à l'en-tête suivant (tableaux empilés).
  for (let ci = 0; ci < candidates.length; ci++) {
    const header = candidates[ci];
    const endRow = ci + 1 < candidates.length ? candidates[ci + 1].rowIdx : rows.length;
    const colMap = { ...header.colMap };

    autoCorrectColMap(rows, { rowIdx: header.rowIdx, colMap });   // corrige les décalages de colonnes connues
    resolveMissingRoles(rows, header.rowIdx + 1, endRow, colMap); // complète montant/désignation/date par contenu

    // Profil mémorisé : l'utilisateur a corrigé le mapping → ses rôles priment sur l'auto-détection.
    if (profileRoles) {
      for (const [role, idx] of Object.entries(profileRoles)) {
        if (typeof idx === 'number' && idx >= 0) colMap[role] = idx;
      }
    }

    // Un bloc n'est exploitable que s'il a de quoi extraire une ligne (montant ou quantité).
    if (colMap.montantTtc == null && colMap.puTtc == null && colMap.quantite == null) continue;

    const hasLotCol  = colMap.lot != null;
    const hasDateCol = colMap.date != null;
    const hasQteCol  = colMap.quantite != null;
    let currentLot = sheetLotRange?.from ?? null;

    for (let i = header.rowIdx + 1; i < endRow; i++) {
      const row = rows[i] || [];

      if (hasLotCol) {
        const lotCell = String(row[colMap.lot] ?? '').trim();
        if (lotCell && /^\d+$/.test(lotCell)) currentLot = Number(lotCell);
      }

      if (currentLot == null) continue;
      if (!isDataRow(row, colMap)) continue;

      let { date, annee } = hasDateCol
        ? parseDate(row[colMap.date])
        : { date: null, annee: fallbackYear ?? null };
      if (annee == null && fallbackYear != null) annee = fallbackYear;

      // Quantité : si la colonne n'existe pas (ex. template PPE037 où le montant
      // est le prix total de la commande), on considère 1 unité par ligne.
      const qte = hasQteCol ? parseNum(row[colMap.quantite]) : 1;
      const mnt = parseNum(row[colMap.montantTtc]);
      const anneeMaintRaw = parseNum(row[colMap.anneeMaint]);

      // Etablissement + ville en colonnes séparées (format Illumina 2024) → on combine.
      let etabRaw = String(row[colMap.etablissement] ?? '').trim();
      if (colMap.ville != null) {
        const villeRaw = String(row[colMap.ville] ?? '').trim();
        if (villeRaw && !etabRaw.toLowerCase().includes(villeRaw.toLowerCase())) {
          etabRaw = etabRaw + ' - ' + villeRaw;
        }
      }

      lignes.push({
        numLot:                     currentLot,
        date,
        annee,
        etablissement:              etabRaw,
        reference:                  String(row[colMap.reference] ?? '').trim(),
        designation:                String(row[colMap.designation] ?? '').trim(),
        anneeActivationMaintenance: anneeMaintRaw,
        quantite:                   qte,
        prixTtc:                    parseNum(row[colMap.puTtc]),
        montantTtc:                 mnt,
        sourceSheet:                sheetName,
        sourceRow:                  i + 1,
      });
    }

    // Mémorise le mapping du premier bloc ayant produit des données (pour l'UI/profils).
    if (!usedMapping && lignes.length > 0) usedMapping = { ...colMap };
  }
  return { lignes, mapping: usedMapping };
}

// ═══════════════════════════════════════════════════════════
// Reconnaisseur L2 — tableau "matrice par établissement".
// Forme : 1 ligne par CLCC (col texte qui matche la nomenclature),
// 1+ colonnes de métriques numériques (CA HT / CA TTC…), ligne TOTAL,
// année dans le titre. Aucun lot/désignation/date au niveau ligne.
// N'utilise PAS les libellés d'en-tête (souvent absents/atypiques) :
// la colonne établissement est CELLE qui matche le mieux la nomenclature CLCC.
// Ne se déclenche qu'en dernier recours (parsing transactionnel = 0 ligne).
// ═══════════════════════════════════════════════════════════
function parseMatrixSheet(ws, sheetName, nomenclature, fallbackYear) {
  if (!nomenclature || !nomenclature.length) return [];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', blankrows: false });
  if (rows.length < 3) return [];
  const ncol = Math.max(0, ...rows.map(r => (r ? r.length : 0)));

  // 1. Colonne établissement = celle avec le plus de cellules matchant la nomenclature.
  let estCol = null;
  for (let c = 0; c < ncol; c++) {
    let match = 0, nonEmpty = 0;
    for (const row of rows) {
      const v = String(row?.[c] ?? '').trim();
      if (!v || /^total/i.test(v)) continue;
      nonEmpty++;
      if (matchEtablissement(v, nomenclature).confidence >= 0.5) match++;
    }
    if (nonEmpty >= 3 && match >= 3 && match / nonEmpty >= 0.4) {
      if (!estCol || match > estCol.match) estCol = { c, match, nonEmpty };
    }
  }
  if (!estCol) return [];
  const ec = estCol.c;

  // 2. Colonne montant = colonne numérique (≠ établissement), PAS une colonne de dates,
  //    priorité à la couverture puis à la magnitude (TTC domine HT / nb d'accélérateurs).
  let amtCol = -1, best = null;
  for (let c = 0; c < ncol; c++) {
    if (c === ec) continue;
    const mags = []; let n = 0, dateCount = 0;
    for (const row of rows) {
      const v = row?.[c];
      if (v == null || v === '') continue;
      n++;
      if (looksDate(v)) dateCount++;
      const nv = numVal(v);
      if (nv != null && nv > 0) mags.push(nv);
    }
    if (mags.length < 3) continue;
    mags.sort((a, b) => a - b);
    const med = mags[Math.floor(mags.length / 2)];
    if (isSerialDateColumn({ dateRatio: n ? dateCount / n : 0, medMag: med })) continue;  // pas une colonne de dates
    if (!best || mags.length > best.cov || (mags.length === best.cov && med > best.med)) best = { c, cov: mags.length, med };
  }
  if (best) amtCol = best.c;
  if (amtCol < 0) return [];

  // 3. Année : 20XX trouvé dans les 3 premières lignes (titre), sinon fallback fichier.
  let annee = fallbackYear ?? null;
  outer: for (let i = 0; i < Math.min(3, rows.length); i++) {
    for (const v of rows[i] || []) {
      const mm = String(v).match(/\b(20\d{2})\b/);
      if (mm) { annee = Number(mm[1]); break outer; }
    }
  }

  // 4. Une ligne par établissement reconnu avec un montant > 0.
  const lignes = [];
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i] || [];
    const est = String(row[ec] ?? '').trim();
    if (!est || /^total/i.test(est)) continue;
    if (matchEtablissement(est, nomenclature).confidence < 0.5) continue;
    const amt = numVal(row[amtCol]);
    if (amt == null || amt <= 0) continue;
    lignes.push({
      numLot: null, date: null, annee,
      etablissement: est, reference: '', designation: '',
      anneeActivationMaintenance: null, quantite: 1, prixTtc: null,
      montantTtc: amt, sourceSheet: sheetName, sourceRow: i + 1,
    });
  }
  return lignes;
}

export async function parseSupplierReporting(file, opts = {}) {
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: 'array' });

  // Bloc d'en-tête pour extraire le fournisseur : onglet "Lots" en priorité,
  // sinon premier onglet de données (ex. "Reporting").
  const headerSheet = wb.SheetNames.find(isLotSheet)
    || wb.SheetNames.find(n => !isExcludedSheet(n))
    || wb.SheetNames[0];
  const headerBlockRows = XLSX.utils.sheet_to_json(
    wb.Sheets[headerSheet], { header: 1, defval: '', blankrows: false }
  ).slice(0, 10);

  const fournisseur = extractFournisseur(headerBlockRows, file.name);
  const fallbackYear = yearFromFileName(file.name);

  // Empreinte de template → profil mémorisé éventuel (mapping corrigé par l'utilisateur).
  const fingerprint = fingerprintWorkbook(wb);
  const profile = opts.profiles?.[fingerprint] || null;
  const profileRoles = profile?.roles || null;

  const lignes = [];
  let mapping = null;
  let mode = 'transactional';
  for (const sheetName of wb.SheetNames) {
    if (isExcludedSheet(sheetName)) continue;
    const parsed = parseSheet(wb.Sheets[sheetName], sheetName, fallbackYear, profileRoles);
    for (const l of parsed.lignes) lignes.push(l);
    if (!mapping && parsed.mapping) mapping = parsed.mapping;
  }

  // Dernier recours : aucune ligne transactionnelle trouvée → on tente le
  // reconnaisseur "matrice par établissement" (nomenclature requise). Gated sur 0
  // ligne → aucun impact sur les fichiers transactionnels qui fonctionnent déjà.
  if (lignes.length === 0 && opts.nomenclature) {
    for (const sheetName of wb.SheetNames) {
      if (isExcludedSheet(sheetName)) continue;
      const parsed = parseMatrixSheet(wb.Sheets[sheetName], sheetName, opts.nomenclature, fallbackYear);
      for (const l of parsed) lignes.push(l);
    }
    if (lignes.length > 0) mode = 'matrix';
  }

  // Déduplication stricte : on n'élimine une ligne que si TOUS les champs significatifs
  // sont identiques (etab + désignation + référence + qté + montants + date + lot).
  // Cible : sections collées deux fois par erreur, sans risque sur des BC distincts.
  const dedup = new Map();
  let dupCount = 0;
  for (const l of lignes) {
    const key = [
      l.numLot,
      String(l.etablissement || '').toLowerCase().trim(),
      String(l.designation || '').toLowerCase().trim(),
      String(l.reference || '').toLowerCase().trim(),
      l.quantite || 0,
      Math.round((l.montantTtc || 0) * 100),
      Math.round((l.prixTtc || 0) * 100),
      l.date ? l.date.toISOString() : '',
    ].join('|');
    if (dedup.has(key)) { dupCount++; continue; }
    dedup.set(key, l);
  }

  return {
    fournisseur, fileName: file.name,
    lignes: [...dedup.values()], duplicatesRemoved: dupCount,
    fingerprint, mode, mapping,
    profileApplied: !!profile, profileName: profile?.name || null,
  };
}
