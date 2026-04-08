/**
 * pdfContact.js
 * Extraction PRENOM/NOM/TEL/MAIL depuis un PDF "Fiche Contacts".
 * Supporte plusieurs contacts par fiche (sections "Interlocuteur ...").
 */
import * as pdfjsLib from 'pdfjs-dist/build/pdf.mjs';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

const EMAIL_RE = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g;
// Téléphones FR : accepte "+33 (0) 6 25 87 50 73", "06.25.87.50.73", etc.
const PHONE_RE = /(?:\+33|0033|0)\s*(?:\(0\)\s*)?[1-9](?:[\s.\-]*\d){8}/g;

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

const compactPunct = (s) => s
  .replace(/\s*@\s*/g, '@')
  .replace(/\s*\.\s*/g, '.')
  .replace(/\s*-\s*/g, '-');

function cleanPhone(s) {
  return String(s).replace(/\s+/g, ' ').replace(/\s*\(0\)\s*/, '').trim();
}

function splitNameValue(v) {
  let s = String(v || '').trim();
  if (!s) return null;
  s = s.replace(/\s*\([^)]*\)\s*/g, ' ');
  s = s.replace(/^(M\.|Mr\.?|Mme\.?|Mlle\.?|Monsieur|Madame|Dr\.?)\s+/i, '');
  s = s.replace(/\.{3,}/g, ' ');
  s = s.replace(/[\s.]+$/g, '').replace(/^[\s.]+/g, '');
  s = s.replace(/\s+/g, ' ').trim();
  if (!s) return null;
  const tokens = s.split(/\s+/);
  if (tokens.length < 2) return { prenom: '', nom: tokens[0] || '' };
  const isUpper = (t) => t.length >= 2 && t === t.toUpperCase() && /[A-ZÀ-Ý]/.test(t);
  const upperTokens = tokens.filter(isUpper);
  if (upperTokens.length) {
    const nom = tokens.filter(isUpper).join(' ');
    const prenom = tokens.filter(t => !isUpper(t)).join(' ');
    return { nom, prenom };
  }
  if (/^[A-ZÀ-Ý]/.test(tokens[0]) && /^[A-ZÀ-Ý]/.test(tokens[1])) {
    return { prenom: tokens[0], nom: tokens.slice(1).join(' ') };
  }
  return null;
}

// Détecte un label connu en début de ligne, avec ou sans ":"
const LABEL_RE = /^\s*(nom\s*&?\s*pr[eé]nom|nom et pr[eé]nom|pr[eé]nom et nom|pr[eé]nom|nom|t[eé]l[eé]phone|tel|telephone|portable|mobile|fax|fonction|e[\s-]?mail|mail|courriel|adresse)\s*[:\-]?\s*(.*)$/i;

function classifyLabel(rawLabel) {
  const l = norm(rawLabel).replace(/\s+/g, ' ');
  if (/^(nom\s*&?\s*prenom|nom et prenom|prenom et nom)$/.test(l)) return 'fullname';
  if (/^prenom$/.test(l)) return 'prenom';
  if (/^nom$/.test(l)) return 'nom';
  if (/^(tel|telephone|portable|mobile)$/.test(l)) return 'tel';
  if (/^(e-?mail|mail|courriel)$/.test(l)) return 'mail';
  if (/^fonction$/.test(l)) return 'fonction';
  if (/^fax$/.test(l)) return 'skip';
  if (/^adresse$/.test(l)) return 'skip';
  return null;
}

function isPlaceholder(v) {
  if (!v) return true;
  const t = v.replace(/[\s.\-_]/g, '');
  return t.length === 0;
}

function extractContactFromBlock(blockLines) {
  const c = { prenom: '', nom: '', tel: '', mail: '', fonction: '' };
  const blockText = blockLines.join('\n');
  const blockTextCompact = compactPunct(blockText);

  // Email
  const mails = (blockText.match(EMAIL_RE) || []).concat(blockTextCompact.match(EMAIL_RE) || []);
  if (mails.length) c.mail = mails[0];

  // Téléphone
  const tels = (blockText.match(PHONE_RE) || []).concat(blockTextCompact.match(PHONE_RE) || []);
  if (tels.length) c.tel = cleanPhone(tels[0]);

  // Labels
  for (let i = 0; i < blockLines.length; i++) {
    const line = blockLines[i];
    const m = line.match(LABEL_RE);
    if (!m) continue;
    const kind = classifyLabel(m[1]);
    if (!kind || kind === 'skip') continue;
    let value = (m[2] || '').trim();
    if (isPlaceholder(value) && i + 1 < blockLines.length) {
      const next = blockLines[i + 1];
      if (!LABEL_RE.test(next)) value = next.trim();
    }
    value = value.replace(/\.{3,}/g, ' ').replace(/\s+/g, ' ').trim();
    if (isPlaceholder(value)) continue;
    if (kind === 'fullname') {
      const sp = splitNameValue(value);
      if (sp) { if (!c.prenom) c.prenom = sp.prenom; if (!c.nom) c.nom = sp.nom; }
    } else if (kind === 'prenom' && !c.prenom) {
      c.prenom = value;
    } else if (kind === 'nom' && !c.nom) {
      c.nom = value;
    } else if (kind === 'tel' && !c.tel) {
      c.tel = cleanPhone(value);
    } else if (kind === 'fonction' && !c.fonction) {
      c.fonction = value;
    } else if (kind === 'mail' && !c.mail) {
      const mm = value.match(EMAIL_RE) || compactPunct(value).match(EMAIL_RE);
      if (mm) c.mail = mm[0];
    }
  }

  // Si nom contient prenom + NOM collés
  if (c.nom && !c.prenom) {
    const sp = splitNameValue(c.nom);
    if (sp) { c.prenom = sp.prenom; c.nom = sp.nom; }
  }
  if (c.prenom && !c.nom) {
    const sp = splitNameValue(c.prenom);
    if (sp) { c.prenom = sp.prenom; c.nom = sp.nom; }
  }

  // Fallback prenom.nom@
  if (!c.prenom && !c.nom && c.mail) {
    const local = c.mail.split('@')[0];
    const parts = local.split(/[._-]/).filter(Boolean);
    if (parts.length >= 2 && !/^(contact|info|admin|commercial|facturation|comptab)/i.test(parts[0])) {
      c.prenom = parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
      c.nom = parts.slice(1).join(' ').toUpperCase();
    }
  }

  return c;
}

const SECTION_RE = /^(interlocuteur|contact\s+commercial|contact\s+technique|r[eé]f[eé]rent|responsable)/i;

export function extractAllContactsFromText(text, lines = null) {
  const ls = lines || text.split(/[\n\r]+/).map(l => l.trim()).filter(Boolean);
  // Découpe en blocs sur les en-têtes "Interlocuteur ..." / "Contact Commercial ..."
  const blocks = [];
  let current = [];
  for (const line of ls) {
    if (SECTION_RE.test(line)) {
      if (current.length) blocks.push(current);
      current = [line];
    } else {
      current.push(line);
    }
  }
  if (current.length) blocks.push(current);

  const contacts = [];
  const seen = new Set();
  for (const blk of blocks) {
    const c = extractContactFromBlock(blk);
    if (!c.mail && !c.tel && !c.nom && !c.prenom) continue;
    const key = (c.mail || '') + '|' + (c.nom || '') + '|' + (c.prenom || '');
    if (seen.has(key)) continue;
    seen.add(key);
    contacts.push(c);
  }
  return contacts;
}

// Compat : renvoie le premier contact trouvé
export function extractContactFromText(text, lines = null, formValues = []) {
  // Form fields prioritaires
  const fromForm = { prenom: '', nom: '', tel: '', mail: '' };
  for (const { name, value } of formValues || []) {
    const ln = norm(name);
    const v = String(value).trim();
    if (!v) continue;
    if (!fromForm.prenom && /prenom|first.?name/.test(ln)) fromForm.prenom = v;
    else if (!fromForm.nom && /(^|[^a-z])nom([^a-z]|$)|last.?name/.test(ln)) fromForm.nom = v;
    else if (!fromForm.tel && /tel|phone|mobile|portable/.test(ln)) fromForm.tel = v;
    else if (!fromForm.mail && /mail|courriel/.test(ln)) fromForm.mail = v;
  }
  const all = extractAllContactsFromText(text, lines);
  if (all.length) {
    const first = all[0];
    return {
      prenom: first.prenom || fromForm.prenom,
      nom: first.nom || fromForm.nom,
      tel: first.tel || fromForm.tel,
      mail: first.mail || fromForm.mail,
    };
  }
  return fromForm;
}

export async function extractAllContactsFromPdfFile(fileHandle) {
  const file = await fileHandle.getFile();
  const buf = await file.arrayBuffer();
  const { text, lines, formValues } = await pdfExtract(buf);
  const contacts = extractAllContactsFromText(text, lines);
  if (typeof window !== 'undefined') {
    window.__pdfContactDebug = window.__pdfContactDebug || [];
    window.__pdfContactDebug.push({
      file: fileHandle.name,
      textLength: text.length,
      lineCount: lines.length,
      formFieldCount: formValues.length,
      firstLines: lines.slice(0, 40),
      contacts,
    });
  }
  return contacts;
}

export async function extractContactFromPdfFile(fileHandle) {
  const all = await extractAllContactsFromPdfFile(fileHandle);
  return all[0] || { prenom: '', nom: '', tel: '', mail: '' };
}
