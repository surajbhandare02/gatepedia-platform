import { EmptyState } from "../ui/EmptyState";

function topicTags(topic) {
  const tags = [];
  if (topic.progress.completed) tags.push("Done");
  if (topic.progress.need_more_study) tags.push("More study");
  if (topic.weak.is_weak || topic.weak.high_priority) tags.push("Priority");
  if (topic.pyq.solved_count > 0) tags.push(`${topic.pyq.solved_count} PYQs`);
  return tags;
}

export function TopicChecklist({
  topics,
  selectedTopicId,
  onSelect,
  onToggleCompleted,
}) {
  if (!topics.length) {
    return (
      <EmptyState
        title="No topics found"
        hint="Try a different search or filter."
      />
    );
  }

  return (
    <div className="topic-list">
      {topics.map((topic) => (
        <article
          key={topic.id}
          className={`topic-row${topic.id === selectedTopicId ? " is-active" : ""}`}
        >
          <label className="topic-check">
            <input
              type="checkbox"
              checked={topic.progress.completed}
              onChange={(e) => onToggleCompleted(topic, e.target.checked)}
            />
            <span />
          </label>
          <button type="button" className="topic-main" onClick={() => onSelect(topic.id)}>
            <span className="topic-title">{topic.title}</span>
            <span className="topic-meta">
              {topic.progress.study_hours}h studied - confidence {topic.progress.confidence_level}/5 - {topic.progress.difficulty_level}
            </span>
            <span className="topic-tags">
              {topicTags(topic).map((tag) => (
                <span className="pill subtle" key={tag}>
                  {tag}
                </span>
              ))}
            </span>
          </button>
        </article>
      ))}
    </div>
  );
}
