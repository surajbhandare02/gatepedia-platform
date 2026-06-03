import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { GATE_SUBJECTS } from "../../constants/subjects";

const initial = {
  subject: "",
  topic: "",
  study_hours: "",
  study_date: "",
};

function validate(values) {
  const errors = {};
  if (!values.subject) errors.subject = "Pick a subject";
  if (!values.topic || values.topic.trim().length < 2) {
    errors.topic = "Topic should be at least 2 characters";
  }
  const h = Number(values.study_hours);
  if (!Number.isFinite(h) || h <= 0) {
    errors.study_hours = "Enter a positive number of hours";
  }
  if (!values.study_date) errors.study_date = "Pick a date";
  return errors;
}

/**
 * Add / edit study session — keeps validation in one place for clarity.
 */
export function ProgressForm({
  editingId,
  initialValues,
  onCancelEdit,
  onSaved,
  disabled,
  subjects = GATE_SUBJECTS,
}) {
  const [values, setValues] = useState(initial);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (editingId && initialValues) {
      setValues({
        subject: initialValues.subject || "",
        topic: initialValues.topic || "",
        study_hours: String(initialValues.study_hours ?? ""),
        study_date: initialValues.study_date || "",
      });
    } else if (!editingId) {
      setValues(initial);
    }
    setErrors({});
  }, [editingId, initialValues]);

  const set = (key) => (e) => {
    setValues((v) => ({ ...v, [key]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const v = validate(values);
    setErrors(v);
    if (Object.keys(v).length) {
      toast.error("Fix the highlighted fields");
      return;
    }

    const payload = {
      subject: values.subject,
      topic: values.topic.trim(),
      study_hours: Number(values.study_hours),
      study_date: values.study_date,
    };

    try {
      await onSaved(payload, editingId);
      if (!editingId) setValues(initial);
      setErrors({});
    } catch {
      /* toast handled upstream */
    }
  };

  return (
    <form className="panel form-panel" onSubmit={handleSubmit} noValidate>
      <div className="panel-head">
        <h2>{editingId ? "Edit session" : "Log a session"}</h2>
        <p className="panel-sub">
          Small, consistent entries beat occasional marathons.
        </p>
      </div>

      <div className="form-grid">
        <label className="field">
          <span className="field-label">Subject</span>
          <select
            className={`input${errors.subject ? " input-error" : ""}`}
            value={values.subject}
            onChange={set("subject")}
            disabled={disabled}
          >
            <option value="">Select subject</option>
            {subjects.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          {errors.subject ? <span className="field-error">{errors.subject}</span> : null}
        </label>

        <label className="field field-span-2">
          <span className="field-label">Topic</span>
          <input
            className={`input${errors.topic ? " input-error" : ""}`}
            placeholder="e.g. B+ trees indexing"
            value={values.topic}
            onChange={set("topic")}
            disabled={disabled}
          />
          {errors.topic ? <span className="field-error">{errors.topic}</span> : null}
        </label>

        <label className="field">
          <span className="field-label">Hours</span>
          <input
            type="number"
            min="0"
            step=".50"
            className={`input${errors.study_hours ? " input-error" : ""}`}
            placeholder="1"
            value={values.study_hours}
            onChange={set("study_hours")}
            disabled={disabled}
          />
          {errors.study_hours ? (
            <span className="field-error">{errors.study_hours}</span>
          ) : null}
        </label>

        <label className="field">
          <span className="field-label">Date</span>
          <input
            type="date"
            className={`input${errors.study_date ? " input-error" : ""}`}
            value={values.study_date}
            onChange={set("study_date")}
            disabled={disabled}
          />
          {errors.study_date ? (
            <span className="field-error">{errors.study_date}</span>
          ) : null}
        </label>
      </div>

      <div className="form-actions">
        {editingId ? (
          <button type="button" className="btn btn-ghost" onClick={onCancelEdit} disabled={disabled}>
            Cancel edit
          </button>
        ) : null}
        <button type="submit" className="btn btn-primary" disabled={disabled}>
          {editingId ? "Save changes" : "Add session"}
        </button>
      </div>
    </form>
  );
}
