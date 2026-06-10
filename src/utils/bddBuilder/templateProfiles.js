// ═══════════════════════════════════════════════════════════
// Profils de template ("apprendre une fois").
// Quand l'auto-détection (L1 contenu / L2 matrice) se trompe sur un fichier,
// l'utilisateur corrige le mapping des colonnes UNE fois ; on le mémorise par
// EMPREINTE de template (famille de fichiers au même squelette). Les fichiers
// suivants de la même famille réutilisent ce mapping automatiquement.
//
// 100 % local (localStorage), aucune donnée ne sort. Déterministe, explicable.
// ═══════════════════════════════════════════════════════════

const STORAGE_KEY = 'gm-bdd-template-profiles';

// Normalise un nom d'onglet en motif stable : minuscules, sans accents,
// chiffres → '#', séparateurs → espace. "Lot 1"/"Lot 25" → "lot #" ;
// "Lots 1-12"/"Lots 13-40" → "lots # #" ; "Feuil1" → "feuil#".
function normSheetPattern(s) {
  return String(s)
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\d+/g, '#')
    .replace(/[\s_\-/]+/g, ' ')
    .trim();
}

// Un onglet est "vide" (helper Excel par défaut type Feuil1/Feuil2) s'il a très
// peu de cellules. On l'ignore dans l'empreinte pour ne pas casser le regroupement
// de famille (mais un onglet "Feuil1" QUI CONTIENT des données, ex. CLARMAX, est gardé).
function sheetCellCount(ws) {
  if (!ws) return 0;
  let n = 0;
  for (const k in ws) { if (k[0] !== '!') n++; }
  return n;
}

/**
 * Empreinte d'un workbook = ensemble trié des motifs de noms d'onglets
 * NON VIDES (hors "Partenariat"). Regroupe les fichiers d'une même famille de
 * template (ex. Elekta / Meditest / PTW partagent tous "lot #").
 */
export function fingerprintWorkbook(wb) {
  if (!wb || !wb.SheetNames) return '';
  const pats = [...new Set(
    wb.SheetNames
      .filter(n => sheetCellCount(wb.Sheets?.[n]) >= 5)   // ignore les onglets vides
      .map(normSheetPattern)
      .filter(n => n && !/partenariat/.test(n))
  )].sort();
  return pats.join(' | ');
}

function readAll() {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}
function writeAll(map) {
  try { if (typeof localStorage !== 'undefined') localStorage.setItem(STORAGE_KEY, JSON.stringify(map)); }
  catch (_) { /* quota */ }
}

export function getProfile(fingerprint) {
  if (!fingerprint) return null;
  return readAll()[fingerprint] || null;
}

export function getProfilesMap() {
  return readAll();
}

/**
 * Enregistre/écrase un profil pour une empreinte.
 * @param {string} fingerprint
 * @param {{ name?, mode?, roles: Record<string, number> }} profile
 *   roles = { etablissement: 3, montantTtc: 6, designation: 5, ... } (index 0-based)
 */
export function saveProfile(fingerprint, profile) {
  if (!fingerprint || !profile) return;
  const all = readAll();
  all[fingerprint] = {
    name: profile.name || fingerprint,
    mode: profile.mode || 'transactional',
    roles: profile.roles || {},
    savedAt: profile.savedAt || null,   // horodatage fourni par l'appelant (pas de Date.now ici)
  };
  writeAll(all);
}

export function forgetProfile(fingerprint) {
  const all = readAll();
  delete all[fingerprint];
  writeAll(all);
}
