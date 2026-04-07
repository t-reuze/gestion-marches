/**
 * index.js
 * Point d'entrée du pipeline d'analyse — orchestration complète.
 *
 * Entrée : un dossier sélectionné par l'utilisateur (FileSystemDirectoryHandle)
 * Sortie : Map<fournisseur, StandardizedBPU>
 */
import XLSX from 'xlsx-js-style';
import { normalizeSheet, normStr } from './normalize.js';
import { detectDocType, readWorkbook, fournisseurFromFilename } from './ingest.js';
import { mapBpuHeaders, applyBpuMapping } from './mappers/bpuMapper.js';
import {
  emptyStandardizedBPU,
  emptyStandardizedBpuLot,
  BPU_REQUIRED_FIELDS,
} from './schemas.js';
import { loadMapping, headersMatch } from './mappingStore.js';

/** Trouve les fichiers xlsx dans un sous-dossier (ex: BPU/, QT/). */
async function listXlsxInSubdir(rootHandle, subdirName) {
  const out = [];
  const norm = s => normStr(s);
  let target = null;
  for await (const [name, handle] of rootHandle.entries()) {
    if (handle.kind === 'directory' && norm(name) === norm(subdirName)) {
      target = handle;
      break;
    }
  }
  if (!target) return out;
  for await (const [name, handle] of target.entries()) {
    if (handle.kind === 'file' && /\.xlsx$/i.test(name) && !name.startsWith('~')) {
      out.push({ name, handle });
    }
  }
  return out.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Détecte les feuilles "Lot N" d'un workbook.
 * @returns Map<lotNum, sheetName>
 */
function detectLotSheets(wb) {
  const lots = new Map();
  for (const sn of wb.SheetNames) {
    const m = normStr(sn).match(/lot\s*(\d+)/);
    if (m) lots.set(parseInt(m[1], 10), sn);
  }
  return lots;
}

/**
 * Pipeline complet pour un fichier BPU.
 * @param {FileSystemFileHandle} fileHandle
 * @param {string} filename
 * @param {string} marcheId - pour lookup mapping persisté
 * @returns {Promise<StandardizedBPU>}
 */
export async function processBpuFile(fileHandle, filename, marcheId) {
  const wb = await readWorkbook(fileHandle);
  const fournisseur = fournisseurFromFilename(filename);
  const result = emptyStandardizedBPU(fournisseur, filename);

  const detection = detectDocType(wb);
  result.meta.detectedType = detection.type;

  const lotSheets = detectLotSheets(wb);
  if (!lotSheets.size) {
    // Pas de feuilles "Lot N" — on essaie quand même la première feuille
    const firstSheet = wb.SheetNames[0];
    if (firstSheet) lotSheets.set(0, firstSheet);
  }

  let totalConf = 0;
  let lotCount = 0;

  for (const [lotNum, sheetName] of lotSheets.entries()) {
    const ws = wb.Sheets[sheetName];
    const { headers, dataRows, headerRowIdx } = normalizeSheet(ws);
    if (headerRowIdx < 0 || !headers.length) continue;

    // Lookup mapping persisté
    let mapping;
    let confidence;
    let unmapped = [];
    let missing = [];
    let ambiguous = [];
    let userValidated = false;

    const saved = loadMapping(marcheId, fournisseur, 'BPU', lotNum);
    if (saved && headersMatch(saved.headers, headers)) {
      mapping = saved.mapping;
      confidence = 1.0;
      userValidated = true;
      missing = BPU_REQUIRED_FIELDS.filter(f => !(f in mapping));
    } else {
      const auto = mapBpuHeaders(headers);
      mapping = auto.mapping;
      confidence = auto.confidence;
      unmapped = auto.unmapped;
      missing = auto.missing;
      ambiguous = auto.ambiguous;
    }

    const { lignes, stats } = applyBpuMapping(dataRows, mapping);
    if (!lignes.length) continue;

    const lot = emptyStandardizedBpuLot(sheetName, headerRowIdx);
    lot.lignes = lignes;
    lot.meta.mappingConfidence = confidence;
    lot.meta.unmappedHeaders = unmapped;
    lot.meta.missingFields = missing;
    lot.meta.ambiguous = ambiguous;
    lot.meta.headers = headers;
    lot.meta.userValidated = userValidated;
    lot.meta.mapping = mapping;
    lot.meta.stats = stats;
    result.lots[lotNum] = lot;

    totalConf += confidence;
    lotCount++;
  }

  result.meta.overallConfidence = lotCount > 0 ? totalConf / lotCount : 0;
  result.meta.userValidated = Object.values(result.lots).every(l => l.meta.userValidated);
  return result;
}

/**
 * Traite tout un dossier BPU/.
 * @param {FileSystemDirectoryHandle} rootHandle
 * @param {string} marcheId
 * @param {function} onProgress
 * @returns {Promise<StandardizedBPU[]>}
 */
export async function processBpuFolder(rootHandle, marcheId, onProgress = () => {}) {
  const files = await listXlsxInSubdir(rootHandle, 'BPU');
  if (!files.length) {
    throw new Error('Aucun fichier .xlsx trouvé dans le sous-dossier BPU/');
  }
  const results = [];
  for (let i = 0; i < files.length; i++) {
    const { name, handle } = files[i];
    onProgress(`${i + 1}/${files.length} — ${name}`);
    try {
      const std = await processBpuFile(handle, name, marcheId);
      results.push(std);
    } catch (e) {
      results.push({
        fournisseur: fournisseurFromFilename(name),
        sourceFile: name,
        lots: {},
        meta: { detectedType: 'unknown', overallConfidence: 0, userValidated: false, error: String(e) },
      });
    }
  }
  return results;
}

// Re-exports pour faciliter l'import
// ─── Pipeline questionnaires (QT, RSE) ────────────────────────────────────────

import { mapQuestionnaireHeaders, applyQuestionnaireMapping } from './mappers/questionnaireMapper.js';

/**
 * Traite un fichier questionnaire (QT ou RSE).
 * @param {string} docType - 'QT' | 'RSE'
 * @returns {Promise<{fournisseur, sourceFile, sections, meta}>}
 */
export async function processQuestionnaireFile(fileHandle, filename, docType, marcheId) {
  const wb = await readWorkbook(fileHandle);
  const fournisseur = fournisseurFromFilename(filename);
  const sections = {};
  let totalConf = 0, sheetCount = 0;

  for (const sheetName of wb.SheetNames) {
    const ws = wb.Sheets[sheetName];
    const { headers, dataRows, headerRowIdx } = normalizeSheet(ws);
    if (headerRowIdx < 0 || !headers.length) continue;

    const { mapping, confidence } = mapQuestionnaireHeaders(headers);
    if (confidence === 0) continue;

    const { items, stats } = applyQuestionnaireMapping(dataRows, mapping);
    if (!items.length) continue;

    // Détecte un éventuel numéro de lot dans le nom de feuille
    const lotMatch = sheetName.match(/lot\s*(\d+)/i);
    const sectionKey = lotMatch ? `lot${lotMatch[1]}` : sheetName;

    sections[sectionKey] = {
      sheetSource: sheetName,
      lotNum: lotMatch ? parseInt(lotMatch[1], 10) : null,
      items,
      stats,
      mappingConfidence: confidence,
    };
    totalConf += confidence;
    sheetCount++;
  }

  return {
    fournisseur,
    sourceFile: filename,
    docType,
    sections,
    meta: {
      overallConfidence: sheetCount > 0 ? totalConf / sheetCount : 0,
      totalSections: sheetCount,
    },
  };
}

export async function processQuestionnaireFolder(rootHandle, subdirName, docType, marcheId, onProgress = () => {}) {
  const files = await listXlsxInSubdir(rootHandle, subdirName);
  if (!files.length) throw new Error(`Aucun .xlsx dans le sous-dossier ${subdirName}/`);
  const results = [];
  for (let i = 0; i < files.length; i++) {
    const { name, handle } = files[i];
    onProgress(`${i + 1}/${files.length} — ${name}`);
    try {
      results.push(await processQuestionnaireFile(handle, name, docType, marcheId));
    } catch (e) {
      results.push({
        fournisseur: fournisseurFromFilename(name),
        sourceFile: name, docType, sections: {},
        meta: { overallConfidence: 0, error: String(e) },
      });
    }
  }
  return results;
}

export { mapQuestionnaireHeaders, applyQuestionnaireMapping } from './mappers/questionnaireMapper.js';
export { mapBpuHeaders, applyBpuMapping } from './mappers/bpuMapper.js';
export { normalizeSheet } from './normalize.js';
export { detectDocType, readWorkbook } from './ingest.js';
export { saveMapping, loadMapping, deleteMapping, listMappings } from './mappingStore.js';
export { BPU_TARGET_FIELDS, BPU_REQUIRED_FIELDS } from './schemas.js';
