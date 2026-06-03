import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFocusSession, completeFocusSession } from "../../services/platformService";
import { CircularProgressbar } from "react-circular-progressbar";
import "react-circular-progressbar/dist/styles.css";

export function FocusTimer({ activeSession, focusSessions = [] }) {
  const queryClient = useQueryClient();
  const [focusMinutes, setFocusMinutes] = useState("25");
  const [timeLeft, setTimeLeft] = useState(0);

  const startMut = useMutation({
    mutationFn: createFocusSession,
    onSuccess: () => {
      toast.success("Focus session started");
      queryClient.invalidateQueries({ queryKey: ["productivity"] });
    },
    onError: () => toast.error("Failed to start session")
  });

  const completeMut = useMutation({
    mutationFn: (data) => completeFocusSession(data.id, { completed_cycles: data.cycles }),
    onSuccess: () => {
      toast.success("Focus session completed!");
      queryClient.invalidateQueries({ queryKey: ["productivity"] });
    },
    onError: () => toast.error("Failed to complete session")
  });

  useEffect(() => {
    if (activeSession) {
      const started = new Date(activeSession.started_at).getTime();
      const duration = activeSession.focus_minutes * 60 * 1000;
      const end = started + duration;
      
      const updateTimer = () => {
        const now = Date.now();
        const remaining = Math.max(0, Math.floor((end - now) / 1000));
        setTimeLeft(remaining);

        if (remaining === 0 && activeSession.status === "active") {
          // Auto complete if time is up and we haven't already
          if (!completeMut.isPending) {
             completeMut.mutate({ id: activeSession.id, cycles: 1 });
          }
        }
      };

      updateTimer();
      const interval = setInterval(updateTimer, 1000);
      return () => clearInterval(interval);
    }
  }, [activeSession, completeMut]);

  const handleStart = (e) => {
    e.preventDefault();
    const minutes = Number(focusMinutes);
    if (!minutes || minutes < 5) return toast.error("Minimum 5 minutes");
    if (activeSession) return toast.error("Session already active");

    startMut.mutate({
      focus_minutes: minutes,
      break_minutes: 5,
      cycles: 1,
      mode: "pomodoro"
    });
  };

  const handleStop = () => {
    if (!activeSession) return;
    completeMut.mutate({ id: activeSession.id, cycles: 0 }); // Cancelled
    toast("Session cancelled early", { icon: "🛑" });
  };

  const isRunning = !!activeSession && timeLeft > 0;
  const totalSeconds = activeSession ? activeSession.focus_minutes * 60 : 1;
  const progress = isRunning ? ((totalSeconds - timeLeft) / totalSeconds) * 100 : 0;
  
  const displayMins = Math.floor(timeLeft / 60).toString().padStart(2, "0");
  const displaySecs = (timeLeft % 60).toString().padStart(2, "0");

  return (
    <article className="panel">
      <div className="panel-head">
        <h2>Pomodoro Focus</h2>
        <p className="panel-sub">Track focused work blocks and build momentum.</p>
      </div>

      {!activeSession ? (
        <form className="inline-form" onSubmit={handleStart} style={{ marginBottom: "1.5rem" }}>
          <input
            className="input"
            type="number"
            min="5"
            value={focusMinutes}
            onChange={(e) => setFocusMinutes(e.target.value)}
          />
          <button className="btn btn-primary" disabled={startMut.isPending}>
            {startMut.isPending ? "Starting..." : "Start focus"}
          </button>
        </form>
      ) : (
        <div style={{ display: "flex", gap: "2rem", alignItems: "center", marginBottom: "1.5rem" }}>
          <div style={{ width: "100px", height: "100px" }}>
             <CircularProgressbar
               value={progress}
               text={`${displayMins}:${displaySecs}`}
               styles={{
                 path: { stroke: "var(--brand)" },
                 trail: { stroke: "var(--bg-elevated)" },
                 text: { fill: "var(--text)", fontSize: "24px", fontWeight: "bold" }
               }}
             />
          </div>
          <div>
            <h3>Focus Time!</h3>
            <p className="muted small" style={{ marginBottom: "1rem" }}>Stay away from distractions.</p>
            <button className="btn" onClick={handleStop} disabled={completeMut.isPending} style={{ background: "var(--error)", color: "#fff", border: "none" }}>
              Stop Early
            </button>
          </div>
        </div>
      )}

      <div className="stack-list">
        {focusSessions.slice(0, 5).map((session) => (
          <div className="compact-row" key={session.id}>
            <span>{session.mode} - {session.focus_minutes}m</span>
            <span className={`pill subtle ${session.status === "active" ? "active-pill" : ""}`}>
              {session.status}
            </span>
          </div>
        ))}
      </div>
    </article>
  );
}
