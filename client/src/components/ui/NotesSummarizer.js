import { useState, useRef } from "react";
import toast from "react-hot-toast";
import { extractNotesText, summarizeNotes } from "../../services/platformService";

export function NotesSummarizer() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      toast.error("Please select a PDF file first");
      return;
    }
    setLoading(true);
    setResult(null);

    try {
      // 1. Extract text
      const extracted = await extractNotesText(file);
      if (!extracted || !extracted.text) {
        throw new Error("Could not extract text from PDF");
      }

      // 2. Summarize
      const aiData = await summarizeNotes(extracted.text);
      setResult(aiData);
      toast.success("Notes summarized successfully!");
    } catch (e) {
      toast.error(e.response?.data?.message || e.message || "Failed to summarize notes");
    } finally {
      setLoading(false);
    }
  };

  return (
    <article className="panel">
      <div className="panel-head">
        <h2>AI Notes Summarizer</h2>
        <p className="panel-sub">Upload a PDF of your notes to generate a quick summary, flashcards, and revision points.</p>
      </div>
      
      <div className="upload-container" style={{ marginBottom: "1.5rem" }}>
        <input
          type="file"
          accept="application/pdf"
          onChange={handleFileChange}
          ref={fileInputRef}
          style={{ display: "none" }}
        />
        <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
          <button 
            className="btn btn-ghost" 
            onClick={() => fileInputRef.current?.click()}
            disabled={loading}
          >
            {file ? file.name : "Choose PDF"}
          </button>
          <button 
            className="btn btn-primary" 
            onClick={handleUpload}
            disabled={!file || loading}
          >
            {loading ? "Processing..." : "Summarize"}
          </button>
        </div>
      </div>

      {result && (
        <div className="ai-results" style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          <div className="result-section">
            <h3>Summary</h3>
            <p style={{ marginTop: "0.5rem", lineHeight: "1.6" }}>{result.summary}</p>
          </div>

          {result.revisionPoints && result.revisionPoints.length > 0 && (
            <div className="result-section">
              <h3>Quick Revision</h3>
              <ul style={{ paddingLeft: "1.2rem", marginTop: "0.5rem", lineHeight: "1.6" }}>
                {result.revisionPoints.map((point, i) => (
                  <li key={i}>{point}</li>
                ))}
              </ul>
            </div>
          )}

          {result.flashcards && result.flashcards.length > 0 && (
            <div className="result-section">
              <h3>Flashcards</h3>
              <div className="stack-list" style={{ marginTop: "0.5rem" }}>
                {result.flashcards.map((card, i) => (
                  <div className="stack-item" key={i} style={{ flexDirection: "column", alignItems: "flex-start", gap: "0.5rem" }}>
                    <div style={{ fontWeight: "bold", color: "var(--brand)" }}>Q: {card.front}</div>
                    <div>A: {card.back}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </article>
  );
}
