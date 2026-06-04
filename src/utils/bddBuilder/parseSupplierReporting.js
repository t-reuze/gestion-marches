import * as XLSX from 'xlsx';

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

function findHeaderRow(rows, maxScan = 20) {
  // On accepte une ligne d'en-tête à partir du moment où on trouve :
  // - un libellé Désignation
  // - + au moins un de : Etablissement/CLCC ou Date
  // - + un montant ou une quantité (pour distinguer une ligne d'instructions d'un vrai header)
  for (let i = 0; i < Math.min(maxScan, rows.length); i++) {
    const row = rows[i] || [];
    const matches = row.map(matchHeader);
    const has = (k) => matches.includes(k);
    const ok = has('designation') && (has('etablissement') || has('date')) &&
               (has('montantTtc') || has('quantite') || has('puTtc'));
    if (!ok) continue;
    const colMap = {};
    matches.forEach((k, idx) => { if (k && !(k in colMap)) colMap[k] = idx; });
    return { rowIdx: i, colMap };
  }
  return null;
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

function extractFournisseur(headerBlock, fileName) {
  // 1. Chercher "Fournisseur : XXX" dans les premières lignes (rejette si valeur vide)
  for (const row of headerBlock) {
    for (const cell of row) {
      const s = String(cell || '');
      const m = s.match(/fournisseur\s*:\s*(.+)$/i);
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
    // ignore les tokens qui sont des années (4 chiffres) ou trop courts
    if (/^\d+$/.test(t)) continue;
    if (t.length < 3) continue;
    if (/^(BM|ACP|PPE|AL|UNICANCER|REPORTING|SUIVI|DES|COMMANDES|COPIE|COPY)$/i.test(t)) continue;
    if (t === t.toUpperCase()) return t;  // tout en majuscules = nom de fournisseur probable
  }
  return tokens[0] || 'Inconnu';
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

function parseSheet(ws, sheetName, fallbackYear) {
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', blankrows: false });
  if (rows.length === 0) return [];
  const header = findHeaderRow(rows);
  if (!header) return [];

  autoCorrectColMap(rows, header);

  // Fallback : déduit le n° de lot depuis le nom du sheet si aucune col "lot".
  const sheetLotRange = lotRangeFromSheetName(sheetName);
  const hasLotCol = header.colMap.lot != null;
  const hasDateCol = header.colMap.date != null;

  const lignes = [];
  let currentLot = sheetLotRange?.from ?? null;
  for (let i = header.rowIdx + 1; i < rows.length; i++) {
    const row = rows[i] || [];

    if (hasLotCol) {
      const lotCell = String(row[header.colMap.lot] ?? '').trim();
      if (lotCell && /^\d+$/.test(lotCell)) currentLot = Number(lotCell);
    }

    if (currentLot == null) continue;
    if (!isDataRow(row, header.colMap)) continue;

    let { date, annee } = hasDateCol
      ? parseDate(row[header.colMap.date])
      : { date: null, annee: fallbackYear ?? null };
    // Si la date était présente mais dans un format non reconnu (ex: "20-Jan"),
    // on utilise quand même l'année du nom de fichier (fallback) pour ne pas perdre la ligne.
    if (annee == null && fallbackYear != null) annee = fallbackYear;
    const qte  = parseNum(row[header.colMap.quantite]);
    const mnt  = parseNum(row[header.colMap.montantTtc]);
    const anneeMaintRaw = parseNum(row[header.colMap.anneeMaint]);

    // Si l'établissement et la ville sont en colonnes séparées (format Illumina 2024),
    // on combine pour faciliter le matching de la nomenclature.
    let etabRaw = String(row[header.colMap.etablissement] ?? '').trim();
    if (header.colMap.ville != null) {
      const villeRaw = String(row[header.colMap.ville] ?? '').trim();
      if (villeRaw && !etabRaw.toLowerCase().includes(villeRaw.toLowerCase())) {
        etabRaw = etabRaw + ' - ' + villeRaw;
      }
    }

    lignes.push({
      numLot:                     currentLot,
      date,
      annee,
      etablissement:              etabRaw,
      reference:                  String(row[header.colMap.reference] ?? '').trim(),
      designation:                String(row[header.colMap.designation] ?? '').trim(),
      anneeActivationMaintenance: anneeMaintRaw,
      quantite:                   qte,
      prixTtc:                    parseNum(row[header.colMap.puTtc]),
      montantTtc:                 mnt,
      sourceSheet:                sheetName,
      sourceRow:                  i + 1,
    });
  }
  return lignes;
}

export async function parseSupplierReporting(file) {
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: 'array' });

  // Bloc d'en-tête pour extraire le fournisseur (premier onglet "Lots")
  const firstLotSheet = wb.SheetNames.find(isLotSheet) || wb.SheetNames[0];
  const headerBlockRows = XLSX.utils.sheet_to_json(
    wb.Sheets[firstLotSheet], { header: 1, defval: '', blankrows: false }
  ).slice(0, 10);

  const fournisseur = extractFournisseur(headerBlockRows, file.name);
  const fallbackYear = yearFromFileName(file.name);

  const lignes = [];
  for (const sheetName of wb.SheetNames) {
    if (!isLotSheet(sheetName)) continue;
    const parsed = parseSheet(wb.Sheets[sheetName], sheetName, fallbackYear);
    for (const l of parsed) lignes.push(l);
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

  return { fournisseur, fileName: file.name, lignes: [...dedup.values()], duplicatesRemoved: dupCount };
}
