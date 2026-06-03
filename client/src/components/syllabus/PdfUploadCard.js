import { useRef, useState } from "react";

export function PdfUploadCard({ onUpload, uploading }) {
  const inputRef = useRef(null);
  const [fileName, setFileName] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    const file = inputRef.current?.files?.[0];
    if (!file) return;
    await onUpload(file);
    setFileName("");
    e.currentTarget.reset();
  };

  return (
    <form className="panel upload-panel" onSubmit={submit}>
      <div>
        <h2>Upload syllabus PDF</h2>
        <p className="panel-sub">
          The API extracts text, detects subjects and topics, and stores them for this account.
        </p>
      </div>
      <div className="upload-actions">
        <label className="file-picker">
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf"
            onChange={(e) => setFileName(e.target.files?.[0]?.name || "")}
          />
          <span>{fileName || "Choose PDF"}</span>
        </label>
        <button type="submit" className="btn btn-primary" disabled={uploading || !fileName}>
          {uploading ? "Uploading..." : "Import"}
        </button>
      </div>
    </form>
  );
}
