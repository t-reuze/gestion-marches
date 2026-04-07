import KpiCard from '../KpiCard';

function formatEuro(n) {
  if (Math.abs(n) >= 1_000_000) return (n / 1_000_000).toLocaleString('fr-FR', { maximumFractionDigits: 2 }) + ' M€';
  if (Math.abs(n) >= 1_000) return (n / 1_000).toLocaleString('fr-FR', { maximumFractionDigits: 0 }) + ' K€';
  return n.toLocaleString('fr-FR', { maximumFractionDigits: 0 }) + ' €';
}

export default function MaintenanceKpis({ rows }) {
  const totalCoutAnnuel = rows.reduce((s, r) => s + (r.coutMaintenanceAnnuel || 0), 0);
  const totalTco = rows.reduce((s, r) => s + (r.tcoFinalTtc || 0), 0);
  const totalGainMaint = rows.reduce((s, r) => s + (r.gainAchatsMaintenance || 0), 0);

  const sousContrat = rows.filter(r => String(r.contratMaintenance).toLowerCase() === 'oui').length;
  const sansContrat = rows.filter(r => String(r.contratMaintenance).toLowerCase() === 'non').length;
  const totalContrats = sousContrat + sansContrat;

  return (
    <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
      <KpiCard
        label="Coût maintenance annuel"
        value={formatEuro(totalCoutAnnuel)}
        sub="Total contrats TTC"
        color="#dc2626"
      />
      <KpiCard
        label="TCO Total"
        value={formatEuro(totalTco)}
        sub="Coût total de possession"
        color="#1A4FA8"
      />
      <KpiCard
        label="Sous contrat"
        value={sousContrat + ' / ' + totalContrats}
        sub={sansContrat + ' sans contrat'}
        color="#F59E0B"
      />
      <KpiCard
        label="Gain Maintenance"
        value={formatEuro(totalGainMaint)}
        sub="Économies mutualisation"
        color="#10B981"
      />
    </div>
  );
}
