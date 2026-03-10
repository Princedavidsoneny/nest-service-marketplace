 // frontend/src/api.js
import axios from "axios";
import { getToken } from "./auth";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:5000",
});

api.interceptors.request.use((config) => {
  const token = getToken(); // reads localStorage "token"
  config.headers = config.headers || {}; // make sure headers exists

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export default api;