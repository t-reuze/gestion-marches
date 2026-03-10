export default function EmptyState({ icon = '📭', title, sub, action }) {
  return (
    <div className="empty-state fade-in">
      <div className="empty-icon">{icon}</div>
      <div className="empty-title">{title}</div>
      {sub && <div className="empty-sub">{sub}</div>}
      {action}
    </div>
  );
}
