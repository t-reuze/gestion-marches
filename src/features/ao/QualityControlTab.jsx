/**
 * QualityControlTab.jsx
 * Module de contrôle qualité : compare l'annuaire généré automatiquement
 * avec une grille acheteur de référence (collage CSV / TSV).
 *
 * Permet de mesurer précision/rappel par lot et identifier les écarts.
 */
import React, { useState, useMemo } from 'react';
import { fuzzyMatchSupplier, normSupName } from '../../utils/analyseFolder';

/** Parse un texte CSV/TSV en tableau d'objets. Détecte le séparateur. */
function parseTable(text) {
  if (!text.trim()) return { headers: [], rows: [] };
  const lines = text.trim().split(/\r?\n/);
  const sep = lines[0].includes('\t') ? '\t'
            : lines[0].includes(';') ? ';'
            : ',';
  const headers = lines[0].split(sep).map(h => h.trim());
  const rows = lines.slice(1).map(l => {
    const cells = l.split(sep);
    const obj = {};
    headers.forEach((h, i) => { obj[h] = (cells[i] || '').trim(); });
    return obj;
  });
  return { headers, rows };
}

/** Normalise une valeur de cellule en statut canonique. */
function canonStatus(v) {
  if (!v) return '';
  const s = String(v).toLowerCase().trim();
  if (s === 'x' || s === '✓' || s === 'oui') return 'x';
  if (s.startsWith('partiel')) return 'partiel';
  if (s.includes('non fourni') || s.includes('non four')) return 'non fourni';
  if (s === 'vide') return 'vide';
  if (s.includes('non')) return 'non';
  if (s) return 'autre';
  return '';
}

export default function QualityControlTab({ annuaire }) {
  const [refText, setRefText] = useState('');
  const [refData, setRefData] = useState(null);
  const [error, setError] = useState('');

  function loadRef() {
    setError('');
    try {
      const parsed = parseTable(refText);
      if (!parsed.headers.length) throw new Error('Aucune colonne détectée');
      // Détecte la colonne fournisseur
      const fournCol = parsed.headers.find(h =>
        /fournisseur|supplier|nom|société|societe/i.test(h)
      );
      if (!fournCol) throw new Error('Colonne "fournisseur" introuvable');
      setRefData({ ...parsed, fournCol });
    } catch (e) {
      setError(String(e.message || e));
    }
  }

  const comparison = useMemo(() => {
    if (!refData || !annuaire?.length) return null;
    const refNames = refData.rows.map(r => normSupName(r[refData.fournCol]));
    const ourNames = annuaire.map(r => normSupName(r['Nom fournisseur']));

    // Pour chaque fournisseur acheteur, trouver le match dans notre scan
    const matched = [];
    const missingFromUs = [];
    for (const refRow of refData.rows) {
      const refName = refRow[refData.fournCol];
      const { match, score } = fuzzyMatchSupplier(refName, ourNames);
      if (match) {
        const ourRow = annuaire.find(r => normSupName(r['Nom fournisseur']) === match);
        matched.push({ refRow, ourRow, score });
      } else {
        missingFromUs.push(refName);
      }
    }
    // Fournisseurs chez nous mais pas chez l'acheteur
    const matchedOurNames = new Set(matched.map(m => normSupName(m.ourRow['Nom fournisseur'])));
    const extraInUs = annuaire
      .filter(r => !matchedOurNames.has(normSupName(r['Nom fournisseur'])))
      .map(r => r['Nom fournisseur']);

    // Comparaison cellule par cellule (sur colonnes communes par nom approximatif)
    const refColsMap = {};
    for (const h of refData.headers) {
      if (h === refData.fournCol) continue;
      refColsMap[h] = h.toLowerCase();
    }
    const cellDiffs = [];
    let totalCells = 0, matchCells = 0;
    for (const m of matched) {
      for (const refCol of Object.keys(refColsMap)) {
        // Trouve la colonne équivalente dans notre annuaire
        const ourCol = Object.keys(m.ourRow).find(c =>
          c.toLowerCase().includes(refColsMap[refCol]) ||
          refColsMap[refCol].includes(c.toLowerCase())
        );
        if (!ourCol) continue;
        const refVal = canonStatus(m.refRow[refCol]);
        const ourVal = canonStatus(m.ourRow[ourCol]);
        if (!refVal && !ourVal) continue;
        totalCells++;
        if (refVal === ourVal) matchCells++;
        else cellDiffs.push({
          fournisseur: m.ourRow['Nom fournisseur'],
          champ: refCol,
          attendu: m.refRow[refCol],
          obtenu: m.ourRow[ourCol] || '(vide)',
        });
      }
    }

    return {
      matched, missingFromUs, extraInUs,
      cellDiffs, totalCells, matchCells,
      accuracy: totalCells > 0 ? matchCells / totalCells : 0,
    };
  }, [refData, annuaire]);

  return (
    <div className="fade-in">
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-body">
          <h4 style={{ marginTop: 0 }}>Contrôle qualité — comparaison avec grille acheteur</h4>
          <p style={{ fontSize: 12, color: '#6b7280' }}>
            Colle ici la grille acheteur (CSV, TSV ou Excel copier-coller).
            Première ligne = en-têtes. Une colonne doit contenir le nom du fournisseur.
          </p>
          <textarea
            value={refText}
            onChange={e => setRefText(e.target.value)}
            placeholder="Nom fournisseur	Lot 1	Lot 2	Lot 3	BPU	QT	RSE&#10;CAMO	x		x	x	x	non fourni&#10;..."
            style={{ width: '100%', minHeight: 120, fontFamily: 'monospace', fontSize: 12, padding: 8 }}
          />
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button className="btn btn-primary" onClick={loadRef} disabled={!refText.trim()}>
              Charger et comparer
            </button>
            {refData && <span style={{ color: '#6b7280', fontSize: 12, alignSelf: 'center' }}>
              {refData.rows.length} fournisseurs · {refData.headers.length} colonnes
            </span>}
          </div>
          {error && <div style={{ color: '#dc2626', marginTop: 8, fontSize: 13 }}>⚠ {error}</div>}
        </div>
      </div>

      {comparison && (
        <>
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-body">
              <h4 style={{ marginTop: 0 }}>Résumé</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                <Metric label="Matchés" value={comparison.matched.length} color="#10b981" />
                <Metric label="Manquants chez nous" value={comparison.missingFromUs.length} color="#ef4444" />
                <Metric label="En trop chez nous" value={comparison.extraInUs.length} color="#f59e0b" />
                <Metric label="Précision cellules" value={`${(comparison.accuracy * 100).toFixed(0)}%`} color="#3b82f6" />
              </div>
            </div>
          </div>

          {comparison.missingFromUs.length > 0 && (
            <div className="card" style={{ marginBottom: 16 }}>
              <div className="card-body">
                <h4 style={{ marginTop: 0, color: '#ef4444' }}>Fournisseurs manquants chez nous</h4>
                <ul style={{ margin: 0, fontSize: 13 }}>
                  {comparison.missingFromUs.map((n, i) => <li key={i}>{n}</li>)}
                </ul>
              </div>
            </div>
          )}

          {comparison.extraInUs.length > 0 && (
            <div className="card" style={{ marginBottom: 16 }}>
              <div className="card-body">
                <h4 style={{ marginTop: 0, color: '#f59e0b' }}>Fournisseurs présents chez nous mais absents de la référence</h4>
                <ul style={{ margin: 0, fontSize: 13 }}>
                  {comparison.extraInUs.map((n, i) => <li key={i}>{n}</li>)}
                </ul>
              </div>
            </div>
          )}

          {comparison.cellDiffs.length > 0 && (
            <div className="card">
              <div className="card-body">
                <h4 style={{ marginTop: 0 }}>Divergences cellule par cellule ({comparison.cellDiffs.length})</h4>
                <table className="table" style={{ fontSize: 12 }}>
                  <thead>
                    <tr><th>Fournisseur</th><th>Champ</th><th>Attendu (acheteur)</th><th>Obtenu (nous)</th></tr>
                  </thead>
                  <tbody>
                    {comparison.cellDiffs.slice(0, 100).map((d, i) => (
                      <tr key={i}>
                        <td><strong>{d.fournisseur}</strong></td>
                        <td>{d.champ}</td>
                        <td style={{ color: '#10b981' }}>{d.attendu}</td>
                        <td style={{ color: '#ef4444' }}>{d.obtenu}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {comparison.cellDiffs.length > 100 && (
                  <p style={{ fontSize: 11, color: '#6b7280', marginTop: 8 }}>
                    … {comparison.cellDiffs.length - 100} divergences supplémentaires non affichées
                  </p>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Metric({ label, value, color }) {
  return (
    <div style={{ textAlign: 'center', padding: 12, background: '#f9fafb', borderRadius: 8 }}>
      <div style={{ fontSize: 24, fontWeight: 'bold', color }}>{value}</div>
      <div style={{ fontSize: 11, color: '#6b7280', marginTop: 4 }}>{label}</div>
    </div>
  );
}
