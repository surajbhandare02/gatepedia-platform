import { api } from "./api";

export async function registerAccount(payload) {
  const { data } = await api.post("/auth/register", payload);
  return data.data;
}

export async function loginAccount(payload) {
  const { data } = await api.post("/auth/login", payload);
  return data.data;
}

export async function fetchMe() {
  const { data } = await api.get("/auth/me");
  return data.data;
}
