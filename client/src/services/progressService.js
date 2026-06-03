import { api } from "./api";

/** @param {Record<string, string>} [params] query: subject, q, from, to */
export async function fetchProgress(params) {
  const { data } = await api.get("/progress", { params });
  return data.data;
}

export async function fetchAnalytics() {
  const { data } = await api.get("/analytics");
  return data.data;
}

export async function createProgress(payload) {
  const { data } = await api.post("/progress", payload);
  return data.data;
}

export async function updateProgress(id, payload) {
  const { data } = await api.put(`/progress/${id}`, payload);
  return data.data;
}

export async function deleteProgress(id) {
  await api.delete(`/progress/${id}`);
}
