import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Header } from "../components/layout/Header";
import { Spinner } from "../components/ui/Spinner";
import { StatCard } from "../components/ui/StatCard";
import { PdfUploadCard } from "../components/syllabus/PdfUploadCard";
import { SubjectPanel } from "../components/syllabus/SubjectPanel";
import { TopicChecklist } from "../components/syllabus/TopicChecklist";
import { TopicWorkspace } from "../components/syllabus/TopicWorkspace";
import {
  addRevision,
  fetchSubjects,
  saveTopicNotes,
  saveTopicProgress,
  saveTopicPyq,
  saveWeakTopic,
  uploadSyllabusPdf,
} from "../services/syllabusService";

function subjectTotals(subjects) {
  const totals = subjects.reduce(
    (acc, subject) => {
      acc.topics += subject.topic_count;
      acc.completed += subject.completed_topics;
      acc.pyqs += subject.pyq_solved;
      acc.weak += subject.weak_count;
      return acc;
    },
    { topics: 0, completed: 0, pyqs: 0, weak: 0 }
  );
  return {
    ...totals,
    completion:
      totals.topics === 0 ? 0 : Math.round((totals.completed / totals.topics) * 100),
  };
}

export function SubjectsPage() {
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedSubjectId, setSelectedSubjectId] = useState(null);
  const [selectedTopicId, setSelectedTopicId] = useState(null);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [difficulty, setDifficulty] = useState("all");

  const loadSubjects = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchSubjects();
      setSubjects(data);
      setSelectedSubjectId((current) => current || data[0]?.id || null);
      setSelectedTopicId((current) => current || data[0]?.topics?.[0]?.id || null);
    } catch (e) {
      toast.error(e?.response?.data?.message || "Failed to load syllabus");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSubjects();
  }, [loadSubjects]);

  const selectedSubject = useMemo(
    () => subjects.find((subject) => subject.id === selectedSubjectId) || subjects[0],
    [subjects, selectedSubjectId]
  );

  const filteredTopics = useMemo(() => {
    const term = q.trim().toLowerCase();
    return (selectedSubject?.topics || []).filter((topic) => {
      const matchesSearch = !term || topic.title.toLowerCase().includes(term);
      const matchesStatus =
        status === "all" ||
        (status === "completed" && topic.progress.completed) ||
        (status === "pending" && !topic.progress.completed) ||
        (status === "weak" &&
          (topic.weak.is_weak ||
            topic.weak.high_priority ||
            topic.progress.need_more_study));
      const matchesDifficulty =
        difficulty === "all" || topic.progress.difficulty_level === difficulty;
      return matchesSearch && matchesStatus && matchesDifficulty;
    });
  }, [selectedSubject, q, status, difficulty]);

  const selectedTopic = useMemo(() => {
    const topics = selectedSubject?.topics || [];
    return topics.find((topic) => topic.id === selectedTopicId) || topics[0];
  }, [selectedSubject, selectedTopicId]);

  useEffect(() => {
    if (!selectedSubject?.topics?.length) return;
    const topicStillVisible = selectedSubject.topics.some(
      (topic) => topic.id === selectedTopicId
    );
    if (!topicStillVisible) {
      setSelectedTopicId(selectedSubject.topics[0].id);
    }
  }, [selectedSubject, selectedTopicId]);

  const totals = useMemo(() => subjectTotals(subjects), [subjects]);

  const withSave = async (action, success) => {
    setSaving(true);
    try {
      await action();
      toast.success(success);
      await loadSubjects();
    } catch (e) {
      toast.error(e?.response?.data?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleCompleted = (topic, completed) => {
    withSave(
      () => saveTopicProgress(topic.id, { ...topic.progress, completed }),
      completed ? "Topic completed" : "Topic reopened"
    );
  };

  const handleUpload = async (file) => {
    setUploading(true);
    try {
      const result = await uploadSyllabusPdf(file);
      toast.success(`Imported ${result.parsed_subjects.length} subjects`);
      await loadSubjects();
    } catch (e) {
      toast.error(e?.response?.data?.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      <Header
        title="Syllabus"
        subtitle="Track every GATE CSE topic with progress, notes, PYQs, revision, and weak-topic signals."
      />
      <div className={`page ${loading ? "page-loading" : ""}`}>
        {loading ? (
          <div className="page-overlay">
            <Spinner label="Loading syllabus" />
          </div>
        ) : null}

        <section className="grid stats-grid">
          <StatCard label="Syllabus complete" value={`${totals.completion}%`} hint={`${totals.completed}/${totals.topics} topics`} accent="blue" />
          <StatCard label="PYQs solved" value={String(totals.pyqs)} hint="Across tracked topics" accent="teal" />
          <StatCard label="Weak signals" value={String(totals.weak)} hint="Hard, weak, priority, or revision" accent="amber" />
          <StatCard label="Subjects" value={String(subjects.length)} hint="Predefined and uploaded" accent="violet" />
        </section>

        <PdfUploadCard onUpload={handleUpload} uploading={uploading} />

        <section className="syllabus-shell">
          <SubjectPanel
            subjects={subjects}
            selectedId={selectedSubject?.id}
            onSelect={(id) => {
              const next = subjects.find((subject) => subject.id === id);
              setSelectedSubjectId(id);
              setSelectedTopicId(next?.topics?.[0]?.id || null);
            }}
          />

          <main className="panel syllabus-main">
            <div className="panel-head row-between">
              <div>
                <h2>{selectedSubject?.name || "Subjects"}</h2>
                <p className="panel-sub">
                  {selectedSubject?.completion_percentage || 0}% complete - {selectedSubject?.pyq_solved || 0} PYQs solved
                </p>
              </div>
              <span className="pill subtle">{selectedSubject?.source || "predefined"}</span>
            </div>

            <div className="filters syllabus-filters">
              <input
                className="input"
                placeholder="Search topics"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
              <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="all">All status</option>
                <option value="completed">Completed</option>
                <option value="pending">Pending</option>
                <option value="weak">Weak or priority</option>
              </select>
              <select
                className="input"
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
              >
                <option value="all">All difficulty</option>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>

            <TopicChecklist
              topics={filteredTopics}
              selectedTopicId={selectedTopic?.id}
              onSelect={setSelectedTopicId}
              onToggleCompleted={handleToggleCompleted}
            />
          </main>

          <TopicWorkspace
            topic={selectedTopic}
            saving={saving}
            onSaveProgress={(topicId, payload) =>
              withSave(() => saveTopicProgress(topicId, payload), "Progress saved")
            }
            onSavePyq={(topicId, payload) =>
              withSave(() => saveTopicPyq(topicId, payload), "PYQ tracker saved")
            }
            onSaveNotes={(topicId, payload) =>
              withSave(() => saveTopicNotes(topicId, payload), "Notes saved")
            }
            onSaveWeak={(topicId, payload) =>
              withSave(() => saveWeakTopic(topicId, payload), "Weak markers saved")
            }
            onAddRevision={(topicId, payload) =>
              withSave(() => addRevision(topicId, payload), "Revision added")
            }
          />
        </section>
      </div>
    </>
  );
}
