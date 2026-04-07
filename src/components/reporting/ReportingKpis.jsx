import KpiCard from '../KpiCard';

function formatEuro(n) {
  if (Math.abs(n) >= 1_000_000) return (n / 1_000_000).toLocaleString('fr-FR', { maximumFractionDigits: 2 }) + ' M\u20AC';
  if (Math.abs(n) >= 1_000) return (n / 1_000).toLocaleString('fr-FR', { maximumFractionDigits: 0 }) + ' K\u20AC';
  return n.toLocaleString('fr-FR', { maximumFractionDigits: 0 }) + ' \u20AC';
}

export default function ReportingKpis({ rows }) {
  const totalCaTtc = rows.reduce((s, r) => s + (r.caTtc || 0), 0);
  const totalGain = rows.reduce((s, r) => s + (r.gainAchatsDgos || 0), 0);
  const scoreGain = totalCaTtc > 0 ? (totalGain / totalCaTtc * 100) : 0;

  return (
    <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
      <KpiCard
        label="CA TTC Total"
        value={formatEuro(totalCaTtc)}
        sub={rows.length + ' lignes'}
        color="#1A4FA8"
      />
      <KpiCard
        label="Gain Achats EUR Total"
        value={formatEuro(totalGain)}
        sub="Nouvelle formule DGOS"
        color="#10B981"
      />
      <KpiCard
        label="Score Gain Achats"
        value={scoreGain.toLocaleString('fr-FR', { maximumFractionDigits: 2 }) + ' %'}
        sub="Gain / CA TTC"
        color="#F59E0B"
      />
    </div>
  );
}
