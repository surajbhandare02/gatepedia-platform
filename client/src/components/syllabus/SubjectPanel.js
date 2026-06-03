export function SubjectPanel({ subjects, selectedId, onSelect }) {
  return (
    <aside className="syllabus-subjects">
      {subjects.map((subject) => (
        <button
          type="button"
          key={subject.id}
          className={`subject-row${subject.id === selectedId ? " is-active" : ""}`}
          onClick={() => onSelect(subject.id)}
        >
          <span>
            <strong>{subject.name}</strong>
            <small>
              {subject.completed_topics}/{subject.topic_count} topics
            </small>
          </span>
          <span className="subject-row-score">{subject.completion_percentage}%</span>
          <span className="mini-progress" aria-hidden>
            <span style={{ width: `${subject.completion_percentage}%` }} />
          </span>
        </button>
      ))}
    </aside>
  );
}
