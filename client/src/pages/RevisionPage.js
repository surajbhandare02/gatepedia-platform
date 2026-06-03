import toast from "react-hot-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Header } from "../components/layout/Header";
import { Spinner } from "../components/ui/Spinner";
import { completeRevision, fetchRevisionCalendar, generateRevisionSchedule } from "../services/platformService";
import { NotesSummarizer } from "../components/ui/NotesSummarizer";
import { FlashcardReview } from "../components/productivity/FlashcardReview";

export function RevisionPage() {
  const queryClient = useQueryClient();
  const calendar = useQuery({ queryKey: ["revision-calendar"], queryFn: fetchRevisionCalendar });
  const generate = useMutation({
    mutationFn: generateRevisionSchedule,
    onSuccess: (data) => {
      toast.success(`Scheduled ${data.scheduled_count} revision items`);
      queryClient.invalidateQueries({ queryKey: ["revision-calendar"] });
    },
  });
  const complete = useMutation({
    mutationFn: (id) => completeRevision(id),
    onSuccess: () => {
      toast.success("Revision completed");
      queryClient.invalidateQueries({ queryKey: ["revision-calendar"] });
    },
  });

  return (
    <>
      <Header title="Revision Engine" subtitle="Spaced repetition calendar and smart revisit recommendations." />
      <div className={`page ${calendar.isLoading ? "page-loading" : ""}`}>
        {calendar.isLoading ? <div className="page-overlay"><Spinner label="Loading revision calendar" /></div> : null}

        <section className="panel action-panel">
          <div>
            <h2>Generate smart revision calendar</h2>
            <p className="panel-sub">Uses completed, hard, low-confidence, and need-more-study topics.</p>
          </div>
          <button className="btn btn-primary" onClick={() => generate.mutate()} disabled={generate.isPending}>
            {generate.isPending ? "Generating..." : "Generate calendar"}
          </button>
        </section>

        <section className="saas-grid">
          <article className="panel">
            <div className="panel-head">
              <h2>Due Now</h2>
              <p className="panel-sub">Complete these before starting new topics.</p>
            </div>
            <div className="stack-list">
              {(calendar.data?.due_today || []).map((item) => (
                <div className="stack-item" key={item.id}>
                  <span className="stack-index">{item.revision_stage}</span>
                  <div>
                    <strong>{item.title}</strong>
                    <p>{item.subject} - due {item.due_date}</p>
                  </div>
                  <button className="btn btn-sm btn-primary" onClick={() => complete.mutate(item.id)}>
                    Done
                  </button>
                </div>
              ))}
            </div>
          </article>

          <article className="panel">
            <div className="panel-head">
              <h2>Upcoming</h2>
              <p className="panel-sub">Next planned revision rounds.</p>
            </div>
            <div className="calendar-grid">
              {(calendar.data?.upcoming || []).slice(0, 24).map((item) => (
                <div className="calendar-tile" key={item.id}>
                  <span>{item.due_date.slice(5)}</span>
                  <strong>{item.title}</strong>
                  <small>{item.subject}</small>
                </div>
              ))}
            </div>
          </article>
        </section>

        <section className="saas-grid">
          <FlashcardReview />
          <NotesSummarizer />
        </section>
      </div>
    </>
  );
}
