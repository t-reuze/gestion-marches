import * as XLSX from 'xlsx';
import mammoth from 'mammoth/mammoth.browser';

// ═══════════════════════════════════════════════════════════
// Parse d'un fichier d'allotissement (docx ou xlsx).
// Retourne : [{ numLot: number, objet: string, description: string }, ...]
// ═══════════════════════════════════════════════════════════

const LOT_REGEX = /^\s*lot\s*(\d+)\s*[:\-–]\s*(.+?)\s*$/i;

export async function parseAllotissement(file) {
  const name = file.name.toLowerCase();
  if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
    return parseAllotissementXlsx(await file.arrayBuffer());
  }
  if (name.endsWith('.docx')) {
    return parseAllotissementDocx(await file.arrayBuffer());
  }
  throw new Error(`Format non supporté : ${file.name}`);
}

export function parseAllotissementXlsx(buffer) {
  const wb = XLSX.read(buffer, { type: 'array' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', blankrows: false });

  const lots = [];
  for (let i = 0; i < rows.length; i++) {
    const [a, b, c] = rows[i];
    const numLot = Number(String(a).trim());
    if (!Number.isInteger(numLot) || numLot <= 0) continue;
    lots.push({
      numLot,
      objet: String(b || '').trim(),
      description: String(c || '').trim(),
    });
  }
  return lots;
}

export async function parseAllotissementDocx(buffer) {
  const { value: text } = await mammoth.extractRawText({ arrayBuffer: buffer });
  const lots = [];
  const seen = new Set();
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    const m = line.match(LOT_REGEX);
    if (!m) continue;
    const numLot = Number(m[1]);
    if (seen.has(numLot)) continue;
    seen.add(numLot);
    lots.push({ numLot, objet: m[2], description: '' });
  }
  lots.sort((a, b) => a.numLot - b.numLot);
  return lots;
}
