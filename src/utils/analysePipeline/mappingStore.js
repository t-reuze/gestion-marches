/**
 * mappingStore.js
 * Persistance localStorage des mappings utilisateur validés.
 *
 * Clé : `gm-mapping-{marcheId}-{fournisseurNorm}-{docType}`
 * Valeur : { mapping, headers, validatedAt, lotNum }
 *
 * Quand un utilisateur valide manuellement un mapping pour un fournisseur,
 * on le retient. Au prochain scan du même fournisseur, on lookup d'abord.
 */

const PREFIX = 'gm-mapping';

function normFournisseur(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function key(marcheId, fournisseur, docType, lotNum) {
  const f = normFournisseur(fournisseur);
  return `${PREFIX}-${marcheId}-${f}-${docType}-lot${lotNum}`;
}

export function saveMapping(marcheId, fournisseur, docType, lotNum, mapping, headers) {
  try {
    const k = key(marcheId, fournisseur, docType, lotNum);
    localStorage.setItem(k, JSON.stringify({
      mapping,
      headers,
      lotNum,
      validatedAt: new Date().toISOString(),
    }));
    return true;
  } catch {
    return false;
  }
}

export function loadMapping(marcheId, fournisseur, docType, lotNum) {
  try {
    const k = key(marcheId, fournisseur, docType, lotNum);
    const raw = localStorage.getItem(k);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function deleteMapping(marcheId, fournisseur, docType, lotNum) {
  try {
    localStorage.removeItem(key(marcheId, fournisseur, docType, lotNum));
    return true;
  } catch {
    return false;
  }
}

export function listMappings(marcheId) {
  const out = [];
  try {
    const prefix = `${PREFIX}-${marcheId}-`;
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(prefix)) {
        const v = JSON.parse(localStorage.getItem(k));
        out.push({ key: k, ...v });
      }
    }
  } catch {}
  return out;
}

/**
 * Vérifie si les headers d'un fichier correspondent à ceux d'un mapping sauvegardé.
 * Si oui, le mapping est réutilisable tel quel.
 */
export function headersMatch(savedHeaders, currentHeaders) {
  if (!savedHeaders || !currentHeaders) return false;
  if (savedHeaders.length !== currentHeaders.length) return false;
  return savedHeaders.every((h, i) => h === currentHeaders[i]);
}
