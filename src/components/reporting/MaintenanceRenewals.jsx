import { useMemo, useState, useRef } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { CHART_COLORS } from '../../data/reportingConstants';
import { ChartExportButton } from './ChartExportMenu';

function formatEuroTooltip(n) {
  return Math.round(n).toLocaleString('fr-FR') + ' €';
}

export default function MaintenanceRenewals({ rows }) {
  const [showTable, setShowTable] = useState(false);
  const chartBodyRef = useRef(null);

  const currentYear = new Date().getFullYear();

  // Équipements TCO dépassé
  const depasses = useMemo(() =>
    rows.filter(r => r.anneeChangement > 0 && r.anneeChangement <= currentYear),
    [rows, currentYear]
  );

  // Renouvellements futurs par année + marché
  const futurs = useMemo(() =>
    rows.filter(r => r.anneeChangement > currentYear && r.anneeChangement <= currentYear + 10),
    [rows, currentYear]
  );

  // Marchés uniques dans les futurs
  const marches = useMemo(() => {
    const set = new Set(futurs.map(r => r.marcheGroupe).filter(Boolean));
    return [...set].sort();
  }, [futurs]);

  // Données pour le graphique empilé
  const chartData = useMemo(() => {
    const years = {};
    futurs.forEach(r => {
      const y = r.anneeChangement;
      if (!years[y]) years[y] = { annee: String(y) };
      const m = r.marcheGroupe || 'Autre';
      years[y][m] = (years[y][m] || 0) + 1;
    });
    return Object.values(years).sort((a, b) => a.annee.localeCompare(b.annee));
  }, [futurs]);

  // Tableau détaillé des équipements à renouveler (dépassés + futurs)
  const tableRows = useMemo(() => {
    const all = [...depasses, ...futurs];
    return all.sort((a, b) => (a.anneeChangement || 0) - (b.anneeChangement || 0));
  }, [depasses, futurs]);

  const totalFuturs = futurs.length;

  return (
    <div>
      {/* Alerte dépassés */}
      <div className="info-box amber" style={{ marginBottom: 16 }}>
        <strong>{depasses.length} équipements</strong> ont dépassé leur durée de vie théorique (TCO terminé)
        {totalFuturs > 0 && <span> — <strong>{totalFuturs} renouvellements</strong> prévus entre {currentYear + 1} et {currentYear + 8}</span>}
      </div>

      {/* Graphique barres empilées */}
      {chartData.length > 0 && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header">
            <span className="card-title">Renouvellements prévus par année</span>
            <ChartExportButton
              title="Renouvellements prévus par année"
              chartType="bar"
              labelCol="Année"
              valueCol="Nb équipements"
              chartRef={chartBodyRef}
              data={chartData.map(row => {
                const total = marches.reduce((s, m) => s + (row[m] || 0), 0);
                return { name: row.annee, value: total };
              })}
            />
          </div>
          <div className="card-body" ref={chartBodyRef} style={{ height: 320 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 4, right: 24, left: 8, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="annee" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                {marches.map((m, i) => (
                  <Bar key={m} dataKey={m} stackId="a" fill={CHART_COLORS[i % CHART_COLORS.length]} radius={i === marches.length - 1 ? [3, 3, 0, 0] : [0, 0, 0, 0]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Bouton toggle tableau */}
      <button
        className="btn btn-sm btn-outline"
        onClick={() => setShowTable(!showTable)}
        style={{ marginBottom: 12 }}
      >
        {showTable ? 'Masquer le détail' : 'Voir le détail des ' + tableRows.length + ' équipements'}
      </button>

      {/* Tableau détaillé */}
      {showTable && (
        <div className="table-container" style={{ marginBottom: 20 }}>
          <table>
            <thead>
              <tr>
                <th>Année changement</th>
                <th>Statut</th>
                <th>Marché</th>
                <th>Type d'équipement</th>
                <th>Équipement</th>
                <th>CLCC</th>
                <th>Fournisseur</th>
                <th>Coût maint. annuel</th>
              </tr>
            </thead>
            <tbody>
              {tableRows.slice(0, 200).map((r, i) => {
                const depasse = r.anneeChangement <= currentYear;
                return (
                  <tr key={i}>
                    <td className="td-mono" style={{ fontWeight: 600, color: depasse ? 'var(--red)' : 'var(--text)' }}>
                      {r.anneeChangement || '—'}
                    </td>
                    <td>
                      <span className="badge" style={{
                        background: depasse ? 'var(--red)' : 'var(--amber)',
                        color: 'white', fontSize: 10, padding: '2px 8px'
                      }}>
                        {depasse ? 'Dépassé' : 'À venir'}
                      </span>
                    </td>
                    <td style={{ fontSize: 11 }}>{r.marcheGroupe || '—'}</td>
                    <td style={{ fontSize: 11 }}>{r.typeEquipement || '—'}</td>
                    <td style={{ fontSize: 11 }}>{r.nomEquipement || '—'}</td>
                    <td style={{ fontSize: 11 }}>{r.clcc || '—'}</td>
                    <td style={{ fontSize: 11 }}>{r.fournisseur || '—'}</td>
                    <td className="td-mono" style={{ fontSize: 11 }}>
                      {r.coutMaintenanceAnnuel ? Math.round(r.coutMaintenanceAnnuel).toLocaleString('fr-FR') + ' €' : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {tableRows.length > 200 && (
            <div style={{ padding: 8, fontSize: 11, color: 'var(--text-muted)', textAlign: 'center' }}>
              Affichage limité aux 200 premiers — {tableRows.length - 200} lignes supplémentaires
            </div>
          )}
        </div>
      )}
    </div>
  );
}
