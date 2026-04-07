import { useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { CHART_COLORS } from '../../data/reportingConstants';

function formatEuroShort(n) {
  if (Math.abs(n) >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (Math.abs(n) >= 1_000) return (n / 1_000).toFixed(0) + 'K';
  return n.toFixed(0);
}

function formatEuroTooltip(n) {
  return Math.round(n).toLocaleString('fr-FR') + ' €';
}

export default function MaintenanceCharts({ rows }) {
  // Coût annuel maintenance par marché (groupé)
  const byMarche = useMemo(() => {
    const map = {};
    rows.forEach(r => {
      if (!r.coutMaintenanceAnnuel) return;
      const m = r.marcheGroupe || 'Autre';
      map[m] = (map[m] || 0) + r.coutMaintenanceAnnuel;
    });
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [rows]);

  // Contrats par fournisseur
  const byFournisseur = useMemo(() => {
    const map = {};
    rows.forEach(r => {
      if (String(r.contratMaintenance).toLowerCase() !== 'oui') return;
      const f = r.fournisseur || 'Autre';
      const key = f.toUpperCase();
      map[key] = (map[key] || 0) + 1;
    });
    let entries = Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
    if (entries.length > 12) {
      const top = entries.slice(0, 11);
      const rest = entries.slice(11).reduce((s, e) => s + e.value, 0);
      top.push({ name: 'Autres', value: rest });
      entries = top;
    }
    return entries;
  }, [rows]);

  return (
    <div className="reporting-chart-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
      {/* Coût maintenance par marché */}
      <div className="card">
        <div className="card-header"><span className="card-title">Coût annuel maintenance par Marché</span></div>
        <div className="card-body" style={{ height: Math.max(320, byMarche.length * 36 + 40) }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart layout="vertical" data={byMarche} margin={{ top: 4, right: 40, left: 8, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" tickFormatter={v => formatEuroShort(v)} tick={{ fontSize: 10 }} />
              <YAxis type="category" dataKey="name" width={160} tick={{ fontSize: 10 }} interval={0} />
              <Tooltip formatter={v => [formatEuroTooltip(v), 'Coût annuel']} />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                {byMarche.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Contrats par fournisseur */}
      <div className="card">
        <div className="card-header"><span className="card-title">Contrats maintenance par Fournisseur</span></div>
        <div className="card-body" style={{ height: Math.max(320, byFournisseur.length * 32 + 40) }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart layout="vertical" data={byFournisseur} margin={{ top: 4, right: 40, left: 8, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10 }} allowDecimals={false} />
              <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 10 }} interval={0} />
              <Tooltip formatter={v => [v, 'Contrats actifs']} />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                {byFournisseur.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
