import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { Header } from "../components/layout/Header";

import {
  fetchAssistantHistory,
  sendAssistantMessage,
} from "../services/platformService";

export function AssistantPage() {
  const queryClient = useQueryClient();

  const [message, setMessage] = useState("");

  const messagesEndRef = useRef(null);

  // ---------------- HISTORY QUERY ----------------
  const history = useQuery({
    queryKey: ["assistant-history"],
    queryFn: fetchAssistantHistory,
  });

  // ---------------- SEND MESSAGE ----------------
  const send = useMutation({
    mutationFn: sendAssistantMessage,

    onSuccess: () => {
      setMessage("");

      queryClient.invalidateQueries({
        queryKey: ["assistant-history"],
      });
    },

    onError: () => {
      toast.error("Failed to send message");
    },
  });

  // ---------------- AUTO SCROLL ----------------
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [history.data]);

  // ---------------- SUBMIT ----------------
  const handleSubmit = (e) => {
    e.preventDefault();

    if (!message.trim()) {
      toast.error("Please enter a message");
      return;
    }

    send.mutate(message.trim());
  };

  return (
    <>
      <Header
        title="AI Assistant"
        subtitle="Preparation assistant for plans, weak topics, revision, and PYQ strategy."
      />

      <div className="page">
        <section className="assistant-shell panel">
          {/* ---------------- CHAT THREAD ---------------- */}
          <div className="assistant-thread">
            {history.isLoading ? (
              <div className="assistant-empty">
                <p>Loading conversations...</p>
              </div>
            ) : history.isError ? (
              <div className="assistant-empty">
                <p>Failed to load messages</p>
              </div>
            ) : (history.data || []).length === 0 ? (
              <div className="assistant-empty">
                <h3>Start chatting</h3>

                <p>
                  Ask for study plans, revision
                  strategies, weak topics, PYQs,
                  coding help, or interview prep.
                </p>
              </div>
            ) : (
              (history.data || []).map(
                (item, index) => (
                  <div
                    className={`chat-row ${
                      item.role === "user"
                        ? "chat-user"
                        : "chat-ai"
                    }`}
                    key={`${
                      item.created_at || index
                    }`}
                  >
                    {/* Avatar */}
                    <div className="chat-avatar">
                      {item.role === "user"
                        ? "S"
                        : "AI"}
                    </div>

                    {/* Message Bubble */}
                    <div
                      className={`chat-bubble chat-${item.role}`}
                    >
                      <span className="chat-role">
                        {item.role === "user"
                          ? "You"
                          : "Assistant"}
                      </span>

                      <p>{item.content}</p>
                    </div>
                  </div>
                )
              )
            )}

            {/* Auto Scroll */}
            <div ref={messagesEndRef} />
          </div>

          {/* ---------------- INPUT ---------------- */}
          <form
            className="assistant-input"
            onSubmit={handleSubmit}
          >
            <input
              className="input"
              value={message}
              onChange={(e) =>
                setMessage(e.target.value)
              }
              placeholder="Ask for a study plan, weak topic, revision strategy..."
            />

            <button
              className="btn btn-primary"
              disabled={send.isPending}
            >
              {send.isPending
                ? "Sending..."
                : "Send"}
            </button>
          </form>
        </section>
      </div>
    </>
  );
}