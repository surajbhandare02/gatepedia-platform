import { useQuery } from "@tanstack/react-query";
import { Header } from "../components/layout/Header";
import { StatCard } from "../components/ui/StatCard";
import { fetchAdminOverview } from "../services/platformService";

export function AdminPage() {
  const admin = useQuery({ queryKey: ["admin-overview"], queryFn: fetchAdminOverview, retry: false });

  return (
    <>
      <Header title="Admin" subtitle="Platform insights and master syllabus operations for admin users." />
      <div className="page">
        {admin.error ? (
          <section className="panel">
            <h2>Admin access required</h2>
            <p className="panel-sub">Set your user role to admin in PostgreSQL to use this dashboard.</p>
          </section>
        ) : (
          <section className="grid stats-grid">
            <StatCard label="Users" value={String(admin.data?.users ?? 0)} hint="Registered learners" accent="blue" />
            <StatCard label="Sessions" value={String(admin.data?.sessions ?? 0)} hint="Study logs" accent="teal" />
            <StatCard label="Topics" value={String(admin.data?.topics ?? 0)} hint="Master and uploaded syllabus" accent="violet" />
            <StatCard label="Uploads" value={String(admin.data?.uploads ?? 0)} hint="Syllabus and notes files" accent="amber" />
          </section>
        )}
      </div>
    </>
  );
}
