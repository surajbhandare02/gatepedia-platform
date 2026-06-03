import { useQuery } from "@tanstack/react-query";
import { Header } from "../components/layout/Header";
import { Spinner } from "../components/ui/Spinner";
import { StatCard } from "../components/ui/StatCard";
import { fetchPlanner, fetchPerformanceInsights, fetchPyqAnalyzer } from "../services/platformService";

export function PlannerPage() {
  const planner = useQuery({ queryKey: ["planner"], queryFn: fetchPlanner });
  const insights = useQuery({ queryKey: ["performance-insights"], queryFn: fetchPerformanceInsights });
  const pyq = useQuery({ queryKey: ["pyq-analyzer"], queryFn: fetchPyqAnalyzer });

  const data = planner.data;

  return (
    <>
      <Header
        title="AI Planner"
        subtitle="A rule-based intelligence layer that prioritizes study, revision, and PYQs from your real progress data."
      />
      <div className={`page ${planner.isLoading ? "page-loading" : ""}`}>
        {planner.isLoading ? <div className="page-overlay"><Spinner label="Loading planner" /></div> : null}

        <section className="grid stats-grid">
          <StatCard label="Readiness" value={`${data?.readiness_score ?? 0}/100`} hint="Completion, PYQs, revision, consistency" accent="blue" />
          <StatCard label="Daily goal" value={`${data?.daily_goal_hours ?? 0}h`} hint="Personalized from profile" accent="teal" />
          <StatCard label="Remaining" value={String(data?.forecast?.remaining_topics ?? 0)} hint="Topics not completed" accent="amber" />
          <StatCard label="Pace" value={data?.forecast?.pace_status || "on_track"} hint="Based on exam date and velocity" accent="violet" />
        </section>

        <section className="saas-grid">
          <article className="panel fade-in-panel">
            <div className="panel-head">
              <h2>Today&apos;s AI Study Plan</h2>
              <p className="panel-sub">Generated from weak topics, confidence, difficulty, and PYQ gaps.</p>
            </div>
            <div className="stack-list">
              {(data?.today_plan || []).map((item) => (
                <div className="stack-item" key={`${item.order}-${item.topic_id}`}>
                  <span className="stack-index">{item.order}</span>
                  <div>
                    <strong>{item.title}</strong>
                    <p>{item.subject} - {item.minutes} minutes</p>
                    <small>{item.reason}</small>
                  </div>
                </div>
              ))}
            </div>
          </article>

          <article className="panel fade-in-panel">
            <div className="panel-head">
              <h2>Priority Subjects</h2>
              <p className="panel-sub">Higher score means the subject needs attention sooner.</p>
            </div>
            <div className="stack-list">
              {(data?.priority_subjects || []).map((subject) => (
                <div className="priority-row" key={subject.id}>
                  <span>{subject.name}</span>
                  <strong>{subject.priority_score}</strong>
                  <span className="mini-progress"><span style={{ width: `${subject.priority_score}%` }} /></span>
                </div>
              ))}
            </div>
          </article>
        </section>

        <section className="saas-grid">
          <article className="panel">
            <div className="panel-head">
              <h2>Revision Recommendations</h2>
              <p className="panel-sub">Spaced repetition items due soon.</p>
            </div>
            <div className="stack-list">
              {(data?.revision_schedule || []).slice(0, 6).map((item) => (
                <div className="compact-row" key={`${item.topic_id}-${item.revision_stage}`}>
                  <span>{item.title}</span>
                  <span className="pill subtle">{item.due_date}</span>
                </div>
              ))}
            </div>
          </article>

          <article className="panel">
            <div className="panel-head">
              <h2>PYQ Recommendations</h2>
              <p className="panel-sub">Topics where practice volume is still low.</p>
            </div>
            <div className="stack-list">
              {(data?.pyq_recommendations || []).map((item) => (
                <div className="compact-row" key={item.topic_id}>
                  <span>{item.title}</span>
                  <span className="pill subtle">{item.target_pyqs} PYQs</span>
                </div>
              ))}
            </div>
          </article>
        </section>

        <section className="saas-grid">
          <article className="panel">
            <div className="panel-head">
              <h2>Performance Insights</h2>
              <p className="panel-sub">AI-style diagnosis from progress patterns.</p>
            </div>
            <div className="stack-list">
              {(insights.data?.insights || []).map((item) => (
                <div className={`insight-card insight-${item.severity}`} key={item.title}>
                  <strong>{item.title}</strong>
                  <p>{item.body}</p>
                </div>
              ))}
            </div>
          </article>

          <article className="panel">
            <div className="panel-head">
              <h2>PYQ Analyzer</h2>
              <p className="panel-sub">Difficulty mix and weak PYQ topics.</p>
            </div>
            <div className="difficulty-mix">
              <span>Easy {pyq.data?.difficulty_mix?.easy ?? 0}</span>
              <span>Medium {pyq.data?.difficulty_mix?.medium ?? 0}</span>
              <span>Hard {pyq.data?.difficulty_mix?.hard ?? 0}</span>
            </div>
            <div className="stack-list">
              {(pyq.data?.weak_pyq_topics || []).slice(0, 5).map((item) => (
                <div className="compact-row" key={`${item.subject}-${item.topic}`}>
                  <span>{item.topic}</span>
                  <span className="pill subtle">{item.accuracy}%</span>
                </div>
              ))}
            </div>
          </article>
        </section>
      </div>
    </>
  );
}
