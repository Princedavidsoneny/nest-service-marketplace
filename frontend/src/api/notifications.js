 import { getToken } from "../auth";

const API = (
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  "http://127.0.0.1:5000"
).replace(/\/+$/, "");

function authHeaders() {
  const token = getToken();

  const headers = {
    Accept: "application/json",
    "Content-Type": "application/json",
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
}

async function toJson(res) {
  const text = await res.text();

  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { message: text };
  }

  if (!res.ok) {
    throw new Error(data?.error || data?.message || "Request failed");
  }

  return data;
}

export async function fetchNotifications() {
  const res = await fetch(`${API}/notifications`, {
    headers: authHeaders(),
  });

  return toJson(res);
}

export async function fetchUnreadCount() {
  const res = await fetch(`${API}/notifications/unread-count`, {
    headers: authHeaders(),
  });

  return toJson(res);
}

export async function markNotificationRead(id) {
  const res = await fetch(`${API}/notifications/${id}/read`, {
    method: "PATCH",
    headers: authHeaders(),
  });

  return toJson(res);
}

export async function markAllRead() {
  const res = await fetch(`${API}/notifications/read-all`, {
    method: "PATCH",
    headers: authHeaders(),
  });

  return toJson(res);
}