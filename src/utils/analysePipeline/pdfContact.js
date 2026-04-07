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

async function pdfExtract(arrayBuffer) {
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const lines = [];
  const formValues = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    // Regroupe par ligne (Y proche)
    const items = content.items
      .filter(it => it.str && it.str.trim())
      .map(it => ({ str: it.str, x: it.transform[4], y: Math.round(it.transform[5]) }));
    const byY = {};
    for (const it of items) {
      const k = it.y;
      (byY[k] ||= []).push(it);
    }
    for (const y of Object.keys(byY).sort((a, b) => b - a)) {
      const line = byY[y].sort((a, b) => a.x - b.x).map(it => it.str).join(' ').replace(/\s+/g, ' ').trim();
      if (line) lines.push(line);
    }
    // Champs de formulaire AcroForm
    try {
      const annots = await page.getAnnotations();
      for (const a of annots) {
        if (a.fieldName && a.fieldValue) {
          formValues.push({ name: String(a.fieldName), value: String(a.fieldValue) });
        }
      }
    } catch {}
  }
  return { text: lines.join('\n'), lines, formValues };
}

export function extractContactFromText(text, lines = null, formValues = []) {
  const result = { prenom: '', nom: '', tel: '', mail: '' };

  // 1. Champs de formulaire AcroForm
  for (const { name, value } of formValues) {
    const ln = norm(name);
    const v = String(value).trim();
    if (!v) continue;
    if (!result.prenom && PRENOM_LABELS.some(l => ln.includes(l))) result.prenom = v;
    else if (!result.nom && NOM_LABELS.some(l => ln.includes(l))) result.nom = v;
    else if (!result.tel && /tel|phone|mobile|portable/.test(ln)) result.tel = v;
    else if (!result.mail && /mail|courriel/.test(ln)) result.mail = v;
  }

  const mails = text.match(EMAIL_RE) || [];
  if (!result.mail && mails.length) result.mail = mails[0];

  const tels = text.match(PHONE_RE) || [];
  if (!result.tel && tels.length) result.tel = tels[0].replace(/\s+/g, ' ').trim();

  // Paires "Label: value" inline ou label / valeur sur ligne suivante
  const ls = lines || text.split(/[\n\r]+/).map(l => l.trim()).filter(Boolean);
  for (let i = 0; i < ls.length; i++) {
    const line = ls[i];
    let label = '', value = '';
    const m = line.match(/^([^:]{2,30}):\s*(.*)$/);
    if (m) { label = norm(m[1]); value = m[2].trim(); }
    else { label = norm(line); }
    if (!value && i + 1 < ls.length) value = ls[i + 1].trim();
    if (!value) continue;
    // Évite que la valeur soit elle-même un label
    if (/^(nom|prenom|prénom|tel|telephone|mail|email)\b/i.test(value)) continue;
    if (!result.prenom && PRENOM_LABELS.some(l => label === l || label.startsWith(l))) {
      result.prenom = value;
    } else if (!result.nom && NOM_LABELS.some(l => label === l || label.startsWith(l) || label.endsWith(' nom'))) {
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
  const { text, lines, formValues } = await pdfExtract(buf);
  return extractContactFromText(text, lines, formValues);
}
