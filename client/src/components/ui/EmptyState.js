export function EmptyState({ title, hint, action }) {
  return (
    <div className="empty-state">
      <div className="empty-illus" aria-hidden>
        GP
      </div>
      <h3 className="empty-title">{title}</h3>
      {hint ? <p className="empty-hint">{hint}</p> : null}
      {action ? <div className="empty-action">{action}</div> : null}
    </div>
  );
}
