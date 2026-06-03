import axios from "axios";

export const AUTH_TOKEN_KEY = "gate-auth-token";

/**
 * One axios instance keeps timeouts and base URL in one place (DRY).
 * Set REACT_APP_API_URL in `.env` for production builds.
 */
const baseURL =
  process.env.REACT_APP_API_URL?.replace(/\/$/, "") ||
  (process.env.NODE_ENV === "production"
    ? "https://gatepedia-api.onrender.com/api"
    : "http://localhost:5000/api");

export const api = axios.create({
  baseURL,
  timeout: 20000,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      window.dispatchEvent(new Event("gate-auth-expired"));
    }
    return Promise.reject(error);
  }
);
