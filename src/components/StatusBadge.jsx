import { STATUT_CONFIG } from '../data/mockData';

export default function StatusBadge({ statut, size = 'md' }) {
  const cfg = STATUT_CONFIG[statut] || { label: statut, color: '#64748B', bg: '#F8FAFC' };
  const fontSize = size === 'sm' ? '9px' : '10px';
  return (
    <span className="badge" style={{ color: cfg.color, background: cfg.bg, fontSize }}>
      {cfg.label}
    </span>
  );
}
