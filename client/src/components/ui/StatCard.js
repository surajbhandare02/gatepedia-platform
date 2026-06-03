export function StatCard({ label, value, hint, accent = "blue" }) {
  return (
    <article className={`stat-card stat-card--${accent}`}>
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      {hint ? <div className="stat-hint">{hint}</div> : null}
    </article>
  );
}
