/**
 * analyseFolder.js
 * Logique de scan et compilation de dossiers AO fournisseurs.
 * Paramétré par une config marché (lots, docLabels, bpuReq, lotSheets…).
 *
 * Extrait de AnalyseMarche.jsx pour être réutilisable par marché.
 */
import XLSX from 'xlsx-js-style';
import JSZip from 'jszip';
import { extractContactsFromWorkbook } from './analysePipeline/contactExtractor.js';
import { extractContactFromPdfFile, extractAllContactsFromPdfFile } from './analysePipeline/pdfContact.js';
import { extractContactFromDocxFile, extractAllContactsFromDocxFile } from './analysePipeline/docxContact.js';

// ─── Helpers fichiers ─────────────────────────────────────────────────────────

export async function getAllFiles(dirHandle, path = '') {
  const files = [];
  for await (const [name, handle] of dirHandle.entries()) {
    if (name.startsWith('~') || name.startsWith('.')) continue;
    const fullPath = path ? path + '/' + name : name;
    if (handle.kind === 'file') files.push({ name, path: fullPath, handle });
    else files.push(...await getAllFiles(handle, fullPath));
  }
  return files;
}

export async function getSubdirs(dirHandle) {
  const dirs = [];
  for await (const [name, handle] of dirHandle.entries()) {
    if (handle.kind === 'directory' && !name.startsWith('.')) dirs.push({ name, handle });
  }
  return dirs.sort((a, b) => a.name.localeCompare(b.name));
}

export async function findStdDir(dirHandle, depth = 0) {
  if (depth > 5) return null;
  const norm = s => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const entries = [];
  for await (const [name, handle] of dirHandle.entries()) entries.push([name, handle]);

  for (const [name, handle] of entries) {
    if (handle.kind === 'directory' && norm(name) === 'standardises') return handle;
  }

  const hasQT = entries.some(([n, h]) => h.kind === 'file' && /_qt_standardis/i.test(n) && !n.startsWith('~'));
  const subNorm = new Set(entries.filter(([, h]) => h.kind === 'directory').map(([n]) => norm(n)));
  if (hasQT || subNorm.has('bpu') || subNorm.has('rse') || subNorm.has('chiffrage')) return dirHandle;

  const SKIP = new Set(['standardises', 'compilation', '__pycache__', 'node_modules']);
  for (const [name, handle] of entries) {
    if (handle.kind !== 'directory' || name.startsWith('.') || SKIP.has(norm(name))) continue;
    const found = await findStdDir(handle, depth + 1);
    if (found) return found;
  }
  return null;
}

export async function findSubdirByName(dirHandle, name) {
  const norm = s => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  for await (const [n, h] of dirHandle.entries()) {
    if (h.kind === 'directory' && norm(n) === norm(name)) return h;
  }
  return null;
}

export async function listXlsxFiles(dirHandle, suffixRe) {
  const files = [];
  for await (const [name, handle] of dirHandle.entries()) {
    if (handle.kind === 'file' && /\.xlsx$/i.test(name) && !name.startsWith('~')) {
      const supName = name.replace(suffixRe, '').trim();
      files.push({ name, handle, supName });
    }
  }
  return files.sort((a, b) => a.supName.localeCompare(b.supName));
}

// ─── Helpers valeurs ──────────────────────────────────────────────────────────

const NA_VALS = new Set(['na', 'n/a', 'n.a.', 'n.a', 'non applicable', 'néant', 'neant', '-']);
export const isRealVal = v => { const s = String(v || '').trim().toLowerCase(); return s !== '' && !NA_VALS.has(s); };

/**
 * Normalisation aggressive pour rapprocher les noms fournisseurs entre sources.
 * Ex : "CAMO" ≈ "Camo medical", "DERODES" ≈ "DERODES PARTNERS",
 *      "AGATE life sciences" ≈ "AGATE LIFE SCIENCES"
 *
 * Stratégie : minuscules, sans accents, sans suffixes corporate, sans
 * mots génériques (life sciences, partners, sas, sa, sarl, group, etc.)
 */
const SUP_STOPWORDS = new Set([
  'sas', 'sa', 'sarl', 'sasu', 'eurl', 'snc', 'scop', 'gie', 'sci',
  'group', 'groupe', 'holding', 'company', 'co', 'inc', 'ltd', 'llc', 'plc',
  'partners', 'partner', 'consulting', 'consultants', 'consultant',
  'services', 'service', 'solutions', 'solution',
  'life', 'sciences', 'science', 'health', 'healthcare', 'medical', 'pharma',
  'france', 'fr', 'international', 'intl', 'europe', 'eu',
  'agency', 'agence', 'societe', 'cie',
]);

/**
 * Détecte si un nom de dossier est un "complément" d'un fournisseur existant.
 * Patterns reconnus : "complément XX Fournisseur", "Complement Fournisseur",
 *                     "Fournisseur complément", "Fournisseur - complément"
 * @returns {string|null} le nom du fournisseur de base, ou null si ce n'est pas un complément
 */
export function extractComplementBase(dirName) {
  const s = String(dirName || '').trim();
  // Détecte si le nom commence par "complément(s)" (singulier ou pluriel, avec/sans accent)
  const m1 = s.match(/^compl[eéè]ments?\s+(?:\d+\s+)?(.+)$/i);
  if (m1) {
    // Nettoie les infos de lot/référence après le nom du fournisseur
    // ex: "Compléments Qualimedis Lot nr 1 uRT506c UIH" → "Qualimedis"
    let name = m1[1].trim();
    name = name.replace(/\s+lot\s+.*/i, '').trim();
    return name || null;
  }
  // "NomFournisseur complément(s)" ou "NomFournisseur - complément(s) XX"
  const m2 = s.match(/^(.+?)\s*[-–—]?\s*compl[eéè]ments?(?:\s+\d+)?$/i);
  if (m2) return m2[1].trim();
  return null;
}

export const normSupName = s => {
  const base = String(s || '')
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+ok$/i, '')
    .replace(/[\(\)\[\]\.,;:'"\/\\]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  // Garde la version "loose" : tokens significatifs (≥ 2 caractères, pas stopwords)
  const tokens = base.split(' ').filter(t => t.length >= 2 && !SUP_STOPWORDS.has(t));
  return tokens.length ? tokens.join(' ') : base;
};

/**
 * Cherche dans un index la meilleure correspondance d'un nom fournisseur.
 * @param {string} target - nom à matcher
 * @param {string[]} candidates - noms candidats (déjà normalisés)
 * @returns {{match: string|null, score: number}}
 */
export function fuzzyMatchSupplier(target, candidates) {
  const t = normSupName(target);
  if (!t) return { match: null, score: 0 };
  let best = null, bestScore = 0;
  for (const c of candidates) {
    let score = 0;
    if (c === t) score = 1;
    else if (c.includes(t) || t.includes(c)) {
      score = Math.min(c.length, t.length) / Math.max(c.length, t.length);
    } else {
      // Jaccard sur tokens
      const tt = new Set(t.split(' '));
      const cc = new Set(c.split(' '));
      const inter = [...tt].filter(x => cc.has(x)).length;
      const union = new Set([...tt, ...cc]).size;
      score = union > 0 ? inter / union : 0;
    }
    if (score > bestScore) { bestScore = score; best = c; }
  }
  return { match: bestScore >= 0.5 ? best : null, score: bestScore };
}

export async function readXlsxHandle(fileHandle) {
  const file = await fileHandle.getFile();
  const buf = await file.arrayBuffer();
  return XLSX.read(buf, { type: 'array' });
}

const normPath = s => {
  let r = s
    // Fix UTF-8 mojibake (UTF-8 bytes read as Latin-1) BEFORE lowercasing
    .replace(/Ã©/g, 'e').replace(/Ã¨/g, 'e').replace(/Ã /g, 'a').replace(/Ã®/g, 'i')
    .replace(/Ã´/g, 'o').replace(/Ã¹/g, 'u').replace(/Ã§/g, 'c').replace(/Ã«/g, 'e')
    .replace(/Ã¢/g, 'a').replace(/Ã¯/g, 'i').replace(/Ã¼/g, 'u').replace(/Ã»/g, 'u')
    .toLowerCase();
  // Fix lowercase mojibake too (ã© → e, ã¨ → e, etc.)
  r = r.replace(/ã©/g, 'e').replace(/ã¨/g, 'e').replace(/ã¢/g, 'a').replace(/ã®/g, 'i')
    .replace(/ã´/g, 'o').replace(/ã¹/g, 'u').replace(/ã§/g, 'c').replace(/ã«/g, 'e')
    .replace(/ã¯/g, 'i').replace(/ã¼/g, 'u').replace(/ã»/g, 'u').replace(/ã /g, 'a');
  // Strip remaining non-ASCII sequences and normalize quotes/special chars
  r = r.replace(/[+]?[âãäåæ][\x80-\xbf]?/g, '').replace(/Â®/gi, '').replace(/â/g, '');
  r = r.replace(/[\u2018\u2019\u201C\u201D\u0060\u00B4']/g, ' '); // quotes → space (pour matching)
  r = r.replace(/\u2026/g, '...'); // ellipsis
  r = r.replace(/[\u2013\u2014]/g, '-'); // en/em dash
  r = r.replace(/[\/]/g, ' '); // slash → space
  return r.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[_\-]/g, ' ').replace(/\s+/g, ' ').trim();
};

// ─── Détection documents ──────────────────────────────────────────────────────

const DOC_RULES = {
  'QT (Annexe 1)': {
    ext: ['.xls', '.xlsx'],
    any: ['annexe 1', 'annexe1', 'qt lot', 'qt_lot', 'questionnaire technique',
          'questionnaire tech', 'cctp annexe', 'qt-lot', ' qt '],
    exclude: ['annexe 3', 'annexe3', 'annexe 5', 'annexe5', 'bpu', 'chiffrage', 'rse',
              'bordereau', 'standardis'],
  },
  'BPU (Annexe 5)': {
    ext: ['.xls', '.xlsx'],
    any: ['annexe 5', 'annexe5', 'bpu', 'bordereau de prix', 'bordereau prix',
          'bordereau unitaire', 'tarifs', 'grille tarifaire', 'grille de prix'],
    exclude: ['annexe 3', 'annexe3', 'chiffrage', 'standardis'],
  },
  'Optim. Tarifaire': {
    ext: ['.xls', '.xlsx'],
    any: ['optim', 'optimisation tarifaire', 'remise', 'tarif optim', 'grille remise'],
    exclude: ['standardis'],
  },
  'BPU Chiffrage': {
    ext: ['.xls', '.xlsx'],
    any: ['annexe 3', 'annexe3', 'chiffrage', 'chiffre', 'estimation', 'valorisation',
          'bordereau chiffrage', 'devis'],
    exclude: ['annexe 5', 'annexe5', 'bpu', 'standardis'],
  },
  'Questionnaire RSE': {
    ext: ['.xls', '.xlsx', '.pdf', '.doc', '.docx'],
    any: ['rse', 'developpement durable', 'questionnaire rse', 'responsabilite sociale',
          'responsabilite environnementale', 'dd ', 'environnement', 'annexe rse',
          'annexe 8', 'questionnaire developpement durable'],
    exclude: ['standardis'],
  },
  'CCAP signé': {
    ext: ['.pdf', '.p7m'],
    any: ['ccap', 'clauses administratives particulieres', 'clauses admin',
          'cahier des clauses admin', 'conditions administratives'],
    exclude: ['bpu', 'bordereau', 'annexe 5', 'annexe5', 'cctp'],
  },
  'CCTP signé': {
    ext: ['.pdf', '.p7m'],
    any: ['cctp', 'clauses techniques particulieres', 'clauses tech',
          'cahier technique', 'specifications techniques'],
    exclude: ['annexe 1', 'annexe1', 'qt', 'bpu', 'bordereau', 'ccap'],
  },
  'DC1': {
    ext: ['.pdf', '.p7m', '.doc', '.docx', '.xlsx'],
    any: ['dc1', 'lettre de candidature', 'lettre candidature',
          'habilitation mandataire', 'declaration candidature', 'formulaire dc1',
          'candidature lettre', 'pouvoir mandataire'],
    exclude: ['dc2'],
  },
  'DC2': {
    ext: ['.pdf', '.p7m', '.doc', '.docx', '.xlsx'],
    any: ['dc2', 'declaration du candidat', 'declaration candidat',
          'renseignements du candidat', 'renseignements candidat',
          'renseignements entreprise', 'formulaire dc2', 'capacites candidat'],
    exclude: ['dc1'],
  },
  'ATTRI1 / Acte Engagement': {
    ext: null,
    any: ['attri1', 'attri', 'acte engagement', 'acte d engagement',
          'acte dengagement', 'accord-cadre', 'accord cadre'],
    regexAny: [/(?:^|[\s_\-\/\\])ae(?:[\s_\-\.\/\\]|$)/],
    exclude: [],
  },
  'Fiche Contacts': {
    ext: null,
    any: ['contact', 'coordonnee', 'coordonnees', 'annexe 4', 'interlocuteur',
          'fiche contact', 'referent', 'correspondant', 'equipe', 'responsable marche'],
    exclude: [],
  },
  'DUME': {
    ext: null,
    any: ['dume', 'document unique marche europeen', 'document unique de marche',
          'document_unique', '2_document_unique', 'formulaire europeen'],
    exclude: [],
  },
  'KBIS': {
    ext: null,
    any: ['kbis', 'k-bis', 'extrait kbis', 'registre commerce', 'registre du commerce',
          'extrait du registre', 'extrait registre', '13_kbis'],
    exclude: [],
  },
  'RIB': {
    ext: null,
    any: ['rib', 'iban', 'releve identite bancaire', 'coordonnees bancaires'],
    exclude: [],
  },
  'Attestation assurance': {
    ext: null,
    any: ['attestation assurance', 'police assurance', 'responsabilite civile',
          '12_attestation', 'attestation assurance'],
    exclude: [],
  },
  'Attestation fiscale': {
    ext: null,
    any: ['attestation fiscale', 'regularite fiscale', 'attestation impots', 'liasse fiscale'],
    exclude: [],
  },
  'Attestation sociale': {
    ext: null,
    any: ['attestation sociale', 'declarations sociales', 'urssaf', 'cotisations sociales',
          'social declaration', '7_attestation'],
    exclude: ['materiovigilance', 'vigilance'],
  },
  'Engagement confidentialité': {
    ext: null,
    any: ['confidentialite', 'engagement de confidentialite', 'clause confidentialite', 'nda'],
    exclude: [],
  },
  'Marquage CE': {
    ext: null,
    any: ['marquage ce', 'certificat ce', 'certification ce', 'declaration conformite',
          'ec certificate', 'ce certificate', '8_marquage', 'certificate mdd',
          'certificate ec', 'certificato'],
    exclude: [],
  },
  'Certifications ISO': {
    ext: null,
    any: ['iso 9001', 'iso 13485', 'iso 14001', 'certification iso', 'certificat iso'],
    exclude: [],
  },
  'Mémoire technique': {
    ext: null,
    any: ['memoire technique', 'fiche technique', 'notice technique', 'dossier technique',
          'documentation technique', 'brochure', '2_documentation', 'manuel', 'user manual',
          'service manual', 'technical file', 'proposition organisationnelle',
          'proposition technique', 'offre technique', 'dossier organisationnel',
          'organisationnel et technique'],
    exclude: ['questionnaire'],
  },
  'Contrat maintenance': {
    ext: null,
    any: ['contrat maintenance', 'contrat type', 'maintenance type', 'contrat de maintenance',
          'preventive maintenance', 'corrective maintenance', 'maintenance plan',
          'descriptif de lorganisation de la maintenance', '4_maintenance'],
    exclude: [],
  },
  'Rétroplanning': {
    ext: null,
    any: ['retroplanning', 'planning', 'retro planning', 'calendrier previsionnel'],
    exclude: [],
  },
  'Partenariat': {
    ext: null,
    any: ['partenariat', 'fiche partenariat', 'partenariat scientifique', 'sous traitant',
          'cotraitant'],
    exclude: [],
  },
  'Brochures commerciales': {
    ext: null,
    any: ['brochure', 'commercial', 'plaquette', 'catalogue', 'documentation commerciale'],
    exclude: [],
  },
  'Certificats de visites': {
    ext: null,
    any: ['certificat visite', '3_certificat', 'certificats visites sur site'],
    exclude: ['formulaire visite', 'annexe 3 rc'],
  },
  'Documentation politique RSE': {
    ext: null,
    any: ['politique rse', 'documentation rse', 'politique developpement durable',
          'charte rse', 'rapport rse', 'politique ehs', '5_responsabilite',
          'politique environnement', 'engagement rse', 'annexe 8',
          'developpement durable', 'durable et rse', 'ecovadis',
          'rapport impact', 'politique impact', 'charte rse'],
    exclude: [],
  },
  'Liste de références': {
    ext: null,
    any: ['reference client', 'references client', 'liste reference', 'liste des reference',
          '6_liste', '7_liste', 'references clcc', 'references of ', 'liste de reference'],
    exclude: [],
  },
  'Management qualité': {
    ext: null,
    any: ['management qualite', 'management de la qualite', '9_management',
          'systeme qualite', 'demarche qualite', 'politique qualite',
          'quality manual', 'quality policy', 'quality management'],
    exclude: [],
  },
  'Modules de formation': {
    ext: null,
    any: ['formation', 'module formation', 'descriptif formation', 'plan formation',
          '10_descriptif', 'programme formation', 'declaration formation',
          'traininggroups', 'training'],
    exclude: ['information'],
  },
  'Matériovigilance': {
    ext: null,
    any: ['materiovigilance', 'matériovigilance', 'vigilance materiel',
          '11_materio', 'pgq 12', 'post market survaillance', 'post market surveillance',
          'reclamation'],
    exclude: [],
  },
  'Cybersécurité': {
    ext: null,
    any: ['cybersecurite', 'cybersécurité', 'cyber securite', 'securite informatique',
          'conformite cyber', 'norme cyber', 'cyber security'],
    exclude: [],
  },
  'RC signé': {
    ext: null,
    any: ['reglement consultation', 'reglement de consultation', 'rgc', '11_rgc',
          'rc signe', 'rc date', 'reglement de la consultation'],
    exclude: ['ccap', 'cctp'],
  },
  'Complément CCAP': {
    ext: null,
    any: ['complement ccap', 'avenant ccap', 'ccap complement', 'modification ccap'],
    exclude: [],
  },
  'Délégation de pouvoir': {
    ext: null,
    any: ['delegation', 'delegation de pouvoir', 'pouvoir signature', 'mandat',
          'procuration', 'habilitation'],
    exclude: [],
  },
  'Critères économiques': {
    ext: null,
    any: ['critere economique', 'criteres economiques', 'ca annuel', 'chiffre affaire',
          'bilan financier', 'capacite economique', 'capacite financiere',
          'capacite eco fin', 'eco fin', 'consolidated turnover', 'chiffre d affaire',
          '03 capacite eco', '04 capacite tech'],
    exclude: [],
  },
};

/** Génère les règles de détection pour les lots dynamiquement */
function buildLotRules(lots) {
  const rules = {};
  for (const lot of lots) {
    const n = lot.num;
    const otherLots = lots.filter(l => l.num !== n);
    const excludeKw = otherLots.flatMap(l => [`lot ${l.num}`, `lot${l.num}`]);
    excludeKw.push('standardis');
    rules[`Lot ${n}`] = {
      ext: ['.xls', '.xlsx', '.pdf'],
      any: [`lot ${n}`, `lot${n}`, `lot_${n}`, `lot-${n}`],
      exclude: excludeKw,
    };
  }
  return rules;
}

export function detectDocs(files, lots = []) {
  const allRules = { ...DOC_RULES, ...buildLotRules(lots) };
  const entries = files.map(f => ({
    p: normPath(f.path),
    ext: (f.name.match(/\.[^.]+$/) || [''])[0].toLowerCase(),
  }));

  const result = {};
  for (const [label, rule] of Object.entries(allRules)) {
    const { ext: exts, any: anyKw, exclude: exclKw, regexAny } = rule;
    result[label] = entries.some(({ p, ext }) => {
      if (exts && !exts.includes(ext)) return false;
      if (exclKw.some(kw => p.includes(normPath(kw)))) return false;
      const kwMatch = anyKw.some(kw => p.includes(normPath(kw)));
      if (kwMatch) return true;
      // Support regex patterns (pour les mots courts comme "AE")
      if (regexAny && regexAny.some(rx => rx.test(p))) return true;
      return false;
    });
  }
  return result;
}

// ─── Export DOC_RULES pour le CQ ──────────────────────────────────────────────
export { DOC_RULES };

// ─── Import fichier de référence pour contrôle qualité ────────────────────────

/**
 * Parse un fichier Excel de suivi des pièces justificatives (format Unicancer).
 * Structure attendue : row 4 = lots, row 5 = fournisseurs, row 6+ = pièces.
 *
 * @param {Workbook} wb - workbook XLSX
 * @returns {{ refData: { [supplier]: { [piece]: string } }, columns }}
 */
export function parseReferenceFile(wb) {
  const refData = {};
  const pieceLabels = [];
  const columns = [];

  // Détection automatique du format :
  // Format A (accélérateurs) : fournisseurs EN COLONNES, pièces en lignes (row 4=lots, row 5=fournisseurs)
  // Format B (cybersécurité) : fournisseurs EN LIGNES, documents en colonnes (row 3=headers, row 4+=data)
  // Clé : si la première feuille a "Lot" dans les premières cellules, c'est format B (lots en colonnes)
  //        si la colonne A contient beaucoup de noms, c'est format B

  for (const sheetName of wb.SheetNames) {
    const sheet = wb.Sheets[sheetName];
    const raw = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
    if (!raw.length) continue;

    // Cherche la ligne d'en-tête : la ligne dont la PREMIÈRE CELLULE contient "Candidat" (pas juste "fournisseur" dans un titre)
    let headerIdx = -1;
    for (let r = 0; r < Math.min(raw.length, 10); r++) {
      const row = raw[r];
      if (!row) continue;
      const firstCell = String(row[0] || '').trim().toLowerCase();
      // La première cellule doit être exactement "Candidats" ou "Fournisseurs" (pas un titre long)
      if (/^candidats?$/i.test(firstCell) || /^fournisseurs?$/i.test(firstCell)) {
        headerIdx = r; break;
      }
      // Ou une ligne avec beaucoup de headers courts (pas un titre descriptif)
      const nonEmpty = row.filter(v => String(v || '').trim()).length;
      if (nonEmpty >= 4 && firstCell.length < 30 && row.some(v => /attestation|document|bpu|ccap|fiche/i.test(String(v || '')))) {
        headerIdx = r; break;
      }
    }

    if (headerIdx === -1) {
      // Format A : fournisseurs en colonnes (ancien format accélérateurs)
      let lotsRowIdx = -1;
      for (let r = 0; r < Math.min(raw.length, 10); r++) {
        if (raw[r].some(v => /lot\s*\d/i.test(String(v)))) { lotsRowIdx = r; break; }
      }
      if (lotsRowIdx === -1) lotsRowIdx = 4;
      const suppRowIdx = lotsRowIdx + 1;
      const lotsRow = raw[lotsRowIdx] || [];
      const suppRow = raw[suppRowIdx] || [];

      let currentLot = '';
      for (let c = 1; c < suppRow.length; c++) {
        if (lotsRow[c]) currentLot = String(lotsRow[c]);
        const sup = String(suppRow[c] || '').trim();
        if (!sup) continue;
        const lotMatch = currentLot.match(/lot\s*(\d+)/i);
        columns.push({ col: c, lotNum: lotMatch ? parseInt(lotMatch[1]) : 0, supplier: sup });
      }
      for (let r = suppRowIdx + 1; r < raw.length; r++) {
        const label = String(raw[r][0] || '').trim();
        if (!label) continue;
        if (!pieceLabels.includes(label)) pieceLabels.push(label);
        for (const col of columns) {
          const key = normSupName(col.supplier);
          if (!refData[key]) refData[key] = { _supplier: col.supplier };
          refData[key][label] = String(raw[r][col.col] || '').trim();
        }
      }
      continue;
    }

    // Format B : fournisseurs en lignes, documents/lots en colonnes
    const headers = raw[headerIdx];
    const colHeaders = [];
    for (let c = 1; c < headers.length; c++) {
      const h = String(headers[c] || '').trim();
      if (h) colHeaders.push({ col: c, label: h });
    }

    for (let r = headerIdx + 1; r < raw.length; r++) {
      const row = raw[r];
      const sup = String(row[0] || '').trim();
      if (!sup) continue;
      const key = normSupName(sup);
      if (!refData[key]) refData[key] = { _supplier: sup };

      for (const { col, label } of colHeaders) {
        const val = String(row[col] || '').trim();
        if (val) {
          refData[key][label] = val;
          if (!pieceLabels.includes(label)) pieceLabels.push(label);
        }
      }
    }
  }

  return { refData, columns, pieceLabels };
}

/**
 * Compare les résultats de l'annuaire avec le fichier de référence.
 * Retourne les divergences par fournisseur.
 *
 * @param {object[]} annuaireRows - rows de scanAnnuaire
 * @param {object} refData - de parseReferenceFile
 * @param {string[]} docLabels - labels utilisés dans l'annuaire
 * @returns {{ accuracy, matches, mismatches, details[] }}
 */
export function compareAnnuaireWithRef(annuaireRows, refData, docLabels) {
  let matches = 0, mismatches = 0;
  const details = [];

  // ── Mapping explicite scan → référence ──
  // Clé = label annuaire (scan), Valeur = liste de labels référence acceptés
  const SCAN_TO_REF = {
    'QT (Annexe 1)':                ['Questionnaire Technique'],
    'QT':                           ['Questionnaire Technique'],
    'BPU (Annexe 5)':               ['BPU mono (excel) Base', 'BPU multi (excel) Base', 'BPU mono (PDF) Base', 'BPU multi (PDF) Base'],
    'BPU':                          ['BPU mono (excel) Base', 'BPU multi (excel) Base', 'BPU mono (PDF) Base', 'BPU multi (PDF) Base', 'BPU signé', 'BPU Excel', 'BPU signe'],
    'Optim. Tarifaire':             [],
    'BPU Chiffrage':                [],
    'Questionnaire RSE':            ['Questionnaire RSE', 'Annexe 8 DD'],
    'Documentation politique RSE':  ['Documentation politique RSE', 'Annexe 8 DD'],
    'CCAP signé':                   ['CCAP daté et signé', 'Complément CCAP daté et signé', 'CCAP signé'],
    'CCTP signé':                   ['CCTP daté et signé', 'CCTP signé'],
    'DC1':                          ['DUME (ou DC1/DC2/DC4)'],
    'DC2':                          ['DUME (ou DC1/DC2/DC4)'],
    'DUME':                         ['DUME (ou DC1/DC2/DC4)'],
    'ATTRI1 / Acte Engagement':     ['Acte d\'engagement base', 'Acte d\'engagement'],
    'Fiche Contacts':               ['Fiche contacts', 'Annexe 4 Fiche contacts', 'Annexe 4'],
    'KBIS':                         ['KBIS', 'Extrait KBIS', 'Extrait KBis'],
    'RIB':                          ['RIB'],
    'Attestation assurance':        ['Attestation assurance', 'Attestation RC PRO', 'Attestation d assurance'],
    'Attestation fiscale':          ['Attestation de régularité fiscale', 'Attestation fiscale', 'regularite fiscale'],
    'Attestation sociale':          ['Attestation déclarations sociales', 'Attestation URSSAF', 'URSSAF'],
    'Engagement confidentialité':   ['Engagement de confidentialité', 'Annexe 10 Engagement de confidentialité', 'Engagement de confidentialite'],
    'Marquage CE':                  ['Marquage CE base (MDR)'],
    'Certifications ISO':           ['Certifications ISO'],
    'Mémoire technique':            ['Fiches ou Mémoires techniques', 'Mémoire technique'],
    'Contrat maintenance':          ['Contrats de maintenance type'],
    'Rétroplanning':                ['Rétroplanning'],
    'Partenariat':                  ['Fiche partenariat'],
    'Brochures commerciales':       ['Brochures commerciales'],
    'Certificats de visites':       ['Certificats de visites'],
    'Liste de références':          ['Liste de références clients'],
    'Management qualité':           ['Descriptif du management de la qualité'],
    'Modules de formation':         ['Descriptif des modules de formation'],
    'Matériovigilance':             ['Procédure de Matériovigilance'],
    'Cybersécurité':                ['Documentation de conformité Cybersécurité'],
    'RC signé':                     ['RC daté et signé', 'RGC signé', 'RGC signe'],
    'Complément CCAP':              ['Complément CCAP daté et signé'],
    'Délégation de pouvoir':        ['Délégation de pouvoir de signature'],
    'Critères économiques':         ['Critères économiques'],
  };

  // Pour DC1/DC2 → DUME : un seul match suffit (évite les doublons)
  const dumeMatchedPerSup = new Set();

  for (const row of annuaireRows) {
    const supName = row['Nom fournisseur'];
    const supNorm = normSupName(supName);

    // Find matching ref entry (fuzzy)
    const refKey = Object.keys(refData).find(rk => {
      if (rk.startsWith('_')) return false;
      return rk === supNorm || rk.includes(supNorm) || supNorm.includes(rk) ||
        rk.split(' ').filter(w => w.length > 2).some(w => supNorm.includes(w));
    });
    if (!refKey) continue;

    const ref = refData[refKey];

    for (const label of docLabels) {
      const scanVal = row[label];
      if (scanVal === undefined) continue;
      const scanPresent = scanVal === 'x' || (scanVal && scanVal !== 'non fourni' && scanVal !== '—' && scanVal !== 'vide');

      // Utilise le mapping explicite d'abord
      const mappedRefLabels = SCAN_TO_REF[label];
      if (mappedRefLabels !== undefined) {
        if (mappedRefLabels.length === 0) continue; // pas de correspondance dans la réf

        // Pour DUME : DC1 et DC2 pointent vers le même champ ref, ne compter qu'une fois
        const isDumeField = mappedRefLabels.includes('DUME (ou DC1/DC2/DC4)');
        if (isDumeField) {
          const dumeKey = supNorm + '|DUME';
          if (dumeMatchedPerSup.has(dumeKey)) continue;
          dumeMatchedPerSup.add(dumeKey);
          // Pour DUME, on vérifie DC1 OR DC2 OR DUME dans le scan
          const dc1 = row['DC1'], dc2 = row['DC2'], dume = row['DUME'];
          const anyPresent = [dc1, dc2, dume].some(v =>
            v === 'x' || (v && v !== 'non fourni' && v !== '—' && v !== 'vide'));
          const refEntry = Object.entries(ref).find(([k]) =>
            mappedRefLabels.some(ml => normPath(k).includes(normPath(ml)))
          );
          if (!refEntry) continue;
          const refVal = String(refEntry[1]).toLowerCase().trim();
          const refPresent = refVal === 'x' || refVal.startsWith('oui');
          const refAbsent = refVal === 'non';
          if (!refPresent && !refAbsent) continue;
          if (anyPresent === refPresent) { matches++; }
          else {
            mismatches++;
            // Diagnostic DUME
            const dumeRule = DOC_RULES['DUME'] || {};
            const dc1Rule = DOC_RULES['DC1'] || {};
            const dc2Rule = DOC_RULES['DC2'] || {};
            const allKw = [...(dumeRule.any || []), ...(dc1Rule.any || []), ...(dc2Rule.any || [])];
            details.push({
              supplier: supName, piece: 'DC1/DC2/DUME', refPiece: refEntry[0],
              scanValue: anyPresent ? 'x' : 'non fourni', refValue: refEntry[1],
              type: anyPresent ? 'Faux positif' : 'Non détecté',
              diag: {
                rule: 'DOC_RULES[DUME] + DOC_RULES[DC1] + DOC_RULES[DC2]',
                keywords: allKw.join(', '),
                scanCols: `DC1=${dc1||''}, DC2=${dc2||''}, DUME=${dume||''}`,
                mapping: 'DC1/DC2/DUME → ' + mappedRefLabels.join(' | '),
                hint: anyPresent
                  ? 'Le scan détecte un fichier mais la réf dit Non — vérifier si le fichier est vraiment un DUME/DC1/DC2'
                  : 'Aucun fichier matché par les keywords — vérifier le nom des fichiers du fournisseur (noms cryptés ? sous-dossiers non scannés ?)',
              },
            });
          }
          continue;
        }

        // Match normal avec mapping explicite
        // Quand plusieurs colonnes réf matchent (ex: BPU mono + multi),
        // on considère le document présent si AU MOINS UNE colonne réf = Oui
        const refEntries = Object.entries(ref).filter(([k]) => {
          if (k.startsWith('_')) return false;
          // Exclure les champs groupés (contenant ";") pour éviter les faux matchs
          if (k.includes(';')) return false;
          return mappedRefLabels.some(ml => normPath(k).includes(normPath(ml)));
        });
        if (!refEntries.length) continue;
        const isPresent = v => { const s = String(v).toLowerCase().trim(); return s === 'x' || s.startsWith('oui'); };
        const anyRefOui = refEntries.some(([, v]) => isPresent(v));
        const anyRefNon = refEntries.some(([, v]) => String(v).toLowerCase().trim() === 'non');
        const refPresent = anyRefOui;
        if (!anyRefOui && !anyRefNon) continue;
        const refEntry = refEntries.find(([, v]) => isPresent(v)) || refEntries[0];

        if (scanPresent === refPresent) { matches++; }
        else {
          mismatches++;
          // Diagnostic pour chaque divergence — cherche la règle par nom exact ou partiel
          const docRule = DOC_RULES[label]
            || Object.entries(DOC_RULES).find(([k]) => k.startsWith(label) || label.startsWith(k))?.[1]
            || {};
          details.push({
            supplier: supName, piece: label, refPiece: refEntry[0],
            scanValue: scanVal, refValue: refEntry[1],
            type: scanPresent ? 'Faux positif' : 'Non détecté',
            diag: {
              rule: `DOC_RULES['${label}']`,
              keywords: (docRule.any || []).join(', '),
              extensions: docRule.ext ? docRule.ext.join(', ') : 'toutes',
              excludeKw: (docRule.exclude || []).join(', ') || 'aucun',
              mapping: label + ' → ' + mappedRefLabels.join(' | '),
              refAllCols: refEntries.map(([k, v]) => `${k}=${v}`).join('; '),
              hint: scanPresent
                ? 'Le scan trouve un fichier correspondant aux keywords mais la réf dit Non — faux positif possible si le keyword est trop large'
                : 'Aucun fichier ne matche les keywords — vérifier : (1) le fichier existe ? (2) son nom contient-il un keyword ? (3) est-il dans un sous-dossier exclu ?',
            },
          });
        }
        continue;
      }

      // Fallback : fuzzy matching pour les colonnes sans mapping explicite
      // EXCLURE les colonnes dynamiques (Lot N, AE Lot N, Lots positionnés) du fuzzy
      if (/^(Lot \d|AE Lot \d|Lots positionnés)/i.test(label)) continue;

      // Cherche dans la réf une colonne dont le label contient les mêmes mots significatifs
      const normLabel = normPath(label);
      const labelWords = normLabel.split(' ').filter(w => w.length > 2);
      if (labelWords.length === 0) continue;

      const refEntry = Object.entries(ref).find(([k]) => {
        if (k.startsWith('_')) return false;
        // Exclure les colonnes lot de la réf du fuzzy
        if (/^lot\s*\d/i.test(k)) return false;
        const nk = normPath(k);
        // Match exact ou inclusion
        if (nk === normLabel || nk.includes(normLabel) || normLabel.includes(nk)) return true;
        // Match par mots significatifs (au moins 60% des mots communs)
        const refWords = nk.split(' ').filter(w => w.length > 2);
        const common = labelWords.filter(w => refWords.some(rw => rw.includes(w) || w.includes(rw)));
        return common.length >= Math.ceil(labelWords.length * 0.6);
      });

      if (!refEntry) continue;
      const refVal = String(refEntry[1]).toLowerCase();
      const refPresent = refVal === 'x' || refVal.startsWith('oui');
      const refAbsent = refVal === 'non' || refVal === '';
      if (!refPresent && !refAbsent) continue;

      if (scanPresent === refPresent) { matches++; }
      else {
        mismatches++;
        const docRule = DOC_RULES[label]
          || Object.entries(DOC_RULES).find(([k]) => k.startsWith(label) || label.startsWith(k))?.[1]
          || {};
        details.push({
          supplier: supName, piece: label, refPiece: refEntry[0],
          scanValue: scanVal, refValue: refEntry[1],
          type: scanPresent ? 'Faux positif' : 'Non détecté',
          diag: {
            rule: `DOC_RULES['${label}'] (fuzzy)`,
            keywords: (docRule.any || []).join(', '),
            extensions: docRule.ext ? docRule.ext.join(', ') : 'toutes',
            excludeKw: (docRule.exclude || []).join(', ') || 'aucun',
            mapping: label + ' ≈ ' + refEntry[0] + ' (fuzzy)',
            refAllCols: `${refEntry[0]}=${refEntry[1]}`,
            hint: scanPresent
              ? 'Le scan trouve un fichier mais la réf dit Non (matching fuzzy)'
              : 'Aucun fichier matché — le mapping est approximatif, vérifier manuellement',
          },
        });
      }
    }
  }

  const total = matches + mismatches;
  return {
    matches, mismatches, total,
    accuracy: total > 0 ? Math.round(matches / total * 100) : 0,
    details,
  };
}

// ─── Scan annuaire ────────────────────────────────────────────────────────────

/**
 * Scanne un dossier AO et construit l'annuaire des fournisseurs.
 * @param {FileSystemDirectoryHandle} rootHandle
 * @param {object} config - analyseConfig du marché
 * @param {function} onProgress - callback (message)
 * @returns {Promise<{ rows: object[], warning: string }>}
 */
export async function scanAnnuaire(rootHandle, config, onProgress = () => {}) {
  // ── Auto-descente : détecte les dossiers intermédiaires (wrappers) ──
  // Un wrapper = un dossier qui ne contient QUE des sous-dossiers (pas de fichiers
  // exploitables) ET dont les sous-dossiers eux-mêmes ne contiennent que des sous-dossiers
  // (pas le profil d'un fournisseur qui aurait des fichiers dedans).
  // Un fournisseur unique = un dossier qui contient des fichiers ou dont le sous-dossier
  // contient directement des fichiers → on ne descend PAS.
  let effectiveRoot = rootHandle;
  for (let depth = 0; depth < 3; depth++) {
    const entries = [];
    for await (const [name, handle] of effectiveRoot.entries()) {
      if (name.startsWith('.') || name.startsWith('~')) continue;
      entries.push({ name, handle, kind: handle.kind });
    }
    const dirs = entries.filter(e => e.kind === 'directory');
    const files = entries.filter(e => e.kind === 'file');

    // Si aucun sous-dossier → c'est le bon niveau
    if (dirs.length === 0) break;

    // Si plusieurs sous-dossiers → c'est le niveau fournisseurs, on reste
    if (dirs.length > 1) break;

    // Un seul sous-dossier → regarder ce qu'il contient pour décider
    const singleDir = dirs[0];
    let innerDirs = 0, innerFiles = 0;
    for await (const [innerName, innerHandle] of singleDir.handle.entries()) {
      if (innerName.startsWith('.') || innerName.startsWith('~')) continue;
      if (innerHandle.kind === 'directory') innerDirs++;
      else innerFiles++;
    }

    // Le sous-dossier contient PLUS d'éléments que le dossier actuel → c'est un wrapper
    // Ex: racine a 1 dossier + 1 fichier xlsx, mais le sous-dossier a 33 dossiers fournisseurs
    if (innerDirs > 1) {
      onProgress(`Descente dans ${singleDir.name}/...`);
      effectiveRoot = singleDir.handle;
    } else if (innerDirs === 0 && innerFiles > 0) {
      // Le sous-dossier unique ne contient que des fichiers → fournisseur unique → rester
      break;
    } else if (innerDirs === 1 && innerFiles > 0) {
      // 1 sous-dossier + fichiers → ambigu, on reste (fournisseur avec sous-dossier)
      break;
    } else {
      // innerDirs <= 1 et innerFiles === 0 → descendre quand même
      onProgress(`Descente dans ${singleDir.name}/...`);
      effectiveRoot = singleDir.handle;
    }
  }
  rootHandle = effectiveRoot;

  let { lots = [], docLabels = [], bpuReq = {} } = config;
  // Lots / labels auto-détectés si absents du config (mode default)
  const autoLots = new Set();
  const autoMode = lots.length === 0;
  const val = b => b ? 'x' : '';

  const supInfo = {};
  const ensure = (norm, display) => {
    if (!supInfo[norm]) supInfo[norm] = {
      displayName: display, lots: new Set(),
      hasQT: false, hasBpu: false, hasOptim: false, hasRse: false, hasChiffrage: false,
      bpuMissing: {},
    };
  };

  let warning = '';

  // ── Helpers de traitement réutilisables (std + per-supplier) ──
  const isNum = v => {
    if (v == null || v === '') return false;
    if (typeof v === 'number') return Number.isFinite(v);
    const s = String(v).replace(/\s/g, '').replace(',', '.').replace(/[€%]/g, '');
    return !Number.isNaN(parseFloat(s)) && Number.isFinite(parseFloat(s));
  };
  function processBpuWb(wb, n) {
    ensure(n, n);
    supInfo[n].hasBpu = true;
    if (!supInfo[n].lotStatus) supInfo[n].lotStatus = {};
    for (const s of wb.SheetNames) {
      if (/optim/i.test(s)) {
        const rawSheet = XLSX.utils.sheet_to_json(wb.Sheets[s], { header: 1, defval: '' });
        const hasContent = rawSheet.slice(1).some(r => r.slice(1).some(v => isRealVal(v)));
        supInfo[n].hasOptim = true;
        supInfo[n].optimFilled = hasContent;
        continue;
      }
      let lotNum = 0;
      const autoMatch = s.match(/lot\s*(\d+)/i);
      if (autoMode && autoMatch) {
        lotNum = parseInt(autoMatch[1], 10);
        autoLots.add(lotNum);
      } else {
        for (const lot of lots) {
          if (new RegExp(`lot\\s*${lot.num}`, 'i').test(s)) { lotNum = lot.num; break; }
        }
      }
      if (!lotNum) continue;
      const rawSheet = XLSX.utils.sheet_to_json(wb.Sheets[s], { header: 1, defval: '' });
      // Garde toutes les lignes qui ont au moins une cellule non vide (pas juste colonne A,
      // car les cellules fusionnées laissent la colonne A vide pour les sous-lignes)
      const dataRows = rawSheet.slice(1).filter(r =>
        r.some(v => String(v || '').trim() !== '')
      );
      const reqCols = bpuReq[lotNum] || [];
      // Détecte les colonnes "template" pré-remplies (ex: TVA 20%)
      // On identifie la ligne d'en-tête pour repérer les colonnes TVA
      const headerRow = rawSheet.find(r => r.some(v => /tva/i.test(String(v || ''))));
      const templateCols = new Set();
      if (headerRow) {
        for (let c = 0; c < headerRow.length; c++) {
          if (/tva/i.test(String(headerRow[c] || ''))) templateCols.add(c);
        }
      }
      const totalLines = dataRows.length;
      let filledLines = 0;
      const missing = [];
      for (const { col, name: colName } of reqCols) {
        const filled = dataRows.filter(r => isRealVal(r[col])).length;
        if (filled === 0) missing.push(colName);
      }
      for (const r of dataRows) {
        const isFilled = reqCols.length
          ? reqCols.some(({ col }) => isRealVal(r[col]))
          : r.slice(1).some((v, i) => !templateCols.has(i + 1) && isNum(v));
        if (isFilled) filledLines++;
      }
      let status;
      if (totalLines === 0 || filledLines === 0) status = 'vide';
      else if (filledLines < totalLines || missing.length > 0) status = 'partiel';
      else status = 'rempli';
      supInfo[n].lotStatus[lotNum] = { status, filledLines, totalLines, missing };
      if (status !== 'vide') supInfo[n].lots.add(lotNum);
      if (missing.length) supInfo[n].bpuMissing[lotNum] = missing;
    }
  }

  const stdHandle = await findStdDir(rootHandle);
  if (stdHandle) {
    // QT
    onProgress('Lecture QT standardisés…');
    const qtDir = await findSubdirByName(stdHandle, 'QT') ?? stdHandle;
    for await (const [name, handle] of qtDir.entries()) {
      if (handle.kind !== 'file' || !/\.xlsx$/i.test(name) || name.startsWith('~')) continue;
      if (!/_qt_standardis/i.test(name)) continue;
      const display = name.replace(/_QT_standardis[eé]\.xlsx$/i, '').trim();
      const n = normSupName(display);
      ensure(n, display);
      try {
        const wb = await readXlsxHandle(handle);
        wb.SheetNames.forEach(s => {
          for (const lot of lots) {
            if (new RegExp(`lot\\s*${lot.num}`, 'i').test(s)) supInfo[n].lots.add(lot.num);
          }
        });
        supInfo[n].hasQT = true;
      } catch {}
    }

    // BPU — on délègue à processBpuWb (réutilisé en mode fallback)
    onProgress('Lecture BPU standardisés…');
    const bpuDir = await findSubdirByName(stdHandle, 'BPU');
    if (bpuDir) {
      for await (const [name, handle] of bpuDir.entries()) {
        if (handle.kind !== 'file' || !/\.xlsx$/i.test(name) || name.startsWith('~')) continue;
        const display = name.replace(/_BPU_standardis[eé]\.xlsx$/i, '').trim();
        const n = normSupName(display);
        ensure(n, display);
        try { processBpuWb(await readXlsxHandle(handle), n); } catch {}
      }
    }

    // RSE
    onProgress('Lecture RSE standardisés…');
    const rseDir = await findSubdirByName(stdHandle, 'RSE');
    if (rseDir) {
      for await (const [name, handle] of rseDir.entries()) {
        if (handle.kind !== 'file' || !/\.xlsx$/i.test(name) || name.startsWith('~')) continue;
        const display = name.replace(/_RSE_standardis[eé]\.xlsx$/i, '').trim();
        const n = normSupName(display);
        ensure(n, display);
        supInfo[n].hasRse = true;
      }
    }

    // Chiffrage
    onProgress('Lecture Chiffrage standardisés…');
    const chifDir = await findSubdirByName(stdHandle, 'Chiffrage');
    if (chifDir) {
      for await (const [name, handle] of chifDir.entries()) {
        if (handle.kind !== 'file' || !/\.xlsx$/i.test(name) || name.startsWith('~')) continue;
        const display = name.replace(/_Chiffrage_standardis[eé]\.xlsx$/i, '').trim();
        const n = normSupName(display);
        ensure(n, display);
        supInfo[n].hasChiffrage = true;
      }
    }
  }

  // ── Fallback : scan récursif et classification par nom de fichier ──
  // Couvre les structures DCE brutes (Reponses AO/Fournisseur/.../BPU Lot 1.xls)
  // ou dossier de templates au root.
  onProgress('Scan dossiers fournisseur…');
  const SKIP_FALLBACK = new Set(['standardises', 'compilation', '__pycache__',
    'consignes', 'instructions', 'template', 'modele', 'modeles']);

  function classifyAndProcess(file, supplierName) {
    const lower = file.name.toLowerCase();
    if (/standardis/i.test(lower)) return; // déjà traité
    const isBpu = /bpu|annexe.?5|bordereau|prix|tarif/i.test(lower) && !/chiffrage|mission.type/i.test(lower);
    const isChiffrage = /chiffrage|annexe.?3|mission.type|simulation/i.test(lower);
    const isRse = /rse|durable|environn|developpement.durable/i.test(lower);
    const isQt = /(?:^|[\s_\-])qt(?:[\s_\-.]|$)|questionnaire.?tech|questionnaire.?technique|annexe.?1/i.test(lower)
      || (/questionnaire/i.test(lower) && !isRse);
    if (!isBpu && !isChiffrage && !isQt && !isRse) return;
    return (async () => {
      const norm = normSupName(supplierName);
      ensure(norm, supplierName);
      try {
        const wb = await readXlsxHandle(file.handle);
        if (isBpu && !supInfo[norm].hasBpu) processBpuWb(wb, norm);
        // Complément : si le nom du fichier BPU contient un lot mais que processBpuWb
        // n'a rien trouvé (feuilles sans "Lot N"), on déduit du nom de fichier
        if (isBpu && supInfo[norm].lots.size === 0) {
          const fileNameLots = [...lower.matchAll(/lot\s*(\d+)/gi)];
          for (const m of fileNameLots) {
            const lotNum = parseInt(m[1], 10);
            if (autoMode) autoLots.add(lotNum);
            supInfo[norm].lots.add(lotNum);
          }
        }
        if (isChiffrage) supInfo[norm].hasChiffrage = true;
        if (isQt) supInfo[norm].hasQT = true;
        if (isRse) supInfo[norm].hasRse = true;
      } catch (e) {
        console.warn(`[classifyAndProcess] Erreur lecture ${file.name}:`, e);
        // Fallback BPU : si le fichier n'a pas pu être lu mais que le nom contient un lot,
        // on positionne quand même le fournisseur sur ce lot
        if (isBpu) {
          supInfo[norm].hasBpu = true;
          const lotMatches = lower.matchAll(/lot\s*(\d+)/gi);
          for (const m of lotMatches) {
            const lotNum = parseInt(m[1], 10);
            if (autoMode) autoLots.add(lotNum);
            supInfo[norm].lots.add(lotNum);
            if (!supInfo[norm].lotStatus) supInfo[norm].lotStatus = {};
            if (!supInfo[norm].lotStatus[lotNum]) {
              supInfo[norm].lotStatus[lotNum] = { status: 'x (nom fichier)', filledLines: 0, totalLines: 0, missing: [] };
            }
          }
        }
      }
    })();
  }

  // Cas 1 : sous-dossiers fournisseur (chacun = un fournisseur)
  // Si les sous-dossiers sont des lots (Lot1/, Lot2/…), on descend d'un niveau
  // pour trouver les vrais dossiers fournisseurs à l'intérieur de chaque lot.
  const rootSubdirs = await getSubdirs(rootHandle);
  const isLotDir = (name) => /^lot\s*\d+$/i.test(name.trim());
  const hasLotStructure = rootSubdirs.some(s => isLotDir(s.name));

  let supplierFolders = []; // { dirName, dirHandle }
  // Suivi ATTRI1/AE par lot et par fournisseur
  const attriByLot = {}; // { normSupName: { lotNum: boolean } }
  if (hasLotStructure) {
    for (const { name: lotName, handle: lotHandle } of rootSubdirs) {
      if (!isLotDir(lotName) && SKIP_FALLBACK.has(normSupName(lotName))) continue;
      if (isLotDir(lotName)) {
        const lotMatch = lotName.match(/lot\s*(\d+)/i);
        const lotNum = lotMatch ? parseInt(lotMatch[1], 10) : null;
        if (lotNum) autoLots.add(lotNum);
        const lotSubdirs = await getSubdirs(lotHandle);
        for (const { name, handle } of lotSubdirs) {
          if (SKIP_FALLBACK.has(normSupName(name))) continue;
          // Ignore les dossiers "mise au point" / "documents complémentaires"
          if (/mise au point/i.test(name)) continue;
          // Détecte les dossiers "complément" → rattache au fournisseur de base
          const compBase = extractComplementBase(name);
          const effectiveName = compBase || name;
          supplierFolders.push({ dirName: effectiveName, dirHandle: handle });
          // Positionnement par lot : le fournisseur est dans ce dossier de lot
          if (lotNum) {
            const sn = normSupName(effectiveName);
            const display = effectiveName.replace(/\s+(ok|OK|valid[eé])\s*$/i, '').trim();
            ensure(sn, display);
            supInfo[sn].lots.add(lotNum);
            // AE par lot : détection initiale dans le dossier lot (sera complétée plus tard)
            if (!attriByLot[sn]) attriByLot[sn] = {};
          }
        }
      } else {
        supplierFolders.push({ dirName: lotName, dirHandle: lotHandle });
      }
    }
    // Dédoublonne par nom de fournisseur (même fournisseur dans plusieurs lots)
    const seen = new Map();
    for (const sf of supplierFolders) {
      const key = normSupName(sf.dirName);
      if (!seen.has(key)) seen.set(key, []);
      seen.get(key).push(sf);
    }
    supplierFolders = [];
    for (const [, entries] of seen) supplierFolders.push(entries[0]);
  } else {
    supplierFolders = rootSubdirs
      .filter(s => !SKIP_FALLBACK.has(normSupName(s.name)))
      .map(s => {
        const compBase = extractComplementBase(s.name);
        return { dirName: compBase || s.name, dirHandle: s.handle };
      });
  }

  let processedAny = false;
  for (const { dirName, dirHandle } of supplierFolders) {
    const norm = normSupName(dirName);
    if (SKIP_FALLBACK.has(norm)) continue;
    const files = await getAllFiles(dirHandle);
    const xlsFiles = files.filter(f => /\.xlsx?$/i.test(f.name) && !f.name.startsWith('~'));
    if (!xlsFiles.length) continue;
    // Display name : retire suffixes "ok", "OK", trailing punctuation
    const display = dirName.replace(/\s+(ok|OK|valid[eé])\s*$/i, '').trim();
    for (const f of xlsFiles) await classifyAndProcess(f, display);
    processedAny = true;
  }

  // Cas 2 : pas de sous-dossier fournisseur exploitable → fichiers au root
  // (cas DCE templates), on les traite comme un fournisseur unique
  if (!processedAny && !stdHandle) {
    const rootFiles = [];
    for await (const [name, handle] of rootHandle.entries()) {
      if (handle.kind === 'file' && /\.xlsx?$/i.test(name) && !name.startsWith('~')) {
        rootFiles.push({ name, handle });
      }
    }
    for (const f of rootFiles) await classifyAndProcess(f, 'Templates AO');
  }

  if (!stdHandle && Object.keys(supInfo).length === 0) {
    warning = 'Aucun fichier xlsx/xls exploitable trouvé — vérifie la structure du dossier.';
  }

  // Scan PDF
  onProgress('Scan PDFs…');
  const SKIP_DIRS = new Set([
    'standardises', 'compilation', '__pycache__',
    'qt', 'bpu', 'rse', 'chiffrage',
    'ao', 'reponses', 'action a faire', 'actions a faire',
    'consignes', 'instructions', 'template', 'modele', 'modeles',
  ]);
  // Réutilise la même logique de détection lot/fournisseur que le scan principal
  // Accumule TOUS les dossiers par fournisseur (multi-lots)
  const subdirs2 = await getSubdirs(rootHandle);
  const folderMap = {};      // { normName: { name, handle } } — premier dossier pour le nom
  const folderMapAll = {};   // { normName: [{ name, handle }] } — tous les dossiers (multi-lots)
  if (hasLotStructure) {
    for (const { name: lotName, handle: lotHandle } of subdirs2) {
      if (isLotDir(lotName)) {
        const lotSubs = await getSubdirs(lotHandle);
        for (const { name, handle } of lotSubs) {
          // Ignore les dossiers "compléments" et "documents mise au point"
          if (/^compl[eéè]ment/i.test(name) || /mise au point/i.test(name)) continue;
          const n = normSupName(name);
          if (SKIP_DIRS.has(n)) continue;
          if (!folderMap[n]) folderMap[n] = { name, handle };
          if (!folderMapAll[n]) folderMapAll[n] = [];
          folderMapAll[n].push({ name, handle });
        }
      } else {
        if (/mise au point/i.test(lotName)) continue;
        const n = normSupName(lotName);
        if (!SKIP_DIRS.has(n)) {
          folderMap[n] = { name: lotName, handle: lotHandle };
          folderMapAll[n] = [{ name: lotName, handle: lotHandle }];
        }
      }
    }
  } else {
    for (const { name, handle } of subdirs2) {
      if (/mise au point/i.test(name)) continue;
      const n = normSupName(name);
      if (SKIP_DIRS.has(n)) continue;
      folderMap[n] = { name, handle };
      folderMapAll[n] = [{ name, handle }];
    }
  }

  const hasStdData = Object.keys(supInfo).length > 0;
  if (!hasStdData) {
    for (const [n, { name }] of Object.entries(folderMap)) {
      ensure(n, name);
    }
  }

  // Matérialise les lots auto-détectés et injecte les colonnes Lot dans docLabels
  if (autoMode && autoLots.size) {
    lots = [...autoLots].sort((a, b) => a - b).map(num => ({ num, label: `Lot ${num}` }));
    docLabels = [...lots.map(l => l.label), ...docLabels];
  }
  // Colonne "Lots positionnés" + AE par lot
  if (lots.length > 0) {
    const aeLotCols = lots.map(l => `AE Lot ${l.num}`);
    // Remplace la colonne globale par : Lots positionnés + AE par lot
    const attriIdx = docLabels.indexOf('ATTRI1 / Acte Engagement');
    if (attriIdx >= 0) {
      docLabels.splice(attriIdx, 1, 'Lots positionnés', ...aeLotCols);
    } else {
      docLabels.push('Lots positionnés', ...aeLotCols);
    }
  }

  // Index global des fichiers contacts (xlsx exploitables + pdf en marqueur)
  onProgress('Recherche fichiers contacts…');
  const allRootFiles = await getAllFiles(rootHandle);
  const contactFiles = allRootFiles.filter(f => {
    if (f.name.startsWith('~')) return false;
    if (!/\.(xlsx?|pdf|docx?)$/i.test(f.name)) return false;
    const p = normSupName(f.path);
    return p.includes('contact') || p.includes('annexe 4') || p.includes('interlocuteur');
  });

  const allNorms = Object.keys(supInfo).sort((a, b) =>
    supInfo[a].displayName.localeCompare(supInfo[b].displayName, 'fr', { sensitivity: 'base' })
  );
  const rows = [];
  for (let i = 0; i < allNorms.length; i++) {
    const n = allNorms[i];
    const info = supInfo[n];
    onProgress(`${i + 1}/${allNorms.length} — ${info.displayName}`);

    let contact = { prenom: '', nom: '', tel: '', mail: '' };
    const folder = folderMap[n];
    const allFolders = folderMapAll[n] || (folder ? [folder] : []);
    let supFiles = [];
    // Accumule les fichiers de TOUS les dossiers du fournisseur (multi-lots)
    for (const f of allFolders) {
      const files = await getAllFiles(f.handle);
      supFiles.push(...files);
    }
    let raw = {};
    if (supFiles.length) {
      raw = detectDocs(supFiles, lots);
    }

    // AE / ATTRI1 / Acte d'engagement — détection par lot dans TOUS les fichiers du fournisseur
    // Cherche si le chemin complet (nom fichier + dossiers parents) contient un mot-clé AE
    // Si le fichier contient aussi un numéro de lot → affecté à ce lot uniquement
    // Si le fichier AE n'a PAS de numéro de lot → affecté à TOUS les lots positionnés
    if (lots.length > 0 && supFiles.length > 0) {
      const attriRule = DOC_RULES['ATTRI1 / Acte Engagement'];
      const isAeFile = (p) => {
        if (attriRule.any.some(kw => p.includes(normPath(kw)))) return true;
        if (attriRule.regexAny && attriRule.regexAny.some(rx => rx.test(p))) return true;
        return false;
      };
      if (!attriByLot[n]) attriByLot[n] = {};
      // D'abord : détection par lot spécifique (fichier AE + numéro de lot dans le chemin)
      for (const lot of lots) {
        if (attriByLot[n][lot.num]) continue;
        const lotRx = new RegExp('(?:^|[\\s_\\-\\/\\\\])lot\\s*' + lot.num + '(?:[\\s_\\-\\.\\/\\\\]|$)', 'i');
        attriByLot[n][lot.num] = supFiles.some(f => {
          const p = normPath(f.path || f.name);
          return isAeFile(p) && lotRx.test(p);
        });
      }
      // Ensuite : si un fichier AE existe SANS mention de lot → il couvre tous les lots positionnés
      const anyLotRx = /(?:^|[\s_\-\/\\])lot\s*\d+(?:[\s_\-\.\/\\]|$)/i;
      const hasGenericAe = supFiles.some(f => {
        const p = normPath(f.path || f.name);
        return isAeFile(p) && !anyLotRx.test(p);
      });
      if (hasGenericAe) {
        for (const lot of lots) {
          if (!attriByLot[n][lot.num]) attriByLot[n][lot.num] = true;
        }
      }
    }

    // Étape "rangement virtuel" : classifie tous les fichiers du fournisseur
    // par catégorie (comme l'export zip), puis lit TOUS les fichiers Contacts
    // et fusionne les résultats. Fallback : recherche globale par tokens.
    const classifyFile = (name) => {
      const l = name.toLowerCase();
      if (/standardis/i.test(l)) return null;
      if (/contact|annexe.?4|interlocuteur|coordonn|referent|correspondant/i.test(l)) return 'Contacts';
      if (/bpu|annexe.?5|bordereau/i.test(l) && !/chiffrage|mission.type/i.test(l)) return 'BPU';
      if (/chiffrage|annexe.?3|mission.type|simulation/i.test(l)) return 'Chiffrage';
      if (/rse|durable|environn/i.test(l)) return 'RSE';
      if (/(?:^|[\s_\-])qt(?:[\s_\-.]|$)|questionnaire.?tech|questionnaire.?technique|annexe.?1/i.test(l)) return 'QT';
      if (/questionnaire/i.test(l)) return 'QT';
      if (/dc1|dc2|kbis|rib|attestation|urssaf|ccap|cctp|attri|engagement|delegation|signe/i.test(l)) return 'Candidature';
      return 'Autres';
    };
    let contactCandidates = supFiles.filter(f => {
      if (f.name.startsWith('~')) return false;
      if (!/\.(xlsx?|pdf|docx?)$/i.test(f.name)) return false;
      return classifyFile(f.name) === 'Contacts';
    });
    if (!contactCandidates.length) {
      const supTokens = n.split(/\s+/).filter(t => t.length > 2);
      contactCandidates = contactFiles.filter(f => {
        const p = normSupName(f.path);
        return supTokens.some(t => p.includes(t));
      });
    }

    // Collecte TOUS les contacts (pas juste le premier)
    const allContacts = [];
    const seen = new Set();
    const pushContact = (c) => {
      if (!c) return;
      if (!c.mail && !c.tel && !c.nom && !c.prenom) return;
      const key = (c.mail || '') + '|' + (c.nom || '').toLowerCase() + '|' + (c.prenom || '').toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      allContacts.push(c);
    };
    let pdfSeen = false;
    const xlsxs = contactCandidates.filter(f => /\.xlsx?$/i.test(f.name));
    const pdfs = contactCandidates.filter(f => /\.pdf$/i.test(f.name));
    const docxs = contactCandidates.filter(f => /\.docx?$/i.test(f.name));
    for (const f of xlsxs) {
      try {
        const file = await f.handle.getFile();
        const buf = await file.arrayBuffer();
        const wb = XLSX.read(buf, { type: 'array' });
        const cs = extractContactsFromWorkbook(wb);
        for (const c of cs) pushContact(c);
      } catch {}
    }
    for (const f of pdfs) {
      pdfSeen = true;
      try {
        const cs = await extractAllContactsFromPdfFile(f.handle);
        for (const c of cs) pushContact(c);
      } catch (e) {
        console.warn('PDF contact extraction failed:', e);
      }
    }
    for (const f of docxs) {
      pdfSeen = true;
      try {
        const cs = await extractAllContactsFromDocxFile(f.handle);
        for (const c of cs) pushContact(c);
      } catch (e) {
        console.warn('DOCX contact extraction failed:', e);
      }
    }
    if (allContacts.length) contact = allContacts[0];
    if (pdfSeen && !allContacts.length) {
      contact._pdfFound = true;
    }

    const bpuMissing = info.bpuMissing || {};
    const bpuHasMissing = Object.keys(bpuMissing).length > 0;
    const lotStatus = info.lotStatus || {};
    const bpuVal = info.hasBpu
      ? (bpuHasMissing ? 'partiel' : 'x')
      : (raw['BPU (Annexe 5)'] ? 'x' : 'non fourni');

    const row = { 'Nom fournisseur': info.displayName };

    // Lots dynamiques — sémantique riche par lot
    // 'x' (rempli) | 'partiel' | 'vide' (template présent mais pas rempli) | '' (absent)
    for (const lot of lots) {
      const lotLabel = docLabels.find(l => l.includes(`Lot ${lot.num}`)) || `Lot ${lot.num}`;
      const ls = lotStatus[lot.num];
      let v = '';
      if (ls) {
        if (ls.status === 'rempli') v = 'x';
        else if (ls.status === 'partiel') v = `partiel ${ls.filledLines}/${ls.totalLines}`;
        else v = 'vide';
      } else if (info.lots.has(lot.num) || raw[`Lot ${lot.num}`]) {
        v = 'x';
      }
      row[lotLabel] = v;
    }
    row._lotStatus = lotStatus;

    // Documents — on écrit sous les deux jeux de clés (court + long)
    // pour gérer DEFAULT_ANALYSE_CONFIG (BPU/QT) et configs détaillées
    // 'x' = présent et rempli · 'vide' = template présent non rempli · 'non fourni' = absent
    const docVal = (present, filled = true) => {
      if (!present) return 'non fourni';
      return filled ? 'x' : 'vide';
    };
    row['BPU (Annexe 5)'] = bpuVal;
    row['BPU'] = bpuVal;
    row['Optim. Tarifaire'] = info.hasOptim
      ? (info.optimFilled ? 'x' : 'vide')
      : (raw['Optim. Tarifaire'] ? 'x' : 'non fourni');
    row['QT (Annexe 1)'] = docVal(info.hasQT || raw['QT (Annexe 1)']);
    row['QT'] = docVal(info.hasQT || raw['QT (Annexe 1)']);
    row['BPU Chiffrage'] = docVal(info.hasChiffrage || raw['BPU Chiffrage']);
    row['Chiffrage'] = docVal(info.hasChiffrage || raw['BPU Chiffrage']);
    row['Questionnaire RSE'] = docVal(info.hasRse || raw['Questionnaire RSE']);
    row['CCAP signé'] = docVal(raw['CCAP signé']);
    row['CCTP signé'] = docVal(raw['CCTP signé']);
    row['DC1'] = docVal(raw['DC1']);
    row['DC2'] = docVal(raw['DC2']);
    row['DUME'] = docVal(raw['DUME']);
    row['KBIS'] = docVal(raw['KBIS']);
    row['RIB'] = docVal(raw['RIB']);
    row['Attestation assurance'] = docVal(raw['Attestation assurance']);
    row['Attestation fiscale'] = docVal(raw['Attestation fiscale']);
    row['Attestation sociale'] = docVal(raw['Attestation sociale']);
    row['Engagement confidentialité'] = docVal(raw['Engagement confidentialité']);
    row['Marquage CE'] = docVal(raw['Marquage CE']);
    row['Certifications ISO'] = docVal(raw['Certifications ISO']);
    row['Mémoire technique'] = docVal(raw['Mémoire technique']);
    row['Contrat maintenance'] = docVal(raw['Contrat maintenance']);
    row['Rétroplanning'] = docVal(raw['Rétroplanning']);
    row['Partenariat'] = docVal(raw['Partenariat']);
    row['Brochures commerciales'] = docVal(raw['Brochures commerciales']);
    row['Certificats de visites'] = docVal(raw['Certificats de visites']);
    row['Documentation politique RSE'] = docVal(raw['Documentation politique RSE']);
    row['Liste de références'] = docVal(raw['Liste de références']);
    row['Management qualité'] = docVal(raw['Management qualité']);
    row['Modules de formation'] = docVal(raw['Modules de formation']);
    row['Matériovigilance'] = docVal(raw['Matériovigilance']);
    row['Cybersécurité'] = docVal(raw['Cybersécurité']);
    row['RC signé'] = docVal(raw['RC signé']);
    row['Complément CCAP'] = docVal(raw['Complément CCAP']);
    row['Délégation de pouvoir'] = docVal(raw['Délégation de pouvoir']);
    row['Critères économiques'] = docVal(raw['Critères économiques']);
    // Colonne récap lots positionnés
    const posLots = lots.filter(lot =>
      info.lots.has(lot.num) || raw[`Lot ${lot.num}`] ||
      (lotStatus[lot.num] && lotStatus[lot.num].status !== 'vide')
    ).map(l => l.num);
    row['Lots positionnés'] = posLots.length ? posLots.join(', ') : '—';

    // AE / ATTRI1 / Acte d'engagement — par lot
    const supAttri = attriByLot[n] || {};
    if (lots.length > 0) {
      for (const lot of lots) {
        const colName = `AE Lot ${lot.num}`;
        // Positionné = lot trouvé dans le BPU, dans la structure dossier, ou dans les fichiers
        const isPositioned = info.lots.has(lot.num) || raw[`Lot ${lot.num}`] ||
          (lotStatus[lot.num] && lotStatus[lot.num].status !== 'vide');
        if (!isPositioned) {
          row[colName] = '—'; // fournisseur non positionné sur ce lot
        } else {
          row[colName] = supAttri[lot.num] ? 'x' : 'non fourni';
        }
      }
    } else {
      // Pas de lots → colonne globale
      row['ATTRI1 / Acte Engagement'] = docVal(raw['ATTRI1 / Acte Engagement'] || raw['ATTRI1']);
    }
    row['Fiche Contacts'] = docVal(raw['Fiche Contacts']);
    row['PRENOM'] = contact.prenom || '';
    row['NOM'] = contact.nom || '';
    row['TEL'] = contact.tel || '';
    row['MAIL'] = contact.mail || '';
    row['FONCTION'] = contact.fonction || '';
    row._contacts = allContacts;
    row._contactPdfOnly = contact._pdfFound === true;
    row._bpuMissing = bpuMissing;

    rows.push(row);
  }

  return { rows, warning, docLabels };
}

// ─── Bundle par type de document ──────────────────────────────────────────────

/**
 * Réorganise un dossier de réponses fournisseur en un zip structuré
 * par type de document : un dossier par catégorie (BPU/QT/RSE/Chiffrage/
 * Candidature/Autres) contenant tous les fichiers de tous les fournisseurs,
 * préfixés par le nom du fournisseur.
 *
 * @param {FileSystemDirectoryHandle} rootHandle
 * @param {function} onProgress
 * @returns {Promise<Blob>} archive zip
 */
export async function bundleResponsesByDocType(rootHandle, onProgress = () => {}) {
  const zip = new JSZip();
  const SKIP = new Set(['standardises', 'compilation', '__pycache__',
    'consignes', 'instructions', 'template', 'modele', 'modeles']);

  const classify = (name) => {
    const l = name.toLowerCase();
    if (/standardis/i.test(l)) return null; // exclure fichiers déjà standardisés
    if (/bpu|annexe.?5|bordereau/i.test(l) && !/chiffrage|mission.type/i.test(l)) return 'BPU';
    if (/chiffrage|annexe.?3|mission.type|simulation/i.test(l)) return 'Chiffrage';
    if (/rse|durable|environn|developpement.durable/i.test(l)) return 'RSE';
    if (/(?:^|[\s_\-])qt(?:[\s_\-.]|$)|questionnaire.?tech|questionnaire.?technique|annexe.?1/i.test(l)) return 'QT';
    if (/questionnaire/i.test(l)) return 'QT';
    if (/dc1|dc2|kbis|rib|attestation|urssaf|ccap|cctp|attri|engagement|delegation|signe/i.test(l)) return 'Candidature';
    if (/contact|annexe.?4|interlocuteur/i.test(l)) return 'Contacts';
    return 'Autres';
  };

  const subdirs = await getSubdirs(rootHandle);
  const isLotDir2 = (n) => /^lot\s*\d+$/i.test(n.trim());
  const hasLots = subdirs.some(s => isLotDir2(s.name));

  let supplierDirs = [];
  if (hasLots) {
    for (const { name, handle } of subdirs) {
      if (isLotDir2(name)) {
        const lotSubs = await getSubdirs(handle);
        for (const sub of lotSubs) {
          if (!SKIP.has(normSupName(sub.name))) {
            const key = normSupName(sub.name);
            if (!supplierDirs.some(s => normSupName(s.name) === key)) {
              supplierDirs.push(sub);
            }
          }
        }
      } else if (!SKIP.has(normSupName(name))) {
        supplierDirs.push({ name, handle });
      }
    }
  } else {
    supplierDirs = subdirs.filter(s => !SKIP.has(normSupName(s.name)));
  }
  if (!supplierDirs.length) {
    throw new Error('Aucun sous-dossier fournisseur trouvé.');
  }

  let totalFiles = 0;
  for (let i = 0; i < supplierDirs.length; i++) {
    const { name: dirName, handle } = supplierDirs[i];
    const display = dirName.replace(/\s+(ok|OK|valid[eé])\s*$/i, '').trim();
    const safeSup = display.replace(/[\\/:*?"<>|]/g, '_');
    onProgress(`${i + 1}/${supplierDirs.length} — ${display}`);
    const files = await getAllFiles(handle);
    for (const f of files) {
      if (f.name.startsWith('~') || f.name.startsWith('.')) continue;
      const cat = classify(f.name);
      if (!cat) continue;
      try {
        const file = await f.handle.getFile();
        const buf = await file.arrayBuffer();
        const ext = (f.name.match(/\.[^.]+$/) || [''])[0];
        const baseName = f.name.replace(/\.[^.]+$/, '').replace(/[\\/:*?"<>|]/g, '_');
        zip.file(`${cat}/${safeSup} - ${baseName}${ext}`, buf);
        totalFiles++;
      } catch {}
    }
  }

  if (!totalFiles) throw new Error('Aucun fichier classé trouvé dans les sous-dossiers.');
  onProgress(`Génération du zip (${totalFiles} fichiers)…`);
  return zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
}

// ─── Compilation QT ───────────────────────────────────────────────────────────

export async function compileQT(rootHandle, config, selectedLots) {
  const { bpuReqCols = {} } = config;
  const stdDir = await findStdDir(rootHandle);
  if (!stdDir) throw new Error('Dossier "Standardisés" introuvable.');

  const qtDir = await findSubdirByName(stdDir, 'QT') ?? stdDir;
  const xlsxFiles = await listXlsxFiles(qtDir, /_QT_standardis[eé]\.xlsx$/i);

  // BPU source de vérité
  const bpuLotSups = {};
  for (const lotNum of selectedLots) bpuLotSups[lotNum] = new Set();

  const bpuDir = await findSubdirByName(stdDir, 'BPU');
  if (bpuDir) {
    for await (const [name, handle] of bpuDir.entries()) {
      if (handle.kind !== 'file' || !/\.xlsx$/i.test(name) || name.startsWith('~')) continue;
      const supName = name.replace(/_BPU_standardis[eé]\.xlsx$/i, '').trim();
      try {
        const wb = await readXlsxHandle(handle);
        for (const s of wb.SheetNames) {
          let ln = 0;
          for (const lotNum of selectedLots) {
            if (new RegExp(`lot\\s*${lotNum}`, 'i').test(s)) { ln = lotNum; break; }
          }
          if (!ln) continue;
          const req = bpuReqCols[ln] || [];
          const raw = XLSX.utils.sheet_to_json(wb.Sheets[s], { header: 1, defval: '' });
          const dRows = raw.slice(1).filter(r => String(r[0] || '').trim());
          if (req.some(ci => dRows.some(r => isRealVal(r[ci])))) bpuLotSups[ln].add(supName);
        }
      } catch {}
    }
  }

  const result = {};
  for (const lot of selectedLots) {
    const lotSheetName = `QT LOT ${lot}`;
    const supData = {};

    for (const { handle, supName } of xlsxFiles) {
      const wb = await readXlsxHandle(handle);
      if (!wb.SheetNames.includes(lotSheetName)) continue;
      const raw = XLSX.utils.sheet_to_json(wb.Sheets[lotSheetName], { header: 1, defval: '' });
      const rows = raw.slice(1).filter(r => String(r[0] || '').trim());
      supData[supName] = rows.map(r => ({
        q: String(r[0] || '').trim(),
        a: String(r[2] || '').trim(),
      }));
    }

    for (const supName of (bpuLotSups[lot] || [])) {
      if (!supData[supName]) supData[supName] = [];
    }

    if (!Object.keys(supData).length) continue;

    const refSup = Object.keys(supData).find(s => supData[s].length > 0);
    if (!refSup) continue;
    const questions = supData[refSup].map(d => d.q);
    const supNames = Object.keys(supData).sort((a, b) => a.localeCompare(b, 'fr', { sensitivity: 'base' }));

    const compiled = [['Question', ...supNames]];
    questions.forEach((q, qi) => {
      compiled.push([q, ...supNames.map(sup => {
        const rows = supData[sup];
        if (!rows.length) return '';
        return rows[qi]?.a || rows.find(r => r.q === q)?.a || '';
      })]);
    });

    const realQIdx = questions
      .map((_, qi) => supNames.some(sup => supData[sup][qi]?.a) ? qi : -1)
      .filter(i => i >= 0);
    const totalReal = realQIdx.length || questions.length;

    const supStatus = {};
    supNames.forEach(sup => {
      if (!supData[sup].length) {
        supStatus[sup] = { status: 'absent', filled: 0, total: totalReal };
      } else {
        const filled = realQIdx.filter(qi => supData[sup][qi]?.a).length;
        const status = filled === totalReal ? 'ok' : filled > 0 ? 'partial' : 'empty';
        supStatus[sup] = { status, filled, total: totalReal };
      }
    });

    result[lot] = { compiled, supStatus, questions, supData };
  }
  return result;
}

// ─── Compilation RSE ──────────────────────────────────────────────────────────

export async function compileRSE(rootHandle) {
  const stdDir = await findStdDir(rootHandle);
  if (!stdDir) throw new Error('Dossier "Standardisés" introuvable.');

  const rseDir = await findSubdirByName(stdDir, 'RSE');
  if (!rseDir) throw new Error('Dossier Standardisés/RSE/ introuvable.');

  const xlsxFiles = await listXlsxFiles(rseDir, /_RSE_standardis[eé]\.xlsx$/i);
  const SHEET = 'RSE DD';
  const supData = {};

  for (const { handle, supName } of xlsxFiles) {
    try {
      const wb = await readXlsxHandle(handle);
      if (!wb.SheetNames.includes(SHEET)) continue;
      const raw = XLSX.utils.sheet_to_json(wb.Sheets[SHEET], { header: 1, defval: '' });
      const rows = raw.slice(1).filter(r => String(r[0] || '').trim() || String(r[1] || '').trim());
      if (!rows.some(r => String(r[2] || '').trim())) continue;
      supData[supName] = rows;
    } catch {}
  }

  if (!Object.keys(supData).length) return {};

  const refSup = Object.keys(supData).reduce((a, b) => supData[a].length >= supData[b].length ? a : b);
  const refRows = supData[refSup];
  const supNames = Object.keys(supData);

  const compiled = [['Thème', 'Question', ...supNames]];
  refRows.forEach((refRow, qi) => {
    compiled.push([
      String(refRow[0] || '').trim(),
      String(refRow[1] || '').trim(),
      ...supNames.map(sup => {
        const row = supData[sup][qi];
        return row ? String(row[2] || '').trim() : '';
      }),
    ]);
  });

  return { compiled, supNames };
}

// ─── Compilation BPU ──────────────────────────────────────────────────────────

/** Résout la keyFn à partir d'un identifiant string */
function resolveKeyFn(keyFnId) {
  if (keyFnId === 'profil-niveau') return r => `${String(r[0] || '').trim()}||${String(r[1] || '').trim()}`;
  if (keyFnId === 'profil') return r => String(r[0] || '').trim();
  return r => String(r[0] || '').trim();
}

export async function compileBPU(rootHandle, config) {
  const { lotSheets = [] } = config;
  const stdDir = await findStdDir(rootHandle);
  if (!stdDir) throw new Error('Dossier "Standardisés" introuvable.');

  const bpuDir = await findSubdirByName(stdDir, 'BPU');
  if (!bpuDir) throw new Error('Dossier Standardisés/BPU/ introuvable.');

  const xlsxFiles = await listXlsxFiles(bpuDir, /_BPU_standardis[eé]\.xlsx$/i);
  const result = {};

  for (const lotDef of lotSheets) {
    const keyFn = resolveKeyFn(lotDef.keyFn);
    const supPrices = {};
    const keyOrder = [];
    const keyRowMap = {};

    for (const { handle, supName } of xlsxFiles) {
      try {
        const wb = await readXlsxHandle(handle);
        if (!wb.SheetNames.includes(lotDef.name)) continue;
        const raw = XLSX.utils.sheet_to_json(wb.Sheets[lotDef.name], { header: 1, defval: '' });
        const rows = raw.slice(1).filter(r => String(r[0] || '').trim());
        const priceMap = new Map();
        for (const row of rows) {
          const key = keyFn(row);
          if (!key) continue;
          const price = String(row[lotDef.priceCol] || '').trim();
          priceMap.set(key, price);
          if (!keyRowMap[key]) { keyRowMap[key] = row; keyOrder.push(key); }
        }
        if ([...priceMap.values()].some(p => p !== '')) supPrices[supName] = priceMap;
      } catch {}
    }

    if (!Object.keys(supPrices).length) continue;

    const supNames = Object.keys(supPrices);
    const compiled = [[...lotDef.headers, ...supNames]];
    for (const key of keyOrder) {
      const refRow = keyRowMap[key];
      const rowCells = lotDef.headers.map((_, hi) => String(refRow[hi] || '').trim());
      rowCells.push(...supNames.map(sup => supPrices[sup]?.get(key) || ''));
      compiled.push(rowCells);
    }

    result[lotDef.name] = { compiled, supNames };
  }

  return result;
}

// ─── Compilation Chiffrage ────────────────────────────────────────────────────

export async function compileChiffrage(rootHandle, config) {
  const { chiffrageLotSheets = [] } = config;
  const stdDir = await findStdDir(rootHandle);
  if (!stdDir) throw new Error('Dossier "Standardisés" introuvable.');

  const chiffrageDir = await findSubdirByName(stdDir, 'Chiffrage');
  if (!chiffrageDir) throw new Error('Dossier Standardisés/Chiffrage/ introuvable.');

  const xlsxFiles = await listXlsxFiles(chiffrageDir, /_Chiffrage_standardis[eé]\.xlsx$/i);
  const result = {};

  for (const sheetName of chiffrageLotSheets) {
    const supPrices = {};
    const keyOrder = [];
    const keyRowMap = {};

    for (const { handle, supName } of xlsxFiles) {
      try {
        const wb = await readXlsxHandle(handle);
        if (!wb.SheetNames.includes(sheetName)) continue;
        const raw = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1, defval: '' });
        const rows = raw.slice(1).filter(r => String(r[0] || '').trim());
        const priceMap = new Map();
        for (const row of rows) {
          const profil = String(row[0] || '').trim();
          const niveau = String(row[1] || '').trim();
          const duree = String(row[2] || '').trim();
          const key = `${profil}||${niveau}||${duree}`;
          if (!profil) continue;
          priceMap.set(key, String(row[3] || '').trim());
          if (!keyRowMap[key]) { keyRowMap[key] = row; keyOrder.push(key); }
        }
        if ([...priceMap.values()].some(p => p !== '')) supPrices[supName] = priceMap;
      } catch {}
    }

    if (!Object.keys(supPrices).length) continue;

    const supNames = Object.keys(supPrices);
    const compiled = [['Profil', 'Niveau expérience', 'Durée mission', ...supNames]];
    for (const key of keyOrder) {
      const refRow = keyRowMap[key];
      compiled.push([
        String(refRow[0] || '').trim(),
        String(refRow[1] || '').trim(),
        String(refRow[2] || '').trim(),
        ...supNames.map(sup => supPrices[sup]?.get(key) || ''),
      ]);
    }

    result[sheetName] = { compiled, supNames };
  }

  return result;
}

// ─── Exports Excel ────────────────────────────────────────────────────────────

export function download(data, filename, type = 'application/octet-stream') {
  const url = URL.createObjectURL(new Blob([data], { type }));
  Object.assign(document.createElement('a'), { href: url, download: filename }).click();
  URL.revokeObjectURL(url);
}
