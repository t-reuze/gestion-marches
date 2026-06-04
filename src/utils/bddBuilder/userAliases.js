// ═══════════════════════════════════════════════════════════
// Persistance des corrections d'établissement faites par l'utilisateur
// à l'étape 4 (revue). Chaque correction crée une entrée :
//   { sourceText: "GH HEGP-BROUSSAIS", target: "APHP_Pompidou", count }
// Ces aliases sont ensuite re-injectés au prochain import pour ce
// même libellé (correspondance exacte, normalisée).
// ═══════════════════════════════════════════════════════════

const STORAGE_KEY = 'gm-bdd-user-aliases';

function read() {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function write(map) {
  try {
    if (typeof localStorage !== 'undefined') localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch (_) { /* quota dépassé */ }
}

function key(sourceText) {
  return String(sourceText || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();
}

export function getUserAlias(sourceText) {
  const map = read();
  const k = key(sourceText);
  if (!k) return null;
  const entry = map[k];
  return entry ? entry.target : null;
}

export function rememberUserAlias(sourceText, target) {
  if (!sourceText || !target) return;
  const map = read();
  const k = key(sourceText);
  if (!k) return;
  const existing = map[k];
  map[k] = { target, count: (existing?.count || 0) + 1, lastSeen: Date.now() };
  write(map);
}

export function forgetUserAlias(sourceText) {
  const map = read();
  const k = key(sourceText);
  delete map[k];
  write(map);
}

export function listUserAliases() {
  return read();
}

export function clearUserAliases() {
  try { if (typeof localStorage !== 'undefined') localStorage.removeItem(STORAGE_KEY); } catch (_) {}
}
