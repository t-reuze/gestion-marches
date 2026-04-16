import { useMemo, useRef, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  LineChart, Line,
  PieChart, Pie,
} from 'recharts';
import { aggregateBy } from '../../data/excelReportingParser';
import { CHART_COLORS } from '../../data/reportingConstants';
import { ChartExportButton } from './ChartExportMenu';

const EQUIPEMENTS_LOURDS = new Set([
  'Accélérateur', 'Ampli', 'SPECT-CZT', 'IRM', 'IRM Linac', 'Mammographe',
  'Projecteur de source', 'scanner diag', 'Scanner diag', 'scanner RI', 'scanner RT', 'Scanner RT',
  'SPECT', 'SPECT Cardio', 'SPECT-CT', 'SPECT CZT - CT', 'Table', 'TEP-CT', 'TEP-IRM',
  'Fantôme', 'Contentions non-consommables', 'Echographe',
  'Reconaissance Surfacique', 'Reconnaissance Surfacique', 'Reconnaissance surfacique',
  'Identitovigilance', 'Cuve à eau', 'Cuves a eau', 'Enceintes blindées',
]);

function formatEuroShort(n) {
  if (Math.abs(n) >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (Math.abs(n) >= 1_000) return (n / 1_000).toFixed(0) + 'K';
  return n.toFixed(0);
}

function formatEuroTooltip(n) {
  return Math.round(n).toLocaleString('fr-FR') + ' €';
}

const RADIAN = Math.PI / 180;
function renderPieLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent, name }) {
  if (percent < 0.03) return null;
  const radius = outerRadius + 20;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="var(--text)" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize={10}>
      {name} ({(percent * 100).toFixed(1)}%)
    </text>
  );
}

export default function ReportingCharts({ rows }) {
  const byFournisseur = useMemo(() => aggregateBy(rows, 'fournisseur', { topN: 10, caseInsensitive: true }), [rows]);
  const byAnnee = useMemo(() => {
    const agg = aggregateBy(rows, 'annee', { sortDir: 'asc' });
    return [...agg].sort((a, b) => Number(a.name) - Number(b.name));
  }, [rows]);
  const byMarche = useMemo(() => aggregateBy(rows, 'marcheGroupe', { topN: 12 }), [rows]);

  // Quantité d'équipements par année (toggle lourds / tous)
  const [equipLourdsOnly, setEquipLourdsOnly] = useState(true);
  const quantiteRows = useMemo(() =>
    equipLourdsOnly ? rows.filter(r => EQUIPEMENTS_LOURDS.has(r.typeEquipement)) : rows,
  [rows, equipLourdsOnly]);
  const quantiteByAnnee = useMemo(() => {
    const agg = aggregateBy(quantiteRows, 'annee', { sortDir: 'asc', valueKey: 'quantite' });
    return [...agg].sort((a, b) => Number(a.name) - Number(b.name));
  }, [quantiteRows]);

  // CA TTC : Unicancer (CLCC) vs Établissements affiliés
  const caByEtablissementType = useMemo(() => {
    const clcc = rows.filter(r => (r.etablissement || '').toLowerCase() === 'unicancer')
      .reduce((s, r) => s + (Number(r.caTtc) || 0), 0);
    const ea = rows.filter(r => {
      const e = (r.etablissement || '').toLowerCase();
      return e && e !== 'unicancer';
    }).reduce((s, r) => s + (Number(r.caTtc) || 0), 0);
    return [
      { name: 'CLCC (Unicancer)',       value: clcc },
      { name: 'Établissements affiliés', value: ea },
    ].filter(d => d.value > 0);
  }, [rows]);

  // Quantité par type d'équipement
  const quantiteByType = useMemo(() => aggregateBy(quantiteRows, 'typeEquipement', { topN: 12, valueKey: 'quantite' }), [quantiteRows]);

  // Gains achats cumulés par année (agrégat de plusieurs colonnes gain)
  const gainsByAnnee = useMemo(() => {
    const map = {};
    for (const r of rows) {
      const a = r.annee;
      if (!a) continue;
      const key = String(a);
      if (!map[key]) map[key] = { name: key, gainRef: 0, gainDgos: 0, gainMaint: 0 };
      map[key].gainRef += Number(r.gainAchatsRef) || 0;
      map[key].gainDgos += Number(r.gainAchatsDgos) || 0;
      map[key].gainMaint += Number(r.gainAchatsMaintenance) || 0;
    }
    return Object.values(map).sort((a, b) => Number(a.name) - Number(b.name));
  }, [rows]);

  const refFournisseur = useRef(null);
  const refAnnee = useRef(null);
  const refMarche = useRef(null);
  const refQuantite = useRef(null);
  const refClccEa = useRef(null);
  const refTypeQte = useRef(null);
  const refGains = useRef(null);

  const ETAB_COLORS = ['#2D5F8A', '#8B5CF6'];

  return (
    <div className="reporting-chart-grid">
      {/* Barres horizontales : CA par Fournisseur */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">CA TTC par Fournisseur</span>
          <ChartExportButton title="CA TTC par Fournisseur" data={byFournisseur} chartType="bar" labelCol="Fournisseur" valueCol="CA TTC (EUR)" chartRef={refFournisseur} />
        </div>
        <div className="card-body" ref={refFournisseur} style={{ height: Math.max(350, byFournisseur.length * 32 + 40) }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart layout="vertical" data={byFournisseur} margin={{ top: 4, right: 40, left: 8, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" tickFormatter={v => formatEuroShort(v)} tick={{ fontSize: 10 }} />
              <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 10 }} interval={0} />
              <Tooltip formatter={v => [formatEuroTooltip(v), 'CA TTC']} />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                {byFournisseur.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Courbe : CA par Année */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">CA TTC par Année</span>
          <ChartExportButton title="CA TTC par Année" data={byAnnee} chartType="line" labelCol="Année" valueCol="CA TTC (EUR)" chartRef={refAnnee} />
        </div>
        <div className="card-body" ref={refAnnee} style={{ height: 350 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={byAnnee} margin={{ top: 4, right: 24, left: 8, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis tickFormatter={v => formatEuroShort(v)} tick={{ fontSize: 10 }} />
              <Tooltip formatter={v => [formatEuroTooltip(v), 'CA TTC']} />
              <Line type="monotone" dataKey="value" stroke="#2563eb" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Donut : CA par Marché */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">CA TTC par Marché</span>
          <ChartExportButton title="CA TTC par Marché" data={byMarche} chartType="pie" labelCol="Marché" valueCol="CA TTC (EUR)" chartRef={refMarche} />
        </div>
        <div className="card-body" ref={refMarche} style={{ height: 350 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={byMarche} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={90} label={renderPieLabel} labelLine={{ stroke: 'var(--border)', strokeWidth: 1 }}>
                {byMarche.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={v => [formatEuroTooltip(v), 'CA TTC']} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Barres : Nombre d'équipements par année */}
      <div className="card">
        <div className="card-header" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className="card-title">Équipements achetés par année</span>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 500, color: 'var(--text-3)', cursor: 'pointer', marginLeft: 8 }}>
            <input type="checkbox" checked={equipLourdsOnly} onChange={() => setEquipLourdsOnly(v => !v)} />
            Équipements lourds uniquement
          </label>
          <ChartExportButton title="Équipements achetés par année" data={quantiteByAnnee} chartType="bar" labelCol="Année" valueCol="Quantité" chartRef={refQuantite} />
        </div>
        <div className="card-body" ref={refQuantite} style={{ height: 300 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={quantiteByAnnee} margin={{ top: 4, right: 24, left: 8, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
              <Tooltip formatter={v => [v + ' équipement' + (v > 1 ? 's' : ''), 'Quantité']} />
              <Bar dataKey="value" fill="#0EA5E9" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Donut : CA CLCC vs EA */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">CA TTC : CLCC vs Établissements affiliés</span>
          <ChartExportButton title="CA TTC CLCC vs EA" data={caByEtablissementType} chartType="pie" labelCol="Type" valueCol="CA TTC (EUR)" chartRef={refClccEa} />
        </div>
        <div className="card-body" ref={refClccEa} style={{ height: 350 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={caByEtablissementType} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={90} label={renderPieLabel} labelLine={{ stroke: 'var(--border)', strokeWidth: 1 }}>
                {caByEtablissementType.map((_, i) => <Cell key={i} fill={ETAB_COLORS[i]} />)}
              </Pie>
              <Tooltip formatter={v => [formatEuroTooltip(v), 'CA TTC']} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Barres horizontales : Équipements par type */}
      <div className="card">
        <div className="card-header" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className="card-title">Équipements par type</span>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 500, color: 'var(--text-3)', cursor: 'pointer', marginLeft: 8 }}>
            <input type="checkbox" checked={equipLourdsOnly} onChange={() => setEquipLourdsOnly(v => !v)} />
            Équipements lourds uniquement
          </label>
          <ChartExportButton title="Équipements par type" data={quantiteByType} chartType="bar" labelCol="Type d'équipement" valueCol="Quantité" chartRef={refTypeQte} />
        </div>
        <div className="card-body" ref={refTypeQte} style={{ height: Math.max(300, quantiteByType.length * 30 + 40) }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart layout="vertical" data={quantiteByType} margin={{ top: 4, right: 40, left: 8, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10 }} allowDecimals={false} />
              <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 10 }} interval={0} />
              <Tooltip formatter={v => [v + ' équipement' + (v > 1 ? 's' : ''), 'Quantité']} />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                {quantiteByType.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Barres empilées : Gains achats par année */}
      {gainsByAnnee.some(g => g.gainRef || g.gainDgos || g.gainMaint) && (
        <div className="card">
          <div className="card-header">
            <span className="card-title">Gains achats cumulés par année</span>
            <ChartExportButton title="Gains achats par année" data={gainsByAnnee} chartType="bar" labelCol="Année" valueCol="Gain (EUR)" chartRef={refGains} />
          </div>
          <div className="card-body" ref={refGains} style={{ height: 320 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={gainsByAnnee} margin={{ top: 4, right: 24, left: 8, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tickFormatter={v => formatEuroShort(v)} tick={{ fontSize: 10 }} />
                <Tooltip formatter={v => [formatEuroTooltip(v), '']} />
                <Bar dataKey="gainRef" stackId="g" fill="#10B981" name="Achats (référence)" />
                <Bar dataKey="gainDgos" stackId="g" fill="#3B82F6" name="Achats (DGOS)" />
                <Bar dataKey="gainMaint" stackId="g" fill="#F59E0B" name="Maintenance" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
