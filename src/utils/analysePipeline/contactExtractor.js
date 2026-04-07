/**
 * contactExtractor.js
 * Extraction PRENOM / NOM / TEL / MAIL depuis un fichier "Fiche Contacts"
 * fournisseur. Format hétérogène — on parse par heuristiques.
 */
import XLSX from 'xlsx-js-style';
import { sheetToMatrix, normStr, isEmpty } from './normalize.js';

const EMAIL_RE = /[\w.+-]+@[\w-]+(\.[\w-]+)+/;
const PHONE_RE = /(?:\+33|0)\s*[1-9](?:[\s.-]*\d{2}){4}/;

const NOM_LABELS = ['nom', 'last name', 'lastname', 'family name'];
const PRENOM_LABELS = ['prenom', 'first name', 'firstname', 'given name'];
const TEL_LABELS = ['tel', 'telephone', 'phone', 'mobile', 'portable', 'gsm'];
const MAIL_LABELS = ['mail', 'email', 'e-mail', 'courriel'];

function matchLabel(cell, labels) {
  const s = normStr(cell);
  return labels.some(l => s === l || s.includes(l));
}

/**
 * Stratégie 1 : layout en colonnes (header row + data rows)
 * Stratégie 2 : layout en paires clé-valeur (Nom: X, Prénom: Y)
 */
export function extractContactsFromWorkbook(wb) {
  const contacts = [];
  for (const sn of wb.SheetNames) {
    const matrix = sheetToMatrix(wb.Sheets[sn]);
    if (!matrix.length) continue;

    // Stratégie 1 : trouver une ligne header avec au moins 2 labels reconnus
    let headerRow = -1;
    let cols = {};
    for (let r = 0; r < Math.min(20, matrix.length); r++) {
      const row = matrix[r];
      const found = {};
      for (let c = 0; c < row.length; c++) {
        if (matchLabel(row[c], NOM_LABELS)) found.nom = c;
        else if (matchLabel(row[c], PRENOM_LABELS)) found.prenom = c;
        else if (matchLabel(row[c], TEL_LABELS)) found.tel = c;
        else if (matchLabel(row[c], MAIL_LABELS)) found.mail = c;
      }
      if (Object.keys(found).length >= 2) {
        headerRow = r;
        cols = found;
        break;
      }
    }

    if (headerRow >= 0) {
      for (let r = headerRow + 1; r < matrix.length; r++) {
        const row = matrix[r];
        if (!row || row.every(isEmpty)) continue;
        const c = {
          nom: cols.nom != null ? String(row[cols.nom] || '').trim() : '',
          prenom: cols.prenom != null ? String(row[cols.prenom] || '').trim() : '',
          tel: cols.tel != null ? String(row[cols.tel] || '').trim() : '',
          mail: cols.mail != null ? String(row[cols.mail] || '').trim() : '',
        };
        if (c.nom || c.prenom || c.mail) contacts.push(c);
      }
      if (contacts.length) continue;
    }

    // Stratégie 2 : paires clé-valeur
    const kv = { nom: '', prenom: '', tel: '', mail: '' };
    for (const row of matrix) {
      for (let c = 0; c < row.length - 1; c++) {
        const label = row[c];
        const value = row[c + 1];
        if (isEmpty(label) || isEmpty(value)) continue;
        if (matchLabel(label, NOM_LABELS) && !kv.nom) kv.nom = String(value).trim();
        else if (matchLabel(label, PRENOM_LABELS) && !kv.prenom) kv.prenom = String(value).trim();
        else if (matchLabel(label, TEL_LABELS) && !kv.tel) kv.tel = String(value).trim();
        else if (matchLabel(label, MAIL_LABELS) && !kv.mail) kv.mail = String(value).trim();
      }
    }
    if (kv.nom || kv.prenom || kv.mail) contacts.push(kv);
  }

  // Stratégie 3 : fallback regex sur tout le contenu
  if (!contacts.length) {
    const allText = wb.SheetNames
      .flatMap(sn => sheetToMatrix(wb.Sheets[sn]))
      .flat()
      .filter(c => typeof c === 'string')
      .join(' ');
    const mail = (allText.match(EMAIL_RE) || [])[0] || '';
    const tel = (allText.match(PHONE_RE) || [])[0] || '';
    if (mail || tel) contacts.push({ nom: '', prenom: '', tel, mail });
  }

  return contacts;
}

export async function extractContactsFromFile(fileHandle) {
  const file = await fileHandle.getFile();
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: 'array' });
  return extractContactsFromWorkbook(wb);
}
