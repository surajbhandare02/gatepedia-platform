import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { CircularProgressbar } from "react-circular-progressbar";
import "react-circular-progressbar/dist/styles.css";
import { Header } from "../components/layout/Header";
import { StatCard } from "../components/ui/StatCard";
import { Spinner } from "../components/ui/Spinner";
import { ProgressForm } from "../components/progress/ProgressForm";
import { ProgressTable } from "../components/progress/ProgressTable";
import { GATE_SUBJECTS } from "../constants/subjects";

import { useProgressList, useDashboardAnalytics, useProgressMutations } from "../hooks/useProgress";
import { useSubjects } from "../hooks/useSyllabus";
import { useAppStore } from "../store/useAppStore";

export function DashboardPage() {
  const [q, setQ] = useState("");
  const [subject, setSubject] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  
  const [listFilters, setListFilters] = useState({
    q: "",
    subject: "",
    from: "",
    to: "",
  });

  const [editingId, setEditingId] = useState(null);
  const [editSeed, setEditSeed] = useState(null);
  const dailyGoal = useAppStore((state) => state.dailyGoal);
  const setDailyGoal = useAppStore((state) => state.setDailyGoal);

  // Use React Query hooks
  const { data: rows = [], isLoading: isRowsLoading } = useProgressList(listFilters);
  const { data: analytics, isLoading: isAnalyticsLoading } = useDashboardAnalytics();
  const { data: syllabus = [], isLoading: isSyllabusLoading } = useSubjects();
  
  const { createMut, updateMut, deleteMut } = useProgressMutations();

  const loading = isRowsLoading || isAnalyticsLoading || isSyllabusLoading;
  
  const subjectOptions = syllabus.length ? syllabus.map((item) => item.name) : GATE_SUBJECTS;

  const summary = analytics?.summary;
  
  const goalPct = useMemo(() => {
    if (!summary) return 0;
    const g = Math.max(0.5, dailyGoal);
    const pct = Math.min(100, Math.round(((summary.todayHours || 0) / g) * 100));
    return pct;
  }, [summary, dailyGoal]);

  const phasePct = useMemo(() => {
    if (!summary) return 0;
    const targetHours = 320;
    return Math.min(100, Math.round(((summary.totalHours || 0) / targetHours) * 100));
  }, [summary]);

  const onSaved = async (payload, id) => {
    try {
      if (id) {
        await updateMut.mutateAsync({ id, payload });
        toast.success("Session updated");
        setEditingId(null);
        setEditSeed(null);
      } else {
        await createMut.mutateAsync(payload);
        toast.success("Session saved");
      }
    } catch (e) {
      const msg = e?.response?.data?.message || e.message || "Request failed";
      toast.error(msg);
      throw e;
    }
  };

  const onEdit = (row) => {
    setEditingId(row.id);
    setEditSeed({ ...row });
  };

  const onDelete = async (row) => {
    if (!window.confirm("Delete this session?")) return;
    try {
      await deleteMut.mutateAsync(row.id);
      toast.success("Deleted");
      if (editingId === row.id) {
        setEditingId(null);
        setEditSeed(null);
      }
    } catch (e) {
      const msg = e?.response?.data?.message || e.message || "Delete failed";
      toast.error(msg);
    }
  };

  const applyFilters = (e) => {
    e.preventDefault();
    // Only pass non-empty values
    const newFilters = {};
    if (q.trim()) newFilters.q = q.trim();
    if (subject) newFilters.subject = subject;
    if (from) newFilters.from = from;
    if (to) newFilters.to = to;
    setListFilters(newFilters);
  };

  const clearFilters = () => {
    setQ("");
    setSubject("");
    setFrom("");
    setTo("");
    setListFilters({});
  };

  const changeGoal = (e) => {
    const n = Number(e.target.value);
    if (!Number.isFinite(n) || n <= 0) return;
    setDailyGoal(n);
    toast.success("Daily goal updated");
  };

  const isSaving = createMut.isPending || updateMut.isPending;
  const busyId = deleteMut.isPending ? deleteMut.variables : null;

  return (
    <>
      <Header
        title="Dashboard"
        subtitle="Log sessions, filter history, and track momentum at a glance."
      />
      <div className={`page ${loading ? "page-loading" : ""}`}>
        {loading && (
          <div className="page-overlay">
            <Spinner label="Loading dashboard" />
          </div>
        )}

        <section className="grid stats-grid">
          <StatCard
            label="Total hours"
            value={summary ? summary.totalHours.toFixed(1) : "—"}
            hint="Across all subjects"
            accent="blue"
          />
          <StatCard
            label="Sessions logged"
            value={summary ? String(summary.totalSessions) : "—"}
            hint="Each row is a focused block"
            accent="violet"
          />
          <StatCard
            label="Active days"
            value={summary ? String(summary.activeDays) : "—"}
            hint="Distinct calendar days with study"
            accent="teal"
          />
          <StatCard
            label="Streak"
            value={summary ? `${summary.streak}d` : "—"}
            hint="Consecutive days with at least one log"
            accent="amber"
          />
          <StatCard
            label="Syllabus"
            value={summary ? `${summary.syllabus?.completionPercentage ?? 0}%` : "—"}
            hint={`${summary?.syllabus?.completedTopics ?? 0}/${summary?.syllabus?.totalTopics ?? 0} topics complete`}
            accent="teal"
          />
          <StatCard
            label="PYQs solved"
            value={summary ? String(summary.pyq?.solved ?? 0) : "—"}
            hint={`${summary?.pyq?.accuracyPercentage ?? 0}% accuracy tracked`}
            accent="violet"
          />
        </section>

        <section className="grid widgets-grid">
          <article className="panel ring-panel">
            <div className="panel-head">
              <h2>Today vs daily goal</h2>
              <p className="panel-sub">Stay above your baseline — small wins compound.</p>
            </div>
            <div className="ring-row">
              <div className="progress-ring">
                <CircularProgressbar
                  value={goalPct}
                  text={`${goalPct}%`}
                  styles={{
                    path: { stroke: "var(--ring-path)" },
                    trail: { stroke: "var(--ring-trail)" },
                    text: { fill: "var(--text)", fontWeight: 700, fontSize: "18px" },
                  }}
                />
              </div>
              <div className="ring-meta">
                <label className="field">
                  <span className="field-label">Daily goal (hours)</span>
                  <select className="input" value={dailyGoal} onChange={changeGoal}>
                    {[2, 3, 4, 5, 6, 8].map((h) => (
                      <option key={h} value={h}>
                        {h}h / day
                      </option>
                    ))}
                  </select>
                </label>
                <p className="muted small">
                  Logged today: <strong>{summary?.todayHours?.toFixed(1) ?? 0}h</strong>
                </p>
              </div>
            </div>
          </article>

          <article className="panel ring-panel">
            <div className="panel-head">
              <h2>Phase progress</h2>
              <p className="panel-sub">Illustrative target: 320h — adjust in code for your plan.</p>
            </div>
            <div className="ring-row">
              <div className="progress-ring">
                <CircularProgressbar
                  value={phasePct}
                  text={`${phasePct}%`}
                  styles={{
                    path: { stroke: "var(--chart-2)" },
                    trail: { stroke: "var(--ring-trail)" },
                    text: { fill: "var(--text)", fontWeight: 700, fontSize: "18px" },
                  }}
                />
              </div>
              <div className="ring-meta">
                <p className="muted small">
                  Total logged: <strong>{summary?.totalHours?.toFixed(1) ?? 0}h</strong>
                </p>
                <p className="muted small">
                  Productivity tip: schedule revision blocks right after lectures.
                </p>
              </div>
            </div>
          </article>
        </section>

        <section className="saas-grid">
          {analytics?.weeklySeries && (
            <article className="panel">
              <div className="panel-head">
                <h2>Weekly Distribution</h2>
                <p className="panel-sub">Hours studied per day over the last 7 days.</p>
              </div>
              <div style={{ display: "flex", gap: "8px", alignItems: "flex-end", height: "150px", marginTop: "1rem" }}>
                {analytics.weeklySeries.map((day, i) => (
                  <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
                    <div style={{ 
                      width: "100%", 
                      height: `${Math.min(100, (day.hours / Math.max(1, ...analytics.weeklySeries.map(d => d.hours))) * 100)}%`, 
                      background: "var(--brand)", 
                      borderRadius: "4px 4px 0 0",
                      minHeight: day.hours > 0 ? "4px" : "0"
                    }}></div>
                    <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{day.label}</span>
                  </div>
                ))}
              </div>
            </article>
          )}

          {analytics?.bySubject && (
            <article className="panel">
              <div className="panel-head">
                <h2>Subject Analytics</h2>
                <p className="panel-sub">Progress breakdown by topic.</p>
              </div>
              <div className="stack-list" style={{ marginTop: "1rem" }}>
                {analytics.bySubject.slice(0, 5).map(sub => (
                  <div key={sub.subject} className="stack-item" style={{ flexDirection: "column", alignItems: "flex-start", gap: "0.5rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", width: "100%" }}>
                      <strong>{sub.subject}</strong>
                      <span>{sub.completion_percentage}%</span>
                    </div>
                    <div style={{ width: "100%", height: "6px", background: "var(--bg-elevated)", borderRadius: "3px", overflow: "hidden" }}>
                      <div style={{ width: `${sub.completion_percentage}%`, height: "100%", background: "var(--brand)" }}></div>
                    </div>
                  </div>
                ))}
              </div>
            </article>
          )}
        </section>

        <ProgressForm
          editingId={editingId}
          initialValues={editSeed}
          onCancelEdit={() => {
            setEditingId(null);
            setEditSeed(null);
          }}
          onSaved={onSaved}
          disabled={isSaving}
          subjects={subjectOptions}
        />

        <section className="panel">
          <div className="panel-head row-between">
            <div>
              <h2>Session history</h2>
              <p className="panel-sub">Search topics, slice by subject and date range.</p>
            </div>
          </div>

          <form className="filters" onSubmit={applyFilters}>
            <input
              className="input"
              placeholder="Search topic…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              aria-label="Search topic"
            />
            <select className="input" value={subject} onChange={(e) => setSubject(e.target.value)}>
              <option value="">All subjects</option>
              {subjectOptions.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <input
              type="date"
              className="input"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              aria-label="From date"
            />
            <input
              type="date"
              className="input"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              aria-label="To date"
            />
            <button type="submit" className="btn btn-primary">
              Apply filters
            </button>
            <button type="button" className="btn btn-ghost" onClick={clearFilters}>
              Clear
            </button>
          </form>

          <ProgressTable rows={rows} onEdit={onEdit} onDelete={onDelete} busyId={busyId} />
        </section>
      </div>
    </>
  );
}
