import { api } from "./api";

export async function fetchPlanner() {
  const { data } = await api.get("/planner");
  return data.data;
}

export async function fetchPerformanceInsights() {
  const { data } = await api.get("/insights/performance");
  return data.data;
}

export async function fetchPyqAnalyzer() {
  const { data } = await api.get("/insights/pyq");
  return data.data;
}

export async function fetchRevisionCalendar() {
  const { data } = await api.get("/revision/calendar");
  return data.data;
}

export async function generateRevisionSchedule() {
  const { data } = await api.post("/revision/generate");
  return data.data;
}

export async function completeRevision(id, payload = {}) {
  const { data } = await api.put(`/revision/${id}/complete`, payload);
  return data.data;
}

export async function fetchProductivity() {
  const { data } = await api.get("/productivity");
  return data.data;
}

export async function createGoal(payload) {
  const { data } = await api.post("/goals", payload);
  return data.data;
}

export async function updateGoal(id, payload) {
  const { data } = await api.put(`/goals/${id}`, payload);
  return data.data;
}

export async function createFocusSession(payload) {
  const { data } = await api.post("/focus-sessions", payload);
  return data.data;
}

export async function completeFocusSession(id, payload) {
  const { data } = await api.put(`/focus-sessions/${id}/complete`, payload);
  return data.data;
}

export async function fetchProfile() {
  const { data } = await api.get("/profile");
  return data.data;
}

export async function updateProfile(payload) {
  const { data } = await api.put("/profile", payload);
  return data.data;
}

export async function fetchNotifications() {
  const { data } = await api.get("/notifications");
  return data.data;
}

export async function markNotificationRead(id) {
  const { data } = await api.put(`/notifications/${id}/read`);
  return data.data;
}

export async function fetchAssistantHistory() {
  const { data } = await api.get("/assistant/history");
  return data.data;
}

export async function sendAssistantMessage(message) {
  const { data } = await api.post("/assistant/chat", { message });
  return data.data;
}

export async function fetchAdminOverview() {
  const { data } = await api.get("/admin/overview");
  return data.data;
}

export async function extractNotesText(file) {
  const formData = new FormData();
  formData.append("notes", file);
  const { data } = await api.post("/uploads/notes-text", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data.data;
}

export async function summarizeNotes(text) {
  const { data } = await api.post("/ai/notes/summarize", { text });
  return data.data;
}

export async function createFlashcard(payload) {
  const { data } = await api.post("/flashcards", payload);
  return data.data;
}

export async function fetchFlashcards(topicId) {
  const { data } = await api.get("/flashcards", { params: { topic_id: topicId } });
  return data.data;
}

export async function fetchDueFlashcards() {
  const { data } = await api.get("/flashcards/due");
  return data.data;
}

export async function reviewFlashcard(id, difficulty) {
  const { data } = await api.put(`/flashcards/${id}/review`, { difficulty });
  return data.data;
}

export async function deleteFlashcard(id) {
  const { data } = await api.delete(`/flashcards/${id}`);
  return data.data;
}
