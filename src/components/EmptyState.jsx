export default function EmptyState({ title, sub, action }) {
  return (
    <div className="empty-state fade-in">
      <div className="empty-title">{title}</div>
      {sub && <div className="empty-sub">{sub}</div>}
      {action}
    </div>
  );
}
