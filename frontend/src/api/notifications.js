 const API = import.meta.env.VITE_API_URL || "http://localhost:5000";

function authHeaders() {
  const token = localStorage.getItem("token");
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

export async function fetchNotifications() {
  const r = await fetch(`${API}/notifications`, {
    headers: authHeaders(),
  });
  if (!r.ok) throw new Error("Failed to load notifications");
  return r.json();
}

export async function fetchUnreadCount() {
  const r = await fetch(`${API}/notifications/unread-count`, {
    headers: authHeaders(),
  });
  if (!r.ok) throw new Error("Failed to load unread count");
  return r.json();
}

export async function markNotificationRead(id) {
  const r = await fetch(`${API}/notifications/${id}/read`, {
    method: "PATCH",
    headers: authHeaders(),
  });
  if (!r.ok) throw new Error("Failed to mark notification as read");
  return r.json();
}

export async function markAllRead() {
  const r = await fetch(`${API}/notifications/read-all`, {
    method: "PATCH",
    headers: authHeaders(),
  });
  if (!r.ok) throw new Error("Failed to mark all notifications as read");
  return r.json();
}