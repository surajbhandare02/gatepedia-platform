import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export function SubjectBarChart({
  data,
  title = "Subject-wise hours",
  subtitle = "Where your time actually goes",
  valueLabel = "Hours",
  valueSuffix = " h",
}) {
  if (!data?.length) return null;

  const sorted = [...data].sort((a, b) => a.hours - b.hours);

  return (
    <div className="chart-card">
      <div className="chart-head">
        <h3>{title}</h3>
        <p className="chart-sub">{subtitle}</p>
      </div>
      <div className="chart-body chart-body--tall">
        <ResponsiveContainer width="100%" height={320}>
          <BarChart
            layout="vertical"
            data={sorted}
            margin={{ top: 8, right: 16, left: 8, bottom: 8 }}
          >
            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 12 }} />
            <YAxis type="category" dataKey="subject" width={140} tick={{ fontSize: 11 }} />
            <Tooltip
              contentStyle={{ borderRadius: 12, border: "none" }}
              formatter={(v) => [`${v}${valueSuffix}`, valueLabel]}
            />
            <Bar dataKey="hours" fill="var(--chart-3)" radius={[0, 8, 8, 0]} barSize={18} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
