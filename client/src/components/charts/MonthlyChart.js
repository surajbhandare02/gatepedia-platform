import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

/** Last 30 days — cumulative feel with area */
export function MonthlyChart({ data }) {
  if (!data?.length) return null;

  return (
    <div className="chart-card">
      <div className="chart-head">
        <h3>Monthly study curve</h3>
        <p className="chart-sub">Daily hours over the last 30 days</p>
      </div>
      <div className="chart-body">
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="mhFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--chart-2)" stopOpacity={0.35} />
                <stop offset="100%" stopColor="var(--chart-2)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} interval={4} />
            <YAxis allowDecimals tick={{ fontSize: 12 }} width={36} />
            <Tooltip
              contentStyle={{ borderRadius: 12, border: "none" }}
              formatter={(v) => [`${v} h`, "Hours"]}
              labelFormatter={(_, p) => (p?.[0]?.payload?.day ? `Date: ${p[0].payload.day}` : "")}
            />
            <Area type="monotone" dataKey="hours" stroke="var(--chart-2)" fill="url(#mhFill)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
