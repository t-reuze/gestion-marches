export default function KpiCard({ label, value, sub, color = '#E8501A' }) {
  return (
    <div className="kpi-card" style={{ position: 'relative' }}>
      <div className="kpi-accent-bar" style={{ background: color }} />
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">{value}</div>
      {sub && <div className="kpi-sub">{sub}</div>}
    </div>
  );
}
