/**
 * docxContact.js
 * Extraction PRENOM/NOM/TEL/MAIL depuis une fiche contact .docx
 * Réutilise extractContactFromText de pdfContact.
 */
import mammoth from 'mammoth/mammoth.browser';
import { extractAllContactsFromText, extractContactFromText } from './pdfContact.js';

export async function extractAllContactsFromDocxFile(fileHandle) {
  const file = await fileHandle.getFile();
  const arrayBuffer = await file.arrayBuffer();
  const { value: text } = await mammoth.extractRawText({ arrayBuffer });
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const contacts = extractAllContactsFromText(text, lines);
  if (typeof window !== 'undefined') {
    window.__docxContactDebug = window.__docxContactDebug || [];
    window.__docxContactDebug.push({
      file: fileHandle.name,
      textLength: text.length,
      lineCount: lines.length,
      firstLines: lines.slice(0, 40),
      contacts,
    });
  }
  return contacts;
}

export async function extractContactFromDocxFile(fileHandle) {
  const all = await extractAllContactsFromDocxFile(fileHandle);
  return all[0] || { prenom: '', nom: '', tel: '', mail: '' };
}
