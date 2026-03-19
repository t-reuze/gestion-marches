export default function KpiCard({ label, value, sub, color = '#E8501A', icon }) {
  return (
    <div className="kpi-card">
      <div className="kpi-card-top">
        <div className="kpi-label">{label}</div>
        {icon && (
          <div
            className="kpi-icon-badge"
            style={{ background: color + '18', color }}
          >
            {icon}
          </div>
        )}
      </div>
      <div className="kpi-value" style={{ color: 'var(--text)' }}>{value}</div>
      {sub && <div className="kpi-sub">{sub}</div>}
    </div>
  );
}
