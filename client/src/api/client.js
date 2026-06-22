import axios from "axios";

const unauthorizedListeners = new Set();

export function subscribeToUnauthorized(listener) {
  unauthorizedListeners.add(listener);
  return () => unauthorizedListeners.delete(listener);
}

export function clearStoredAuth() {
  localStorage.removeItem("algomentor_token");
  localStorage.removeItem("algomentor_user");
  localStorage.removeItem("algomentor_demo");
}

function notifyUnauthorized() {
  unauthorizedListeners.forEach((listener) => {
    try {
      listener();
    } catch {
      // One failed listener must not prevent the request from rejecting normally.
    }
  });
}

const defaultApiUrl = import.meta.env.DEV ? "http://localhost:5002/api" : "/api";
const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || defaultApiUrl });
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("algomentor_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      clearStoredAuth();
      notifyUnauthorized();
    }
    return Promise.reject(error);
  }
);
export default api;
