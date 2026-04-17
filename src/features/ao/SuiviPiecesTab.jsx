import { useState, useCallback } from 'react';
import XLSX from 'xlsx-js-style';
import { scanPiecesJustificatives, PIECES_CATEGORIES, ALL_PIECES } from '../../utils/suiviPieces';

const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[_\-\/\\]/g, ' ');

export default function SuiviPiecesTab({ dirHandle }) {
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState('');
  const [result, setResult] = useState(null);
  const [refData, setRefData] = useState(null);
  const [comparison, setComparison] = useState(null);
  const [expandedPiece, setExpandedPiece] = useState(null);

  const handleScan = useCallback(async () => {
    if (!dirHandle) return;
    setScanning(true);
    setResult(null);
    setComparison(null);
    try {
      const res = await scanPiecesJustificatives(dirHandle, setProgress);
      setResult(res);
      // Auto-compare if ref loaded
      if (refData) doCompare(res, refData);
    } catch (e) {
      console.error('Scan pièces error:', e);
    }
    setScanning(false);
    setProgress('');
  }, [dirHandle, refData]);

  const handleImportRef = useCallback(async () => {
    try {
      const [fileHandle] = await window.showOpenFilePicker({
        types: [{ description: 'Excel', accept: { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx', '.xls'] } }],
      });
      const file = await fileHandle.getFile();
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: 'array' });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const raw = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

      // Parse reference: row 4 = lots, row 5 = suppliers, row 6+ = pieces
      const lotsRow = raw[4] || [];
      const suppliersRow = raw[5] || [];
      const refMatrix = {};
      const colMap = {};
      let currentLot = '';

      for (let c = 1; c < suppliersRow.length; c++) {
        if (lotsRow[c]) currentLot = String(lotsRow[c]);
        const sup = String(suppliersRow[c] || '').trim();
        if (!sup) continue;
        const lotMatch = currentLot.match(/lot\s*(\d+)/i);
        const lotNum = lotMatch ? parseInt(lotMatch[1]) : 0;
        colMap[c] = { lotNum, supplier: sup };
      }

      for (let r = 6; r < raw.length; r++) {
        const row = raw[r];
        const pieceLabel = String(row[0] || '').trim();
        if (!pieceLabel) continue;

        for (const [col, { lotNum, supplier }] of Object.entries(colMap)) {
          const key = lotNum + '|' + norm(supplier).trim();
          if (!refMatrix[key]) refMatrix[key] = {};
          const val = String(row[parseInt(col)] || '').trim().toLowerCase();
          refMatrix[key][pieceLabel] = val.startsWith('oui') ? 'Oui' : (val === 'non' ? 'Non' : val);
        }
      }

      const ref = { refMatrix, fileName: file.name };
      setRefData(ref);
      if (result) doCompare(result, ref);
    } catch (e) {
      if (e.name !== 'AbortError') console.error('Import ref error:', e);
    }
  }, [result]);

  function doCompare(scanResult, ref) {
    const details = [];
    let matches = 0, mismatches = 0;

    for (const [key, pieces] of Object.entries(ref.refMatrix)) {
      const scanKey = Object.keys(scanResult.matrix).find(sk => {
        const skNorm = sk.split('|')[1];
        const refNorm = key.split('|')[1];
        return skNorm === refNorm || skNorm.includes(refNorm) || refNorm.includes(skNorm);
      });
      if (!scanKey) continue;
      const scanPieces = scanResult.matrix[scanKey];

      for (const [refLabel, refVal] of Object.entries(pieces)) {
        if (!refVal) continue;
        const refFound = String(refVal).toLowerCase().startsWith('oui');
        // Find matching scan piece
        const normRefLabel = norm(refLabel);
        const scanEntry = Object.entries(scanPieces).find(([sl]) => {
          const nsl = norm(sl);
          const words = normRefLabel.split(' ').filter(w => w.length > 3);
          return nsl === normRefLabel || words.filter(w => nsl.includes(w)).length >= Math.ceil(words.length * 0.5);
        });

        if (!scanEntry) continue;
        const scanFound = scanEntry[1].found;

        if (scanFound === refFound) {
          matches++;
        } else {
          mismatches++;
          details.push({
            key, refLabel, scanLabel: scanEntry[0],
            scan: scanFound, ref: refFound,
            type: scanFound ? 'Faux positif' : 'Non détecté',
          });
        }
      }
    }

    const total = matches + mismatches;
    setComparison({
      matches, mismatches,
      accuracy: total > 0 ? Math.round(matches / total * 100) : 0,
      total, details,
    });
  }

  const handleExport = useCallback(() => {
    if (!result) return;
    const { lots, matrix } = result;

    // Build headers: piece labels in col A, then supplier columns grouped by lot
    const allCols = [];
    for (const lot of lots) {
      for (const sup of lot.suppliers) {
        allCols.push({ lotNum: lot.num, lotLabel: lot.label, supplier: sup.name, key: sup.key });
      }
    }

    const rows = [];
    // Row 0: lot headers
    rows.push(['', ...allCols.map(c => c.lotLabel)]);
    // Row 1: supplier headers
    rows.push(['', ...allCols.map(c => c.supplier)]);
    // Row 2: blank
    rows.push([]);

    for (const cat of PIECES_CATEGORIES) {
      // Category header
      rows.push([cat.category, ...allCols.map(() => '')]);
      for (const piece of cat.pieces) {
        const row = [piece.label];
        for (const col of allCols) {
          const entry = matrix[col.key]?.[piece.label];
          row.push(entry?.found ? 'Oui' : 'Non');
        }
        rows.push(row);
      }
    }

    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [{ wch: 40 }, ...allCols.map(() => ({ wch: 14 }))];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Suivi pièces');
    XLSX.writeFile(wb, 'suivi_pieces_justificatives.xlsx');
  }, [result]);

  if (!dirHandle) {
    return (
      <div className="fade-in" style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>
        Sélectionnez d'abord un dossier d'offres pour lancer le suivi des pièces justificatives.
      </div>
    );
  }

  return (
    <div className="fade-in">
      {/* Toolbar */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-body" style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <button className="btn btn-primary" onClick={handleScan} disabled={scanning}>
            {scanning ? `Scan... ${progress}` : 'Scanner les pièces'}
          </button>
          <button className="btn btn-outline btn-sm" onClick={handleImportRef}>
            Importer fichier de référence (CQ)
          </button>
          {result && (
            <button className="btn btn-outline btn-sm" onClick={handleExport} style={{ marginLeft: 'auto' }}>
              Exporter Excel
            </button>
          )}
          {refData && (
            <span style={{ fontSize: 12, color: '#16a34a', fontWeight: 500 }}>
              Réf. chargée : {refData.fileName}
            </span>
          )}
        </div>
      </div>

      {/* Comparison results */}
      {comparison && (
        <div style={{
          display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap',
        }}>
          <div style={{
            flex: 1, minWidth: 180, padding: 16, borderRadius: 12,
            background: comparison.accuracy >= 90 ? '#f0fdf4' : comparison.accuracy >= 70 ? '#fffbeb' : '#fef2f2',
            border: `1px solid ${comparison.accuracy >= 90 ? '#bbf7d0' : comparison.accuracy >= 70 ? '#fde68a' : '#fecaca'}`,
          }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: comparison.accuracy >= 90 ? '#16a34a' : comparison.accuracy >= 70 ? '#d97706' : '#dc2626' }}>
              {comparison.accuracy}%
            </div>
            <div style={{ fontSize: 13, color: '#6b7280' }}>Précision de détection</div>
            <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>
              {comparison.matches} concordances / {comparison.total} vérifiés
            </div>
          </div>
          {comparison.mismatches > 0 && (
            <div style={{
              flex: 2, minWidth: 300, padding: 16, borderRadius: 12,
              background: '#fff', border: '1px solid #e5e7eb',
              maxHeight: 200, overflowY: 'auto',
            }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: '#dc2626' }}>
                {comparison.mismatches} divergence{comparison.mismatches > 1 ? 's' : ''}
              </div>
              {comparison.details.map((d, i) => {
                const sup = d.key.split('|')[1];
                return (
                  <div key={i} style={{ fontSize: 12, padding: '4px 0', borderBottom: '1px solid #f3f4f6', display: 'flex', gap: 8 }}>
                    <span style={{
                      padding: '1px 6px', borderRadius: 4, fontSize: 10, fontWeight: 600,
                      background: d.type === 'Faux positif' ? '#fef3c7' : '#fee2e2',
                      color: d.type === 'Faux positif' ? '#92400e' : '#991b1b',
                    }}>{d.type}</span>
                    <span style={{ color: '#374151' }}>{sup}</span>
                    <span style={{ color: '#9ca3af' }}>{d.refLabel}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Main matrix */}
      {result && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, fontSize: 12 }}>
            <thead>
              {/* Lot row */}
              <tr style={{ background: '#001E45' }}>
                <th style={{ ...thStyle, position: 'sticky', left: 0, background: '#001E45', zIndex: 2, color: '#fff', minWidth: 260 }}>
                  Pièce justificative
                </th>
                {result.lots.map(lot => (
                  lot.suppliers.map((sup, si) => (
                    <th key={sup.key} style={{
                      ...thStyle, color: '#fff', textAlign: 'center', fontSize: 10,
                      borderLeft: si === 0 ? '2px solid rgba(255,255,255,.3)' : undefined,
                    }}>
                      {si === 0 && (
                        <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 2, color: '#93c5fd' }}>
                          {lot.label}
                        </div>
                      )}
                      {sup.name}
                    </th>
                  ))
                ))}
              </tr>
            </thead>
            <tbody>
              {PIECES_CATEGORIES.map(cat => (
                <>
                  {/* Category header */}
                  <tr key={'cat-' + cat.category}>
                    <td colSpan={999} style={{
                      padding: '10px 14px', fontWeight: 700, fontSize: 13,
                      background: '#f1f5f9', color: '#334155',
                      position: 'sticky', left: 0,
                      borderTop: '2px solid #cbd5e1',
                    }}>
                      {cat.category}
                    </td>
                  </tr>
                  {cat.pieces.map(piece => (
                    <tr key={piece.label} style={{ borderBottom: '1px solid #f3f4f6' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#fafbfc'}
                      onMouseLeave={e => e.currentTarget.style.background = ''}
                    >
                      <td style={{
                        padding: '8px 14px', fontWeight: 500, color: '#374151',
                        position: 'sticky', left: 0, background: 'inherit',
                        borderRight: '1px solid #e5e7eb', minWidth: 260,
                      }}>
                        {piece.label}
                      </td>
                      {result.lots.flatMap(lot =>
                        lot.suppliers.map((sup, si) => {
                          const entry = result.matrix[sup.key]?.[piece.label];
                          const found = entry?.found;
                          const count = entry?.count || 0;

                          // Check reference for CQ comparison
                          let refVal = null;
                          if (refData) {
                            const refKey = Object.keys(refData.refMatrix).find(rk => {
                              const rkNorm = rk.split('|')[1];
                              const skNorm = sup.key.split('|')[1];
                              return rkNorm === skNorm || rkNorm.includes(skNorm) || skNorm.includes(rkNorm);
                            });
                            if (refKey) {
                              const normLabel = norm(piece.label);
                              const refEntry = Object.entries(refData.refMatrix[refKey]).find(([k]) => {
                                const nk = norm(k);
                                const words = normLabel.split(' ').filter(w => w.length > 3);
                                return nk === normLabel || words.filter(w => nk.includes(w)).length >= Math.ceil(words.length * 0.5);
                              });
                              if (refEntry) refVal = String(refEntry[1]).toLowerCase().startsWith('oui');
                            }
                          }

                          const mismatch = refVal !== null && found !== refVal;

                          return (
                            <td key={sup.key + piece.label} style={{
                              padding: '4px 6px', textAlign: 'center',
                              borderLeft: si === 0 ? '2px solid #e5e7eb' : undefined,
                              background: mismatch ? '#fef2f2' : undefined,
                            }}>
                              <span
                                title={entry?.files?.join('\n') || ''}
                                onClick={() => entry?.files?.length && setExpandedPiece(
                                  expandedPiece === sup.key + piece.label ? null : sup.key + piece.label
                                )}
                                style={{
                                  display: 'inline-flex', alignItems: 'center', gap: 4,
                                  padding: '3px 8px', borderRadius: 999, fontSize: 11, fontWeight: 600,
                                  cursor: count > 0 ? 'pointer' : 'default',
                                  background: found ? '#ecfdf5' : '#f9fafb',
                                  color: found ? '#047857' : '#9ca3af',
                                  border: mismatch ? '2px solid #ef4444' : `1px solid ${found ? '#a7f3d0' : '#e5e7eb'}`,
                                }}>
                                <span style={{
                                  width: 6, height: 6, borderRadius: '50%',
                                  background: found ? '#10b981' : '#d1d5db',
                                }} />
                                {found ? (count > 1 ? `${count}` : '✓') : '—'}
                              </span>
                              {expandedPiece === sup.key + piece.label && entry?.files && (
                                <div style={{
                                  position: 'absolute', zIndex: 10, background: '#fff',
                                  border: '1px solid #d1d5db', borderRadius: 8, padding: 8,
                                  boxShadow: '0 4px 12px rgba(0,0,0,.15)', maxWidth: 350,
                                  textAlign: 'left', fontSize: 11, marginTop: 4,
                                }}>
                                  {entry.files.map((f, i) => (
                                    <div key={i} style={{ padding: '2px 0', color: '#374151', wordBreak: 'break-all' }}>
                                      {f}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </td>
                          );
                        })
                      )}
                    </tr>
                  ))}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const thStyle = {
  padding: '10px 8px',
  fontSize: 11,
  fontWeight: 600,
  whiteSpace: 'nowrap',
};
