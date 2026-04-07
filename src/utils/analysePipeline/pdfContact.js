/**
 * pdfContact.js
 * Extraction PRENOM/NOM/TEL/MAIL depuis un PDF "Fiche Contacts".
 * Utilise pdfjs-dist pour récupérer le texte, puis applique les mêmes
 * heuristiques que contactExtractor (regex + paires clé-valeur).
 */
import * as pdfjsLib from 'pdfjs-dist/build/pdf.mjs';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

const EMAIL_RE = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g;
const PHONE_RE = /(?:\+33|0)\s*[1-9](?:[\s.\-]*\d{2}){4}/g;

const NOM_LABELS = ['nom', 'last name', 'lastname'];
const PRENOM_LABELS = ['prenom', 'prénom', 'first name', 'firstname'];

function norm(s) {
  return String(s ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

async function pdfToText(arrayBuffer) {
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const parts = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    parts.push(content.items.map(it => it.str).join(' '));
  }
  return parts.join('\n');
}

export function extractContactFromText(text) {
  const result = { prenom: '', nom: '', tel: '', mail: '' };

  const mails = text.match(EMAIL_RE) || [];
  if (mails.length) result.mail = mails[0];

  const tels = text.match(PHONE_RE) || [];
  if (tels.length) result.tel = tels[0].replace(/\s+/g, ' ').trim();

  // Paires clé-valeur ligne par ligne ou via "Label: value"
  const lines = text.split(/[\n\r]+/).map(l => l.trim()).filter(Boolean);
  for (const line of lines) {
    const m = line.match(/^([^:]{2,30}):\s*(.+)$/);
    if (!m) continue;
    const label = norm(m[1]);
    const value = m[2].trim();
    if (!result.prenom && PRENOM_LABELS.some(l => label === l || label.startsWith(l))) {
      result.prenom = value;
    } else if (!result.nom && NOM_LABELS.some(l => label === l || label.startsWith(l))) {
      result.nom = value;
    }
  }

  // Fallback : si pas de nom/prénom mais un mail au format prenom.nom@…
  if (!result.prenom && !result.nom && result.mail) {
    const local = result.mail.split('@')[0];
    const parts = local.split(/[._-]/).filter(Boolean);
    if (parts.length >= 2) {
      result.prenom = parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
      result.nom = parts.slice(1).join(' ').toUpperCase();
    }
  }

  return result;
}

export async function extractContactFromPdfFile(fileHandle) {
  const file = await fileHandle.getFile();
  const buf = await file.arrayBuffer();
  const text = await pdfToText(buf);
  return extractContactFromText(text);
}
