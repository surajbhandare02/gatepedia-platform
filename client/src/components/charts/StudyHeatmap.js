function formatLocalDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function StudyHeatmap({
  heatmap,
  title = "Consistency heatmap",
  subtitle = "Last 90 days - darker means more hours",
  valueKey = "hours",
  valueLabel = "h",
}) {
  if (!heatmap?.length) return null;

  const map = new Map(heatmap.map((h) => [h.date, h[valueKey] || 0]));
  const days = [];
  for (let i = 89; i >= 0; i -= 1) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = formatLocalDate(d);
    days.push({ key, value: map.get(key) || 0 });
  }

  const max = Math.max(1, ...days.map((d) => d.value));

  return (
    <div className="chart-card">
      <div className="chart-head">
        <h3>{title}</h3>
        <p className="chart-sub">{subtitle}</p>
      </div>
      <div className="heatmap" role="img" aria-label={title}>
        {days.map((d) => {
          const level = d.value <= 0 ? 0 : Math.ceil((d.value / max) * 4);
          return (
            <span
              key={d.key}
              className={`heatmap-cell heatmap-cell--${level}`}
              title={`${d.key}: ${d.value}${valueLabel}`}
            />
          );
        })}
      </div>
      <div className="heatmap-legend">
        <span>Less</span>
        <span className="heatmap-legend-scale" aria-hidden />
        <span>More</span>
      </div>
    </div>
  );
}
