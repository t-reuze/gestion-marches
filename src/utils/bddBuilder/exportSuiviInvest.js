// xlsx-js-style préserve les styles (couleurs, polices, alignement, bordures)
// lors de la lecture ET de l'écriture. On l'utilise donc partout dans ce module
// pour garantir la cohérence du roundtrip read → modify → write.
import * as XLSX from 'xlsx-js-style';
import { BDD_COLUMNS } from './buildBddRows.js';

// ═══════════════════════════════════════════════════════════
// Merge des nouvelles lignes dans un Suivi_Invest existant et
// écriture d'un nouveau fichier xlsx.
// ═══════════════════════════════════════════════════════════

const BDD_SHEET = 'BDD';
const DATE_COL_INDEX = 7;  // H "Date précise d'Achat"

// Colonnes calculées par formule Excel. On utilise des templates paramétrés par row
// pour garantir que la formule est canonique (pas un résidu d'une version antérieure).
const FORMULA_TEMPLATES = {
  'Contrat de maintenance en cours ?':
    r => `IF(AND((J${r}+(M${r}/12))<YEAR(TODAY()),YEAR(TODAY())<J${r}+P${r}),"oui","non")`,
  'Comptabilisé maintenance':
    r => `CONCATENATE(N${r},S${r})`,
  "Coût maintenance total à aujourd'hui (Ficitf)":
    r => `IF(N${r}="oui",(YEAR(TODAY())-S${r}+((M${r}/12)-1))*O${r},"")`,
  'Année activation maintenance':
    r => `ROUND(J${r}+M${r}/12,0)`,
  'TCO Final TTC':
    r => `(L${r})+(O${r}*(P${r}-M${r}/12))`,
  "Coût maintenance total à aujourd'hui (Réel avec TCO)":
    r => `IF(YEAR(TODAY())>(S${r}+(P${r}-(M${r}/12))),O${r}*(P${r}-(M${r}/12)),O${r}*((YEAR(TODAY())-S${r})))`,
  'Potentiellement à renouveller (TCO terminé)\r\nATTENTION , si la durée TCO n\'est pas remplie':
    r => `IF(AND(P${r}>0,P${r}+J${r}<YEAR(TODAY())),"Oui","")`,
  "Année de changement théorique \r\n(Annee d'installation + TCO)":
    r => `P${r}+J${r}`,
  'TCO en temps réel (A mettre en U?)':
    r => `U${r}+L${r}`,
  'Gain/Achats\r\n(euros)\r\nAncienne Formule DGOS':
    r => `(L${r})*Y${r}`,
  'Gain/Achats \r\nMaintenance (euros)':
    r => `O${r}*0.15`,
  'Gain/Achats\r\n(euros)\r\nNouvelle formule DGOS':
    r => `(L${r}/7)*Y${r}`,
};

function colIndexByHeader(headerRow, name) {
  return headerRow.findIndex(h => normalizeHeader(h) === normalizeHeader(name));
}

function normalizeHeader(s) {
  return String(s).replace(/[\r\n\t]+/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
}


// Trouve l'index (0-based) de la dernière ligne data dans la feuille BDD
// (en se basant sur la colonne A qui doit être "Unicancer" ou "Etablissement affilié")
function findLastDataRow(ws) {
  const range = XLSX.utils.decode_range(ws['!ref']);
  let last = 0;
  for (let r = 1; r <= range.e.r; r++) {
    const cell = ws[XLSX.utils.encode_cell({ r, c: 0 })];
    const v = cell?.v;
    if (typeof v === 'string' && (v === 'Unicancer' || v === 'Etablissement affilié')) {
      last = r;
    }
  }
  return last;
}

function writeValue(ws, r, c, val, style) {
  const addr = XLSX.utils.encode_cell({ r, c });
  if (val === '' || val == null) {
    delete ws[addr];
    return;
  }
  const cell = typeof val === 'number' ? { t: 'n', v: val } : { t: 's', v: String(val) };
  if (style) cell.s = style;
  ws[addr] = cell;
}

function writeFormula(ws, r, c, formulaStr, style) {
  const addr = XLSX.utils.encode_cell({ r, c });
  // SheetJS exige une valeur "cachée" pour que la formule soit sérialisée.
  // Excel la recalcule à l'ouverture (sheet marquée dirty).
  const cell = { t: 'n', f: formulaStr, v: 0 };
  if (style) cell.s = style;
  ws[addr] = cell;
}

/**
 * Insère les lignes BDD dans le workbook Suivi_Invest et retourne le blob xlsx.
 * @param {XLSX.WorkBook} wb - workbook cible (chargé depuis le fichier Suivi_Invest existant)
 * @param {Array} bddRows - rows issues de buildBddRows (champ .bdd utilisé)
 * @returns {{ wb, insertedCount, lastRow }}
 */
export function appendBddRows(wb, bddRows) {
  const ws = wb.Sheets[BDD_SHEET];
  if (!ws) throw new Error(`Onglet ${BDD_SHEET} introuvable dans le workbook`);

  const range = XLSX.utils.decode_range(ws['!ref']);
  // En-tête : ligne 0
  const headerRow = [];
  for (let c = 0; c <= range.e.c; c++) {
    const cell = ws[XLSX.utils.encode_cell({ r: 0, c })];
    headerRow.push(cell?.v || '');
  }

  // Map col d'en-tête → index
  const colIndex = {};
  for (const h of BDD_COLUMNS) {
    const idx = colIndexByHeader(headerRow, h);
    if (idx >= 0) colIndex[h] = idx;
  }

  // Dernière ligne existante (utile pour la taille du range et les styles à hériter)
  const lastRow = findLastDataRow(ws);

  // Snapshot des styles de la dernière ligne pour les hériter sur les nouvelles lignes.
  // Préserve couleurs, polices, alignements, bordures du template.
  const styleByCol = {};
  for (let c = 0; c <= range.e.c; c++) {
    const refCell = ws[XLSX.utils.encode_cell({ r: lastRow, c })];
    if (refCell?.s) styleByCol[c] = refCell.s;
  }

  // Insère les lignes après lastRow
  let insertAt = lastRow + 1;
  for (const row of bddRows) {
    for (const [header, col] of Object.entries(colIndex)) {
      const style = styleByCol[col];
      const tplFn = FORMULA_TEMPLATES[header];
      if (tplFn) {
        writeFormula(ws, insertAt, col, tplFn(insertAt + 1), style);
        continue;
      }
      writeValue(ws, insertAt, col, row.bdd[header], style);
    }
    // Format date pour la colonne H (préserve aussi le style hérité)
    const dateAddr = XLSX.utils.encode_cell({ r: insertAt, c: DATE_COL_INDEX });
    if (ws[dateAddr]) ws[dateAddr].z = 'dd/mm/yyyy';
    insertAt++;
  }

  // Mise à jour du range de la feuille
  const newRange = { s: { r: 0, c: 0 }, e: { r: insertAt - 1, c: range.e.c } };
  ws['!ref'] = XLSX.utils.encode_range(newRange);

  return { wb, insertedCount: bddRows.length, lastRow: insertAt - 1 };
}

/**
 * Lit un fichier Suivi_Invest en conservant formules et styles.
 */
export async function readSuiviInvest(file) {
  const buffer = await file.arrayBuffer();
  return XLSX.read(buffer, { type: 'array', cellFormula: true, cellStyles: true });
}

/**
 * Lit un buffer Suivi_Invest en conservant formules et styles.
 */
export function readSuiviInvestFromBuffer(buffer) {
  return XLSX.read(buffer, { type: 'array', cellFormula: true, cellStyles: true });
}

/**
 * Clone shallow du workbook + deep clone de la feuille BDD (les autres sont partagées).
 * Permet de modifier la BDD sans toucher au workbook source en mémoire.
 */
export function cloneWorkbookBdd(wb) {
  if (!wb) throw new Error('Workbook cible manquant');
  const clone = { ...wb, Sheets: { ...wb.Sheets } };
  clone.Sheets[BDD_SHEET] = JSON.parse(JSON.stringify(wb.Sheets[BDD_SHEET]));
  return clone;
}

/**
 * Supprime toutes les lignes data de la feuille BDD (garde la ligne d'en-tête).
 */
export function clearBddData(wb) {
  const ws = wb.Sheets[BDD_SHEET];
  const ref = ws['!ref'];
  if (!ref) return;
  for (const key of Object.keys(ws)) {
    if (key.startsWith('!')) continue;
    const m = key.match(/^[A-Z]+(\d+)$/);
    if (!m) continue;
    const r = Number(m[1]);
    if (r > 1) delete ws[key];
  }
  ws['!ref'] = ref.replace(/:[A-Z]+\d+/, (s) => s.replace(/\d+$/, '1'));
}

/**
 * Génère un Blob xlsx téléchargeable depuis un workbook.
 */
export function writeWorkbookBlob(wb) {
  const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array', cellStyles: true });
  return new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

export function downloadWorkbook(wb, fileName) {
  const blob = writeWorkbookBlob(wb);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
