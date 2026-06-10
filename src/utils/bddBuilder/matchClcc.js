import * as XLSX from 'xlsx';
import { getUserAlias } from './userAliases.js';

// ═══════════════════════════════════════════════════════════
// Lecture de l'onglet "Nomenclature CLCC et EA" du Suivi_Invest
// et matching d'un libellé "Etablissement (nom + ville)" vers un
// code de nomenclature (col "CLCC unique" de la BDD).
// ═══════════════════════════════════════════════════════════

const STOP_WORDS = new Set([
  'centre', 'center', 'hopital', 'hôpital', 'hopitaux', 'hospitalier', 'hospitalière',
  'universitaire', 'régional', 'regional', 'institut', 'le', 'la', 'les', 'de', 'du',
  'des', 'et', 'à', 'a', 'au', 'aux', 'en', 'sur', 'site', 'ensemble', 'chu', 'chr',
  'chru', 'aphp', 'aphm', 'ch', 'gh', 'ea', 'groupe', 'groupement', 'sas', 'clcc',
]);

// Aliases manuels connus (input normalisé → nomenclature cible).
// Sert quand le nom dans le reporting est très différent du nom officiel.
export const MANUAL_ALIASES = {
  'ipc': 'Marseille',                       // Institut Paoli Calmettes
  'paoli calmette': 'Marseille',
  'paoli calmettes': 'Marseille',
  'paul papin': 'ICO',                      // site de l'Institut de Cancérologie de l'Ouest
  'campus nice': 'Nice',                    // Antoine Lacassagne
  'leclerc dijon': 'Dijon',
  'georges francois leclerc': 'Dijon',
  'bergonie': 'Bordeaux',
  'institut bergonie': 'Bordeaux',
  'baclesse': 'Caen',
  'francois baclesse': 'Caen',
  'jean godinot': 'Reims',
  'eugene marquis': 'Rennes',
  'henri becquerel': 'Rouen',
  'jean perrin': 'Clermont-Ferrand',
  'leon berard': 'Lyon',
  'oscar lambret': 'Lille',
  'curie': 'Curie',
  'gustave roussy': 'Villejuif',
  'claudius regaud': 'Toulouse',
  'ico': 'ICO',
  'institut de cancerologie de l\'ouest': 'ICO',
  'icans': 'Strasbourg',
  'strasbourg europe': 'Strasbourg',
  'chr lille': 'CHRU_Lille',
  'haut leveque':         'CHU_Bordeaux',
  'pessac':               'CHU_Bordeaux',
  'site canceropole':     'ICO',
  'hopital clermont':     'Clermont-Ferrand',
  'chu clermont':         'Clermont-Ferrand',
  'clermont ferrand':     'Clermont-Ferrand',
  'jean perrin':          'Clermont-Ferrand',
  'chu reims':            'CHU_Reims',
  'chu rennes':           'CHU_Rennes',
  'rennes pontchaillou':  'CHU_Rennes',
  'la rochelle':          'GH_La_Rochelle',
  'chru nancy':           'CHRU_Nancy',
  'chru brest':           'CHRU_Brest',
  'necker':               'Hopital_Necker_Paris',
  'henri mondor':         'APHP_Henri_Mondor',
  'la pitie':             'APHP_La_Pitie_Salpetriere',
  'pompidou':             'APHP_Pompidou',
  'hegp':                 'APHP_Pompidou',         // Hôpital Européen Georges Pompidou
  'broussais':            'APHP_Pompidou',
  'paul brousse':         'APHP_Paul_Brousse',
  'montpellier':          'Montpellier',
  'lapeyronie':           'CHU_Montpellier',
  'nimes':                'CHU_Nîmes_Caremeau',
  'chu nice':             'CHU_Nice',
  'multi':                'Multi-centres',
  // Anapath PPE028 — formes observées dans les reportings MM France / Leica :
  'perpignan':            'CH_Perpignan',
  'boulin':               'CH_R_BOULIN_Libourne',  // Centre Hospitalier R.Boulin
  'libourne':             'CH_R_BOULIN_Libourne',
  'troyes':               'CH_Troyes',
  'beziers':              'CH_Béziers',
  'béziers':              'CH_Béziers',
  'aphm':                 'APHM',
  'timone':               'APHM_La_Timone',
  'trevenans':            'HNFC_Trévenans',
  'hnfc':                 'HNFC_Trévenans',
  'st etienne':           'CHU_Saint-Etienne',
  'saint etienne':        'CHU_Saint-Etienne',
  'saint-etienne':        'CHU_Saint-Etienne',
  'amiens':               'CHU_Amiens_Picardie',
  'colmar':               'CH_Colmar',
  'roanne':               'CH_Roanne',
  'metz':                 'CHR_Metz_Thionville',
  'thionville':           'CHR_Metz_Thionville',
  'pontoise':             'Hopital_Novo_Pontoise',
  'valenciennes':         'CH_Valenciennes',
  'aubagne':              'CH_Aubagne',
  'le mans':              'CH_Le_Mans',
  'la roche':             'CHD_La_Roche',
  'cherbourg':            'CHPC_Cherbourg',
  'kremlin bicetre':      'APHP_Kremlin_Bicetre',
  'kremlin-bicetre':      'APHP_Kremlin_Bicetre',
  'tenon':                'APHP_Hopital_Tenon',
  'cochin':               'APHP_Cochin',
  'charles foix':         'APHP_Hopital_Charles-Foix',
  'orleans':              'CHR_Orleans',
  'limoges':              'CHU_Limoges',
  'poitiers':             'CHU_Poitiers',
  'tours':                'CHRU_Tours',
  'beauvais':             'CH_Beauvais',
  'argenteuil':           'CH_Argenteuil',
  'chambery':             'CH_Chambery',
  'chambéry':             'CH_Chambery',
  'gueret':               'CH_Gueret',
  'guéret':               'CH_Gueret',
  'brive':                'CH_Brive',
  'rodez':                'CH_Rodez',
  'dax':                  'CH_Dax',
  'reunion':              'CHU_Reunion',
  'guadeloupe':           'GHT_Guadeloupe',
  'gap':                  'CHICAS_Gap',
  'sud gironde':          'CH_Sud_Gironde',
  'la reole':             'CH_Sud_Gironde',
  'lens':                 'CH_Lens',
  'helfaut':              'CH_Saint_Omer',
  'saint omer':           'CH_Saint_Omer',
  'arcachon':             'CH_Arcachon',
  'la teste':             'CH_Arcachon',
  'montelimar':           'CH_Montelimar',
  'niort':                'CH_Niort',
  'annecy':               'CH_Annecy',
  'moulins':              'CH_Moulins',
  'bourg en bresse':      'CH_Bourg-en-Bresse',
  'fleyriat':             'CH_Bourg-en-Bresse',
  'st priest':            'ICLN_Saint-Priest-en-Jarez',
  'saint priest en jarez':'ICLN_Saint-Priest-en-Jarez',
  'orleans':              'CHR_Orleans',
  'chateauroux':          'CH_Chateauroux',
  'castres':              'CH_Castres',
  'ajaccio':              'CH_Ajaccio_Miséricorde',
  'miséricorde':          'CH_Ajaccio_Miséricorde',
  'misericorde':          'CH_Ajaccio_Miséricorde',
  'charleville':          'CH_Charleville_Mezieres',
  'saint quentin':        'CH_Saint_Quentin',
  'st quentin':           'CH_Saint_Quentin',
  'doulchard':            'CSJ_Saint-Doulchard',
  'saint doulchard':      'CSJ_Saint-Doulchard',
  'bourges':              'CSJ_Saint-Doulchard',
  'besancon':             'CHRU_Besancon',
  'besançon':             'CHRU_Besancon',
  'r.boulin':             'CH_R_BOULIN_Libourne',
  'r boulin':             'CH_R_BOULIN_Libourne',
  'pellegrin':            'CHU_Bordeaux',          // CHU Bordeaux - Hôpital Pellegrin
  'brabois':              'CHRU_Nancy',            // CHRU Nancy - Hôpital Brabois
  'becquerel':            'Rouen',                 // Centre Henri Becquerel = CLCC Rouen
  'henri becquerel':      'Rouen',
  'haut leveque':         'CHU_Bordeaux',
  'lacassagne':           'Nice',                  // Centre Antoine Lacassagne = CLCC Nice
  'antoine lacassagne':   'Nice',
  // CLCC observés non reconnus dans les reportings BM/Anapath (audit 2026) :
  'institut de cancerologie de lorraine': 'Nancy',
  'cancerologie de lorraine':             'Nancy',
  'alexis vautrin':                       'Nancy',  // Centre Alexis Vautrin = ICL Nancy
  'icl':                                  'Nancy',
  'godinot':                              'Reims',  // Institut Jean Godinot
  'institut du cancer de montpellier':    'Montpellier',
  'institut regional du cancer':          'Montpellier',  // ICM Montpellier
  'institut regional de cancer':          'Montpellier',
  'icm':                                  'Montpellier',
  'gauducheau':                           'ICO',    // Centre René Gauducheau = ICO Nantes
  'rene gauducheau':                      'ICO',
  'cancerologie de l ouest':              'ICO',    // variante sans "de" / "Institut"
  'paul strauss':                         'Strasbourg',
  'francois leclerc':                     'Dijon',  // "G.François Leclerc" (sans "Georges")
  'nord franche comte':                   'HNFC_Trévenans',
  'franche comte':                        'HNFC_Trévenans',
};

function stripAccents(s) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '');
}

// Clés d'alias pré-normalisées (mêmes règles que l'input) → la comparaison se fait
// normalisé-contre-normalisé. Sans ça, tout alias contenant une apostrophe ou un
// accent (ex: "institut de cancerologie de l'ouest") ne matchait JAMAIS.
// Trié par longueur décroissante : on privilégie l'alias le plus spécifique
// (ex: "saint priest en jarez" avant "st priest") en cas de chevauchement.
let _normalizedAliases = null;
function getNormalizedAliases() {
  if (_normalizedAliases) return _normalizedAliases;
  _normalizedAliases = Object.entries(MANUAL_ALIASES)
    .map(([alias, target]) => [normalizeText(alias), target])
    .filter(([a]) => a.length > 0)
    .sort((x, y) => y[0].length - x[0].length);
  return _normalizedAliases;
}

/**
 * Normalise un code CLCC pour la comparaison/dédup, indépendamment des variations
 * de saisie : "CHU RENNES", "CHU_Rennes", "chu rennes", "chu-rennes" → "churennes".
 * Utilisé pour comparer une ligne candidate à des lignes BDD existantes ou
 * détecter des doublons.
 */
export function canonCodeForMatch(code) {
  return stripAccents(String(code || '')).toLowerCase().replace(/[\s_\-/]+/g, '').trim();
}

/**
 * Normalise un libellé de lot pour la comparaison.
 * "Anatomopathologie_PPE028_Lot1", "Anatomopathologie_PPE028_Lot_1",
 * "Anatomopathologie_PPE028_Lot 1" → "anatomopathologieppe028lot1"
 */
export function canonLotLabelForMatch(lot) {
  return stripAccents(String(lot || '')).toLowerCase()
    .replace(/lot[\s_\-]*/g, 'lot')
    .replace(/[\s_\-/]+/g, '')
    .trim();
}

export function normalizeText(s) {
  if (!s) return '';
  return stripAccents(String(s)).toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenize(s) {
  const norm = normalizeText(s);
  return norm.split(/\s+/).filter(t => t && !STOP_WORDS.has(t) && t.length > 1);
}

// Split "Nom - Ville" → { nom, ville } si séparateur présent, sinon { nom: s, ville: '' }
function splitNomVille(s) {
  const idx = s.indexOf(' - ');
  if (idx >= 0) return { nom: s.slice(0, idx).trim(), ville: s.slice(idx + 3).trim() };
  return { nom: s.trim(), ville: '' };
}

// Recherche tolérante d'onglet : ignore casse, accents, espaces multiples,
// sépaateurs (- _ /). Tente d'abord un match exact, puis normalisé,
// puis "contient" sur les mots-clés "nomenclature" + ("clcc" ou "ea").
function findNomenclatureSheet(wb) {
  const exact = wb.Sheets['Nomenclature CLCC et EA'];
  if (exact) return exact;

  const target = normalizeSheet('Nomenclature CLCC et EA');
  for (const name of wb.SheetNames) {
    if (normalizeSheet(name) === target) return wb.Sheets[name];
  }
  // Fallback : un onglet contenant "nomenclature" et ("clcc" ou "ea")
  for (const name of wb.SheetNames) {
    const n = normalizeSheet(name);
    if (n.includes('nomenclature') && (n.includes('clcc') || n.includes(' ea ') || n.endsWith(' ea') || n === 'ea')) {
      return wb.Sheets[name];
    }
  }
  return null;
}

function normalizeSheet(s) {
  return String(s)
    .normalize('NFD').replace(/[̀-ͯ]/g, '')         // accents
    .replace(/[\s_\-/]+/g, ' ')                       // séparateurs → espace
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

// Charge la nomenclature depuis un workbook (ou un arrayBuffer)
export function loadNomenclature(wbOrBuffer) {
  let wb;
  if (wbOrBuffer instanceof ArrayBuffer || ArrayBuffer.isView(wbOrBuffer)) {
    wb = XLSX.read(wbOrBuffer, { type: 'array' });
  } else {
    wb = wbOrBuffer;
  }
  const ws = findNomenclatureSheet(wb);
  if (!ws) {
    throw new Error(
      'Onglet "Nomenclature CLCC et EA" introuvable. ' +
      `Onglets disponibles : ${wb.SheetNames.join(', ')}`
    );
  }

  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', blankrows: false });
  const entries = [];
  let currentType = null;
  for (const r of rows) {
    const [colA, nom, ville, region, nomenclature] = r;
    const head = String(colA || '').trim();
    if (/^CLCC$/i.test(head)) currentType = 'Unicancer';
    else if (/^(Etablissement Affili[ée]|EA)$/i.test(head)) currentType = 'Etablissement affilié';

    const code = String(nomenclature || '').trim();
    if (!code || code === 'Nomenclature') continue;
    // Ligne de commentaire (pas d'établissement associé)
    const nomStr = String(nom || '').trim();
    if (!nomStr) continue;

    entries.push({
      type:         currentType || (head === '' ? 'Etablissement affilié' : 'Unicancer'),
      nom:          nomStr,
      ville:        String(ville || '').trim(),
      region:       String(region || '').trim(),
      nomenclature: code,
    });
  }
  return entries;
}

// Score un candidat : 0..1
// Approche pondérée : les tokens rares (nom propre = "becquerel", "leclerc")
// pèsent plus que les communs (ville, mots stop déjà filtrés).
function scoreCandidate(input, candidate, tokenWeights) {
  const { nom: inNom, ville: inVille } = splitNomVille(input);
  const inFull = normalizeText(input);

  const candVille = normalizeText(candidate.ville);
  const candTokens = new Set(tokenize(candidate.nom));
  const inTokens = new Set([...tokenize(inFull), ...tokenize(inNom || '')]);

  // Bonus ville
  let villeScore = 0;
  if (inVille && candVille && normalizeText(inVille) === candVille) villeScore = 0.35;
  else if (inFull.includes(candVille) && candVille.length > 3) villeScore = 0.25;

  // Bonus nom propre : on cumule les poids des tokens partagés
  let weighted = 0, candWeightTotal = 0;
  for (const t of candTokens) {
    const w = tokenWeights[t] || 1;
    candWeightTotal += w;
    if (inTokens.has(t)) weighted += w;
  }
  const namedScore = candWeightTotal > 0 ? weighted / candWeightTotal : 0;

  // Bonus si le code de nomenclature lui-même apparaît dans l'input (ex: "CHU_Reims" tapé tel quel)
  let codeScore = 0;
  const candCodeNorm = normalizeText(candidate.nomenclature);
  if (candCodeNorm && inFull.includes(candCodeNorm)) codeScore = 0.4;

  return Math.min(1, villeScore + 0.55 * namedScore + codeScore);
}

// Calcule les poids inversement proportionnels à la fréquence d'un token
// dans toute la nomenclature : un token rare (becquerel apparaît 1× → poids haut)
// pèse plus qu'un commun (lyon apparaît plusieurs fois → poids bas).
function buildTokenWeights(nomenclature) {
  const freq = {};
  for (const e of nomenclature) {
    const tokens = new Set(tokenize(`${e.nom} ${e.ville}`));
    for (const t of tokens) freq[t] = (freq[t] || 0) + 1;
  }
  const N = nomenclature.length;
  const w = {};
  for (const t of Object.keys(freq)) {
    // IDF-like : fréquence basse → poids haut
    w[t] = Math.log(1 + N / freq[t]);
  }
  return w;
}

// Cache des poids par identité de tableau nomenclature : on parse souvent
// des centaines de lignes contre la même nomenclature.
const _tokenWeightsCache = new WeakMap();
function getTokenWeights(nomenclature) {
  let w = _tokenWeightsCache.get(nomenclature);
  if (!w) {
    w = buildTokenWeights(nomenclature);
    _tokenWeightsCache.set(nomenclature, w);
  }
  return w;
}

/**
 * Associe un libellé "Etablissement (nom + ville)" à une entrée de la nomenclature.
 * @returns {{ nomenclature: string, type: string, confidence: number, candidate: object | null, matchedVia: 'alias'|'fuzzy'|'none' }}
 */
export function matchEtablissement(input, nomenclature) {
  const raw = String(input || '').trim();
  if (!raw) return { nomenclature: '', type: '', confidence: 0, candidate: null, matchedVia: 'none' };

  const normInput = normalizeText(raw);

  // 0. Alias utilisateur (corrections passées) — priorité absolue.
  // Si l'utilisateur a déjà corrigé ce libellé exact dans une session précédente,
  // on réutilise sa décision (matching à confiance 100%).
  const userTarget = getUserAlias(raw);
  if (userTarget) {
    const cand = nomenclature.find(e => e.nomenclature === userTarget);
    return {
      nomenclature: userTarget,
      type: cand?.type || 'Etablissement affilié',
      confidence: 1.0,
      candidate: cand || { nomenclature: userTarget, type: 'Etablissement affilié', nom: '', ville: '' },
      matchedVia: 'user-alias',
    };
  }

  // 1. Alias manuels (substring, comparaison normalisé-contre-normalisé)
  for (const [alias, target] of getNormalizedAliases()) {
    if (normInput.includes(alias)) {
      const cand = nomenclature.find(e => e.nomenclature === target);
      if (cand) {
        return { nomenclature: target, type: cand.type, confidence: 0.95, candidate: cand, matchedVia: 'alias' };
      }
      // L'alias est défini mais le code n'est pas (encore) dans l'onglet
      // "Nomenclature CLCC et EA" : ça arrive pour des EA saisis directement en BDD
      // sans avoir été ajoutés à la nomenclature de référence. On retourne quand même
      // le code, en supposant un EA (type le plus fréquent pour ces cas).
      return {
        nomenclature: target,
        type: 'Etablissement affilié',
        confidence: 0.85,
        candidate: { nomenclature: target, type: 'Etablissement affilié', nom: '', ville: '' },
        matchedVia: 'alias-out-of-nom',
      };
    }
  }

  // 2. Fuzzy pondéré (tokens rares > stop words / villes communes)
  const tokenWeights = getTokenWeights(nomenclature);
  let best = { score: 0, cand: null };
  for (const cand of nomenclature) {
    const score = scoreCandidate(raw, cand, tokenWeights);
    if (score > best.score) best = { score, cand };
  }
  if (best.cand && best.score >= 0.4) {
    return {
      nomenclature: best.cand.nomenclature,
      type: best.cand.type,
      confidence: best.score,
      candidate: best.cand,
      matchedVia: 'fuzzy',
    };
  }

  return { nomenclature: '', type: '', confidence: best.score, candidate: best.cand, matchedVia: 'none' };
}

/**
 * RÉCONCILIATION : dérive des alias (libellé brut → code CLCC) en s'appuyant sur
 * la BDD historique comme supervision, SANS modèle. Principe : une ligne de
 * reporting non reconnue qui s'apparie (même montant TTC arrondi + même année)
 * à une ligne BDD au CLCC connu et UNIQUE → on en déduit l'alias.
 *
 * @param {Array<{etablissement, annee, montantTtc}>} lignes  lignes parsées (reporting)
 * @param {Array<{clcc, annee, ttc}>} bddRows  lignes existantes de la BDD (même marché)
 * @param {Array} nomenclature
 * @returns {Array<{key, raw, code, support}>}  alias dérivés (key = libellé normalisé)
 */
export function deriveAliasesFromBdd(lignes, bddRows, nomenclature) {
  const byTtc = new Map();
  for (const r of bddRows) {
    const k = Math.round(Number(r.ttc) || 0);
    if (!k) continue;
    (byTtc.get(k) || byTtc.set(k, []).get(k)).push(r);
  }
  const votes = new Map();   // libellé normalisé → { raw, codes: {code: count} }
  for (const l of lignes) {
    const raw = l.etablissement;
    if (!raw) continue;
    if (matchEtablissement(raw, nomenclature).confidence >= 0.7) continue;   // déjà bien reconnu
    const cand = byTtc.get(Math.round(Number(l.montantTtc) || 0));
    if (!cand || !cand.length) continue;
    // si une année est dispo des deux côtés, on l'exige identique
    const sameYear = cand.filter(c => !l.annee || !c.annee || Number(c.annee) === Number(l.annee));
    const codes = [...new Set((sameYear.length ? sameYear : cand).map(c => c.clcc).filter(Boolean))];
    if (codes.length !== 1) continue;   // ambigu → on s'abstient
    const key = normalizeText(raw);
    if (!key) continue;
    const v = votes.get(key) || { raw, codes: {} };
    v.codes[codes[0]] = (v.codes[codes[0]] || 0) + 1;
    votes.set(key, v);
  }
  const out = [];
  for (const [key, v] of votes) {
    const [code, support] = Object.entries(v.codes).sort((a, b) => b[1] - a[1])[0];
    out.push({ key, raw: v.raw, code, support });
  }
  return out;
}

/**
 * Retourne les k meilleurs candidats de nomenclature pour un libellé, classés
 * par score décroissant (dédupliqués par code). Sert aux suggestions de
 * correction à l'étape de revue — particulièrement utile sur des marchés non
 * vus, où l'alias manuel n'existe pas encore.
 * @returns {Array<{ nomenclature, type, nom, ville, score }>}
 */
export function topCandidates(input, nomenclature, k = 3) {
  const raw = String(input || '').trim();
  if (!raw || !nomenclature?.length) return [];
  const tokenWeights = getTokenWeights(nomenclature);
  const scored = nomenclature
    .map(cand => ({ cand, score: scoreCandidate(raw, cand, tokenWeights) }))
    .sort((a, b) => b.score - a.score);

  const seen = new Set();
  const out = [];
  for (const { cand, score } of scored) {
    if (seen.has(cand.nomenclature)) continue;   // un même code peut avoir plusieurs sites
    seen.add(cand.nomenclature);
    out.push({ nomenclature: cand.nomenclature, type: cand.type, nom: cand.nom, ville: cand.ville, score });
    if (out.length >= k) break;
  }
  return out;
}
