 const API =
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  "http://127.0.0.1:5000";

function authHeaders() {
  const token = localStorage.getItem("token");
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

async function toJson(res) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error || "Request failed");
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