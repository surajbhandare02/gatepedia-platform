import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

/** Last 7 days — hours per day */
export function WeeklyChart({ data }) {
  if (!data?.length) return null;

  return (
    <div className="chart-card">
      <div className="chart-head">
        <h3>Weekly rhythm</h3>
        <p className="chart-sub">Hours logged per day (last 7 days)</p>
      </div>
      <div className="chart-body">
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="recharts-cartesian-grid" />
            <XAxis dataKey="label" tick={{ fontSize: 12 }} />
            <YAxis allowDecimals tick={{ fontSize: 12 }} width={36} />
            <Tooltip
              contentStyle={{ borderRadius: 12, border: "none" }}
              formatter={(v) => [`${v} h`, "Hours"]}
              labelFormatter={(_, p) => (p?.[0]?.payload?.day ? `Date: ${p[0].payload.day}` : "")}
            />
            <Bar dataKey="hours" fill="var(--chart-1)" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
