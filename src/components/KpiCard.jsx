export default function KpiCard({ label, value, sub, color = '#1A4FA8', icon }) {
  return (
    <div className="kpi-card" style={{ '--kpi-color': color }}>
      <div className="kpi-label">{icon && <span style={{ marginRight: 4 }}>{icon}</span>}{label}</div>
      <div className="kpi-value">{value}</div>
      {sub && <div className="kpi-sub">{sub}</div>}
    </div>
  );
}
