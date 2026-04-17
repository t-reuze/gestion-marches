/**
 * suiviPieces.js
 * Scan d'un dossier d'offres structuré (Lot/Fournisseur) pour détecter
 * la présence des pièces justificatives attendues.
 *
 * Produit un tableau croisé : lignes = pièces, colonnes = fournisseurs par lot.
 * Compatible avec l'import d'un fichier Excel de référence pour le contrôle qualité.
 */

// ─── Catégories et règles de détection ────────────────────────────────────────

export const PIECES_CATEGORIES = [
  {
    category: 'Éléments techniques/physiques/médicaux',
    pieces: [
      { label: 'Questionnaire Technique',           keywords: ['questionnaire', 'technique', 'qt', 'annexe 1', 'cctp annexe'] },
      { label: 'Brochures commerciales',             keywords: ['brochure', 'commercial', 'plaquette', 'catalogue'] },
      { label: 'Fiches ou Mémoires techniques',      keywords: ['fiche technique', 'memoire technique', 'mémoire technique', 'notice technique'] },
      { label: 'Certificats de visites',             keywords: ['certificat visite', 'visite site', 'visite clinique', 'visite beneficiaire'] },
      { label: 'Organisation maintenance',           keywords: ['maintenance', 'organisation maintenance', 'descriptif maintenance', 'sav'] },
      { label: 'Contrats de maintenance type',       keywords: ['contrat maintenance', 'contrat type', 'maintenance type'] },
      { label: 'Documentation politique RSE',        keywords: ['politique rse', 'documentation rse', 'rse politique', 'durable politique'] },
      { label: 'Questionnaire RSE',                  keywords: ['questionnaire rse', 'rse questionnaire', 'annexe rse', 'dd recrutement'] },
      { label: 'Liste de références clients',        keywords: ['reference client', 'références client', 'liste reference', 'liste des reference'] },
      { label: 'Management de la qualité',           keywords: ['management qualite', 'management qualité', 'qualite', 'iso 9001'] },
      { label: 'Modules de formation',               keywords: ['formation', 'module formation', 'descriptif formation', 'plan formation'] },
      { label: 'Procédure de Matériovigilance',      keywords: ['materiovigilance', 'matériovigilance', 'vigilance'] },
      { label: 'Conformité Cybersécurité',           keywords: ['cybersecurite', 'cybersécurité', 'securite informatique', 'cyber'] },
      { label: 'Rétroplanning',                      keywords: ['retroplanning', 'rétroplanning', 'planning', 'retro planning'] },
    ],
  },
  {
    category: 'Éléments Administratifs',
    pieces: [
      { label: 'CCAP daté et signé',                keywords: ['ccap', '9_ccap'] },
      { label: 'CCTP daté et signé',                keywords: ['cctp', '10_cctp'] },
      { label: 'RC daté et signé',                  keywords: ['rgc', 'reglement consultation', 'règlement consultation', '11_rgc', 'rc '] },
      { label: 'Fiche contacts',                    keywords: ['fiche contact', 'contact', 'annexe 4', 'interlocuteur', '1_fiche'] },
      { label: 'DUME (ou DC1/DC2/DC4)',             keywords: ['dume', 'dc1', 'dc2', 'dc4', 'document unique marche', '2_document_unique'] },
      { label: 'Délégation de pouvoir',             keywords: ['delegation', 'délégation', 'pouvoir', 'mandat'] },
      { label: 'Acte d\'engagement',                keywords: ['acte engagement', 'acte d engagement', 'attri1', 'ae ', '3_acte'] },
      { label: 'Engagement de confidentialité',     keywords: ['confidentialite', 'confidentialité', '4_engagement'] },
      { label: 'Attestation fiscale',               keywords: ['attestation fiscale', 'regularite fiscale', 'régularité fiscale', '7_attestation'] },
      { label: 'Attestation sociale',               keywords: ['attestation sociale', 'declarations sociales', 'déclarations sociales', 'urssaf'] },
      { label: 'Attestation assurance',             keywords: ['assurance', 'attestation assurance', '12_attestation'] },
      { label: 'Critères économiques (CA)',         keywords: ['ca annuel', 'critere economique', 'critères économiques', 'chiffre affaire'] },
      { label: 'Marquage CE',                       keywords: ['marquage ce', 'ce mdr', 'certification ce', '8_marquage'] },
      { label: 'Certifications ISO',                keywords: ['iso', 'certification iso', 'iso 13485', 'iso 9001'] },
      { label: 'KBIS',                              keywords: ['kbis', 'k-bis', 'extrait kbis', '13_kbis'] },
      { label: 'RIB',                               keywords: ['rib', 'iban', '14_rib'] },
    ],
  },
  {
    category: 'Éléments Financiers',
    pieces: [
      { label: 'BPU Excel',                         keywords: ['bpu', 'bordereau prix', 'annexe 5', '5_bordereau'] },
      { label: 'BPU PDF',                           keywords: ['bpu', 'bordereau prix', '6_bordereau'] },
      { label: 'Fiche partenariat',                 keywords: ['partenariat', 'fiche partenariat', 'partenariat scientifique'] },
    ],
  },
];

// Flatten all pieces for iteration
export const ALL_PIECES = PIECES_CATEGORIES.flatMap(c =>
  c.pieces.map(p => ({ ...p, category: c.category }))
);

// ─── Helpers ──────────────────────────────────────────────────────────────────

const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[_\-\/\\]/g, ' ');

function fileMatchesPiece(filePath, piece) {
  const p = norm(filePath);
  return piece.keywords.some(kw => p.includes(norm(kw)));
}

// ─── Scan principal ───────────────────────────────────────────────────────────

/**
 * Scanne un dossier d'offres et produit le suivi des pièces justificatives.
 *
 * @param {FileSystemDirectoryHandle} rootHandle - dossier racine (contient Lot1/, Lot2/... ou directement les fournisseurs)
 * @param {function} onProgress - callback (message)
 * @returns {Promise<{ matrix, lots, suppliers, categories }>}
 *   matrix[supplierKey][pieceLabel] = { found: boolean, files: string[] }
 *   lots = [{ num, label, suppliers: [{ name, key }] }]
 */
export async function scanPiecesJustificatives(rootHandle, onProgress = () => {}) {
  const subdirs = [];
  for await (const [name, handle] of rootHandle.entries()) {
    if (handle.kind === 'directory' && !name.startsWith('.')) {
      subdirs.push({ name, handle });
    }
  }

  // Détecte si la racine contient des dossiers Lot (LotN, Lot N, Lot_N)
  const isLotDir = name => /^lot\s*_?\s*\d+$/i.test(name.trim());
  const hasLotStructure = subdirs.some(s => isLotDir(s.name));

  const lots = [];
  const matrix = {};  // { "lotNum|supplierNorm": { pieceLabel: { found, files } } }
  const allSuppliers = [];

  async function getAllFiles(dirHandle, basePath = '') {
    const files = [];
    for await (const [name, handle] of dirHandle.entries()) {
      if (name.startsWith('~') || name.startsWith('.')) continue;
      const fullPath = basePath ? basePath + '/' + name : name;
      if (handle.kind === 'file') files.push(fullPath);
      else files.push(...await getAllFiles(handle, fullPath));
    }
    return files;
  }

  async function processSupplier(lotNum, supplierName, supplierHandle) {
    const key = lotNum + '|' + norm(supplierName).trim();
    const files = await getAllFiles(supplierHandle);

    matrix[key] = {};
    for (const piece of ALL_PIECES) {
      const matchingFiles = files.filter(f => fileMatchesPiece(f, piece));
      matrix[key][piece.label] = {
        found: matchingFiles.length > 0,
        files: matchingFiles,
        count: matchingFiles.length,
      };
    }

    return { name: supplierName, key, lotNum, fileCount: files.length };
  }

  if (hasLotStructure) {
    // Structure Lot/Fournisseur
    const lotDirs = subdirs
      .filter(s => isLotDir(s.name))
      .sort((a, b) => {
        const na = parseInt(a.name.match(/\d+/)[0]);
        const nb = parseInt(b.name.match(/\d+/)[0]);
        return na - nb;
      });

    for (const { name: lotName, handle: lotHandle } of lotDirs) {
      const lotNum = parseInt(lotName.match(/\d+/)[0]);
      onProgress(`Scan ${lotName}...`);

      const supplierDirs = [];
      for await (const [name, handle] of lotHandle.entries()) {
        if (handle.kind === 'directory' && !name.startsWith('.')) {
          // Ignore complement folders (already handled by base supplier)
          const isComplement = /^compl[eéè]ment/i.test(name);
          if (!isComplement) {
            supplierDirs.push({ name, handle });
          }
        }
      }

      supplierDirs.sort((a, b) => a.name.localeCompare(b.name, 'fr'));

      const lotSuppliers = [];
      for (const { name, handle } of supplierDirs) {
        onProgress(`${lotName} > ${name}...`);
        const sup = await processSupplier(lotNum, name, handle);
        lotSuppliers.push({ name, key: sup.key });
        allSuppliers.push(sup);
      }

      // Also scan complement folders and merge into base supplier
      for await (const [name, handle] of lotHandle.entries()) {
        if (handle.kind === 'directory' && /^compl[eéè]ment/i.test(name)) {
          const baseMatch = name.match(/compl[eéè]ments?\s+(?:\d+\s+)?(.+)/i);
          if (baseMatch) {
            const baseName = norm(baseMatch[1]).replace(/\s+lot\s+.*/i, '').trim();
            // Find matching supplier
            const matchKey = Object.keys(matrix).find(k => {
              const supNorm = k.split('|')[1];
              return supNorm.includes(baseName) || baseName.includes(supNorm);
            });
            if (matchKey) {
              const compFiles = await getAllFiles(handle);
              for (const piece of ALL_PIECES) {
                const matchingFiles = compFiles.filter(f => fileMatchesPiece(f, piece));
                if (matchingFiles.length > 0) {
                  matrix[matchKey][piece.label].found = true;
                  matrix[matchKey][piece.label].files.push(...matchingFiles);
                  matrix[matchKey][piece.label].count += matchingFiles.length;
                }
              }
            }
          }
        }
      }

      lots.push({ num: lotNum, label: `Lot ${lotNum}`, suppliers: lotSuppliers });
    }
  } else {
    // Structure plate : directement les fournisseurs
    const lotNum = 0;
    const lotSuppliers = [];
    for (const { name, handle } of subdirs.sort((a, b) => a.name.localeCompare(b.name, 'fr'))) {
      if (/^(standardises|compilation|template|modele|consignes|instructions|lettres)/i.test(name)) continue;
      onProgress(`${name}...`);
      const sup = await processSupplier(lotNum, name, handle);
      lotSuppliers.push({ name, key: sup.key });
      allSuppliers.push(sup);
    }
    lots.push({ num: 0, label: 'Tous', suppliers: lotSuppliers });
  }

  return { matrix, lots, suppliers: allSuppliers, categories: PIECES_CATEGORIES };
}

// ─── Import fichier de référence pour CQ ──────────────────────────────────────

/**
 * Parse un fichier Excel de suivi des pièces justificatives (format Unicancer)
 * pour l'utiliser comme référence de contrôle qualité.
 *
 * @param {ArrayBuffer} buffer - contenu du fichier Excel
 * @returns {{ refMatrix, lots, pieceLabels }}
 */
export function parseReferenceExcel(wb) {
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const raw = __XLSX_utils_sheet_to_json(sheet);

  // Row 4 : lots headers, Row 5 : supplier names, Row 6+ : pieces data
  // This is specific to the Unicancer format — adapt as needed
  const lotsRow = raw[4] || [];
  const suppliersRow = raw[5] || [];
  const refMatrix = {};

  // Build column → (lotNum, supplierName) mapping
  const colMap = {};
  let currentLot = '';
  for (let c = 1; c < suppliersRow.length; c++) {
    if (lotsRow[c]) currentLot = String(lotsRow[c]);
    const sup = String(suppliersRow[c] || '').trim();
    if (sup && sup !== 'Éléments techniques/physiques/médicaux') {
      const lotMatch = currentLot.match(/lot\s*(\d+)/i);
      const lotNum = lotMatch ? parseInt(lotMatch[1]) : 0;
      colMap[c] = { lotNum, supplier: sup };
    }
  }

  // Parse piece rows
  for (let r = 6; r < raw.length; r++) {
    const row = raw[r];
    const pieceLabel = String(row[0] || '').trim();
    if (!pieceLabel) continue;

    for (const [col, { lotNum, supplier }] of Object.entries(colMap)) {
      const key = lotNum + '|' + norm(supplier).trim();
      if (!refMatrix[key]) refMatrix[key] = {};
      const val = String(row[parseInt(col)] || '').trim().toLowerCase();
      refMatrix[key][pieceLabel] = val.startsWith('oui');
    }
  }

  return { refMatrix, colMap };
}

// Placeholder — will be replaced by actual XLSX import in the component
function __XLSX_utils_sheet_to_json(sheet) {
  // This function should be called with XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' })
  // It's a placeholder for the module pattern
  return [];
}

// ─── Comparaison scan vs référence ────────────────────────────────────────────

/**
 * Compare les résultats du scan automatique avec la référence Excel.
 * @returns {{ matches, mismatches, scanOnly, refOnly, accuracy }}
 */
export function compareWithReference(scanMatrix, refMatrix) {
  let matches = 0, mismatches = 0, scanOnly = 0, refOnly = 0;
  const details = [];

  for (const key of Object.keys(scanMatrix)) {
    const ref = refMatrix[key];
    if (!ref) { scanOnly++; continue; }

    for (const [piece, scanResult] of Object.entries(scanMatrix[key])) {
      // Find matching reference piece (fuzzy match on label)
      const normPiece = norm(piece);
      const refEntry = Object.entries(ref).find(([k]) => {
        const nk = norm(k);
        return nk.includes(normPiece) || normPiece.includes(nk) ||
          normPiece.split(' ').filter(w => w.length > 3).some(w => nk.includes(w));
      });

      if (!refEntry) continue;

      const refFound = refEntry[1];
      if (scanResult.found === refFound) {
        matches++;
      } else {
        mismatches++;
        details.push({
          key, piece,
          scan: scanResult.found, ref: refFound,
          type: scanResult.found ? 'faux_positif' : 'faux_negatif',
        });
      }
    }
  }

  const total = matches + mismatches;
  return {
    matches, mismatches, scanOnly, refOnly,
    accuracy: total > 0 ? Math.round(matches / total * 100) : 0,
    details,
  };
}
