import { useMemo, useRef } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  LineChart, Line,
  PieChart, Pie,
} from 'recharts';
import { aggregateBy } from '../../data/excelReportingParser';
import { CHART_COLORS } from '../../data/reportingConstants';
import { ChartExportButton } from './ChartExportMenu';

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
  const byAnnee = useMemo(() => aggregateBy(rows, 'annee', { sortDir: 'asc' }), [rows]);
  const byMarche = useMemo(() => aggregateBy(rows, 'marcheGroupe', { topN: 12 }), [rows]);

  const refFournisseur = useRef(null);
  const refAnnee = useRef(null);
  const refMarche = useRef(null);

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
    </div>
  );
}
