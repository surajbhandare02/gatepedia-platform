import { useEffect, useState } from "react";

const today = () => new Date().toISOString().slice(0, 10);

export function TopicWorkspace({
  topic,
  onSaveProgress,
  onSavePyq,
  onSaveNotes,
  onSaveWeak,
  onAddRevision,
  saving,
}) {
  const [progress, setProgress] = useState(null);
  const [pyq, setPyq] = useState(null);
  const [notes, setNotes] = useState(null);
  const [weak, setWeak] = useState(null);
  const [revision, setRevision] = useState({
    revision_date: today(),
    hours: "",
    notes: "",
  });

  useEffect(() => {
    if (!topic) return;
    setProgress({ ...topic.progress });
    setPyq({ ...topic.pyq });
    setNotes({ ...topic.notes });
    setWeak({ ...topic.weak });
    setRevision({ revision_date: today(), hours: "", notes: "" });
  }, [topic]);

  if (!topic || !progress || !pyq || !notes || !weak) {
    return (
      <section className="panel topic-workspace empty-workspace">
        <h2>Select a topic</h2>
        <p className="panel-sub">Topic progress, notes, PYQ stats, and weak markers appear here.</p>
      </section>
    );
  }

  const setProgressValue = (key) => (e) => {
    const value =
      e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setProgress((current) => ({ ...current, [key]: value }));
  };

  const setPyqValue = (key) => (e) => {
    setPyq((current) => ({ ...current, [key]: e.target.value }));
  };

  const setNotesValue = (key) => (e) => {
    setNotes((current) => ({ ...current, [key]: e.target.value }));
  };

  const setWeakValue = (key) => (e) => {
    const value =
      e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setWeak((current) => ({ ...current, [key]: value }));
  };

  const setRevisionValue = (key) => (e) => {
    setRevision((current) => ({ ...current, [key]: e.target.value }));
  };

  return (
    <section className="panel topic-workspace">
      <div className="workspace-head">
        <div>
          <h2>{topic.title}</h2>
          <p className="panel-sub">Topic-level control center</p>
        </div>
        <span className={`difficulty-badge difficulty-${progress.difficulty_level}`}>
          {progress.difficulty_level}
        </span>
      </div>

      <form
        className="workspace-section"
        onSubmit={(e) => {
          e.preventDefault();
          onSaveProgress(topic.id, progress);
        }}
      >
        <div className="section-title">Progress</div>
        <div className="workspace-grid">
          <label className="checkline">
            <input
              type="checkbox"
              checked={progress.completed}
              onChange={setProgressValue("completed")}
            />
            Completed
          </label>
          <label className="field">
            <span className="field-label">Study hours</span>
            <input
              className="input"
              type="number"
              min="0"
              step=".5"
              value={progress.study_hours}
              onChange={setProgressValue("study_hours")}
            />
          </label>
          <label className="field">
            <span className="field-label">Revision count</span>
            <input
              className="input"
              type="number"
              min="0"
              value={progress.revision_count}
              onChange={setProgressValue("revision_count")}
            />
          </label>
          <label className="field">
            <span className="field-label">Difficulty</span>
            <select
              className="input"
              value={progress.difficulty_level}
              onChange={setProgressValue("difficulty_level")}
            >
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </label>
          <label className="field field-span-2">
            <span className="field-label">Confidence: {progress.confidence_level}/5</span>
            <input
              type="range"
              min="1"
              max="5"
              value={progress.confidence_level}
              onChange={setProgressValue("confidence_level")}
            />
          </label>
          <label className="checkline">
            <input
              type="checkbox"
              checked={progress.need_more_study}
              onChange={setProgressValue("need_more_study")}
            />
            Needs more study
          </label>
        </div>
        <button className="btn btn-primary" type="submit" disabled={saving}>
          Save progress
        </button>
      </form>

      <form
        className="workspace-section"
        onSubmit={(e) => {
          e.preventDefault();
          onSavePyq(topic.id, pyq);
        }}
      >
        <div className="section-title">PYQ Tracker</div>
        <div className="workspace-grid">
          {[
            ["solved_count", "Solved"],
            ["easy_count", "Easy"],
            ["medium_count", "Medium"],
            ["hard_count", "Hard"],
            ["attempted_count", "Attempted"],
            ["correct_count", "Correct"],
          ].map(([key, label]) => (
            <label className="field" key={key}>
              <span className="field-label">{label}</span>
              <input
                className="input"
                type="number"
                min="0"
                value={pyq[key]}
                onChange={setPyqValue(key)}
              />
            </label>
          ))}
          <label className="field field-span-2">
            <span className="field-label">Year-wise notes</span>
            <textarea
              className="input textarea"
              value={pyq.year_wise_notes}
              onChange={setPyqValue("year_wise_notes")}
              placeholder="2024: 2 graph questions, 2023: normalization pattern..."
            />
          </label>
        </div>
        <button className="btn btn-primary" type="submit" disabled={saving}>
          Save PYQs
        </button>
      </form>

      <form
        className="workspace-section"
        onSubmit={(e) => {
          e.preventDefault();
          onSaveNotes(topic.id, notes);
        }}
      >
        <div className="section-title">Notes</div>
        <div className="notes-grid">
          <label className="field">
            <span className="field-label">Personal notes</span>
            <textarea
              className="input textarea"
              value={notes.personal}
              onChange={setNotesValue("personal")}
            />
          </label>
          <label className="field">
            <span className="field-label">Important formulas</span>
            <textarea
              className="input textarea"
              value={notes.formulas}
              onChange={setNotesValue("formulas")}
            />
          </label>
          <label className="field">
            <span className="field-label">Revision notes</span>
            <textarea
              className="input textarea"
              value={notes.revision}
              onChange={setNotesValue("revision")}
            />
          </label>
        </div>
        <button className="btn btn-primary" type="submit" disabled={saving}>
          Save notes
        </button>
      </form>

      <form
        className="workspace-section"
        onSubmit={(e) => {
          e.preventDefault();
          onSaveWeak(topic.id, weak);
        }}
      >
        <div className="section-title">Weak Topic Signals</div>
        <div className="weak-grid">
          {[
            ["is_hard", "Hard topic"],
            ["is_weak", "Weak topic"],
            ["needs_revision", "Needs revision"],
            ["high_priority", "High priority"],
          ].map(([key, label]) => (
            <label className="checkline" key={key}>
              <input
                type="checkbox"
                checked={weak[key]}
                onChange={setWeakValue(key)}
              />
              {label}
            </label>
          ))}
        </div>
        <label className="field">
          <span className="field-label">Reason</span>
          <textarea
            className="input textarea"
            value={weak.reason}
            onChange={setWeakValue("reason")}
          />
        </label>
        <button className="btn btn-primary" type="submit" disabled={saving}>
          Save markers
        </button>
      </form>

      <form
        className="workspace-section"
        onSubmit={(e) => {
          e.preventDefault();
          onAddRevision(topic.id, revision);
        }}
      >
        <div className="section-title">Add Revision</div>
        <div className="workspace-grid">
          <label className="field">
            <span className="field-label">Date</span>
            <input
              className="input"
              type="date"
              value={revision.revision_date}
              onChange={setRevisionValue("revision_date")}
            />
          </label>
          <label className="field">
            <span className="field-label">Hours</span>
            <input
              className="input"
              type="number"
              min="0"
              step=".5"
              value={revision.hours}
              onChange={setRevisionValue("hours")}
            />
          </label>
          <label className="field field-span-2">
            <span className="field-label">Revision note</span>
            <textarea
              className="input textarea"
              value={revision.notes}
              onChange={setRevisionValue("notes")}
            />
          </label>
        </div>
        <button className="btn btn-primary" type="submit" disabled={saving}>
          Add revision
        </button>
      </form>
    </section>
  );
}
