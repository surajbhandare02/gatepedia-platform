import React, { useState } from "react";
import toast from "react-hot-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchDueFlashcards, reviewFlashcard, createFlashcard } from "../../services/platformService";
import { useSubjects } from "../../hooks/useSyllabus";

export function FlashcardReview() {
  const queryClient = useQueryClient();
  const { data: flashcards = [], isLoading } = useQuery({
    queryKey: ["flashcards", "due"],
    queryFn: fetchDueFlashcards
  });
  
  const { data: subjects = [] } = useSubjects();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [showForm, setShowForm] = useState(false);
  
  const [front, setFront] = useState("");
  const [back, setBack] = useState("");
  const [topicId, setTopicId] = useState("");

  const reviewMut = useMutation({
    mutationFn: ({ id, difficulty }) => reviewFlashcard(id, difficulty),
    onSuccess: () => {
      setFlipped(false);
      setCurrentIndex(prev => prev + 1);
      toast.success("Reviewed!");
      if (currentIndex === flashcards.length - 1) {
        queryClient.invalidateQueries({ queryKey: ["flashcards", "due"] });
      }
    }
  });

  const createMut = useMutation({
    mutationFn: createFlashcard,
    onSuccess: () => {
      toast.success("Flashcard added");
      setFront("");
      setBack("");
      setShowForm(false);
      queryClient.invalidateQueries({ queryKey: ["flashcards", "due"] });
    },
    onError: () => toast.error("Failed to add flashcard")
  });

  const handleCreate = (e) => {
    e.preventDefault();
    if (!front || !back) return toast.error("Front and Back required");
    createMut.mutate({ front, back, topic_id: topicId || null });
  };

  const handleReview = (difficulty) => {
    if (!flashcards[currentIndex]) return;
    reviewMut.mutate({ id: flashcards[currentIndex].id, difficulty });
  };

  return (
    <article className="panel">
      <div className="panel-head" style={{ display: 'flex', justifyContent: 'space-between' }}>
        <div>
          <h2>Smart Flashcards</h2>
          <p className="panel-sub">Spaced repetition memory training.</p>
        </div>
        <button className="btn" onClick={() => setShowForm(!showForm)}>
          {showForm ? "Close Form" : "Add Flashcard"}
        </button>
      </div>

      {showForm && (
        <form className="inline-form" onSubmit={handleCreate} style={{ marginBottom: "1.5rem", display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <select className="input" value={topicId} onChange={e => setTopicId(e.target.value)}>
            <option value="">Select Subject/Topic (Optional)</option>
            {subjects.map(s => (
              <optgroup label={s.name} key={s.id}>
                {s.topics?.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
              </optgroup>
            ))}
          </select>
          <input className="input" placeholder="Front (Question)" value={front} onChange={e => setFront(e.target.value)} />
          <textarea className="input" placeholder="Back (Answer)" value={back} onChange={e => setBack(e.target.value)} />
          <button className="btn btn-primary" disabled={createMut.isPending}>Add</button>
        </form>
      )}

      {isLoading ? (
        <p>Loading flashcards...</p>
      ) : currentIndex >= flashcards.length ? (
        <div style={{ padding: "2rem", textAlign: "center", background: "var(--bg-elevated)", borderRadius: "8px" }}>
          <h3>All caught up! 🎉</h3>
          <p className="muted">No more due flashcards for today.</p>
        </div>
      ) : (
        <div className="flashcard-container" style={{ padding: "1.5rem", background: "var(--bg-elevated)", borderRadius: "8px", minHeight: "200px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <div style={{ textAlign: "center", margin: "auto 0" }}>
            <p style={{ fontSize: "0.8rem", color: "var(--brand)" }}>Card {currentIndex + 1} of {flashcards.length}</p>
            <h3 style={{ fontSize: "1.5rem", marginBottom: "1rem" }}>{flashcards[currentIndex].front}</h3>
            {flipped && (
              <div style={{ padding: "1rem", borderTop: "1px solid var(--border)", marginTop: "1rem" }}>
                <p style={{ fontSize: "1.2rem", color: "var(--text)" }}>{flashcards[currentIndex].back}</p>
              </div>
            )}
          </div>
          
          <div style={{ display: "flex", justifyContent: "center", gap: "1rem", marginTop: "1.5rem" }}>
            {!flipped ? (
              <button className="btn btn-primary" onClick={() => setFlipped(true)}>Show Answer</button>
            ) : (
              <>
                <button className="btn" style={{ background: "var(--error)", color: "white" }} onClick={() => handleReview("hard")}>Hard (1d)</button>
                <button className="btn" style={{ background: "var(--amber)", color: "white" }} onClick={() => handleReview("medium")}>Good (3d)</button>
                <button className="btn" style={{ background: "var(--teal)", color: "white" }} onClick={() => handleReview("easy")}>Easy (7d)</button>
              </>
            )}
          </div>
        </div>
      )}
    </article>
  );
}
