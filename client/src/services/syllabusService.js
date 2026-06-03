import { api } from "./api";

export async function fetchSubjects(params) {
  const { data } = await api.get("/subjects", { params });
  return data.data;
}

export async function saveTopicProgress(topicId, payload) {
  const { data } = await api.put(`/topics/${topicId}/progress`, payload);
  return data.data;
}

export async function saveTopicPyq(topicId, payload) {
  const { data } = await api.put(`/topics/${topicId}/pyq`, payload);
  return data.data;
}

export async function saveTopicNotes(topicId, payload) {
  const { data } = await api.put(`/topics/${topicId}/notes`, payload);
  return data.data;
}

export async function saveWeakTopic(topicId, payload) {
  const { data } = await api.put(`/topics/${topicId}/weak-topic`, payload);
  return data.data;
}

export async function addRevision(topicId, payload) {
  const { data } = await api.post(`/topics/${topicId}/revisions`, payload);
  return data.data;
}

export async function uploadSyllabusPdf(file) {
  const formData = new FormData();
  formData.append("syllabus", file);
  const { data } = await api.post("/uploads/syllabus", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data.data;
}
