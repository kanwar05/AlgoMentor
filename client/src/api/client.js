import axios from "axios";

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
      localStorage.removeItem("algomentor_token");
      localStorage.removeItem("algomentor_user");
    }
    return Promise.reject(error);
  }
);
export default api;
