import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Header } from "../components/layout/Header";
import { Spinner } from "../components/ui/Spinner";
import { WeeklyChart } from "../components/charts/WeeklyChart";
import { MonthlyChart } from "../components/charts/MonthlyChart";
import { SubjectBarChart } from "../components/charts/SubjectBarChart";
import { StudyHeatmap } from "../components/charts/StudyHeatmap";
import { fetchAnalytics } from "../services/progressService";

export function AnalyticsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetchAnalytics();
        if (!cancelled) setData(res);
      } catch (e) {
        const msg = e?.response?.data?.message || e.message || "Failed to load analytics";
        toast.error(msg);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const s = data?.summary;

  return (
    <>
      <Header
        title="Analytics"
        subtitle="Weekly cadence, monthly load, subject mix, and consistency."
      />
      <div className={`page ${loading ? "page-loading" : ""}`}>
        {loading ? (
          <div className="page-overlay">
            <Spinner label="Loading analytics" />
          </div>
        ) : null}

        {!loading && s ? (
          <section className="metrics-banner">
            <div>
              <div className="metric-kicker">Throughput</div>
              <div className="metric-num">{s.totalHours.toFixed(1)}h</div>
              <div className="metric-cap">total study time</div>
            </div>
            <div>
              <div className="metric-kicker">Discipline</div>
              <div className="metric-num">{s.streak}d</div>
              <div className="metric-cap">current streak</div>
            </div>
            <div>
              <div className="metric-kicker">Breadth</div>
              <div className="metric-num">{s.activeDays}</div>
              <div className="metric-cap">distinct study days</div>
            </div>
            <div>
              <div className="metric-kicker">Reps</div>
              <div className="metric-num">{s.totalSessions}</div>
              <div className="metric-cap">sessions logged</div>
            </div>
            <div>
              <div className="metric-kicker">Syllabus</div>
              <div className="metric-num">{s.syllabus?.completionPercentage ?? 0}%</div>
              <div className="metric-cap">topic completion</div>
            </div>
            <div>
              <div className="metric-kicker">PYQ Accuracy</div>
              <div className="metric-num">{s.pyq?.accuracyPercentage ?? 0}%</div>
              <div className="metric-cap">{s.pyq?.solved ?? 0} solved</div>
            </div>
          </section>
        ) : null}

        <section className="grid charts-grid">
          <WeeklyChart data={data?.weeklySeries} />
          <MonthlyChart data={data?.monthlySeries} />
        </section>

        <section className="grid charts-grid">
          <SubjectBarChart data={data?.bySubject} />
          <StudyHeatmap heatmap={data?.heatmap} />
        </section>

        <section className="grid charts-grid">
          <StudyHeatmap
            heatmap={data?.revisionHeatmap}
            title="Revision heatmap"
            subtitle="Last 90 days - darker means more revision blocks"
            valueKey="count"
            valueLabel=" revisions"
          />
          <SubjectBarChart
            data={data?.weakSubjects?.map((subject) => ({
              ...subject,
              hours: subject.weak_count,
            }))}
            title="Weak subject signals"
            subtitle="Count of hard, weak, priority, or revision topics"
            valueLabel="Weak topics"
            valueSuffix=""
          />
        </section>
      </div>
    </>
  );
}
