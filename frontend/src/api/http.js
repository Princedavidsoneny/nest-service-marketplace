 // frontend/src/api/http.js

const API = import.meta.env.VITE_API_URL || "http://127.0.0.1:5000";

export function authHeaders() {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function apiGet(path) {
  const r = await fetch(`${API}${path}`, {
    method: "GET",
    headers: {
      ...authHeaders(),
      "Cache-Control": "no-cache",
      Pragma: "no-cache",
    },
    cache: "no-store",
  });

  // ✅ If server/browser returns 304, there's usually no body to parse
  if (r.status === 304) return [];

  if (!r.ok) {
    const text = await r.text().catch(() => "");
    throw new Error(`${r.status} ${r.statusText} ${text}`);
  }

  // ✅ Safe JSON parse
  const text = await r.text().catch(() => "");
  return text ? JSON.parse(text) : [];
}

export async function apiPost(path, body) {
  const r = await fetch(`${API}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
      "Cache-Control": "no-cache",
      Pragma: "no-cache",
    },
    cache: "no-store",
    body: JSON.stringify(body ?? {}),
  });

  if (!r.ok) {
    const text = await r.text().catch(() => "");
    throw new Error(`${r.status} ${r.statusText} ${text}`);
  }

  const text = await r.text().catch(() => "");
  return text ? JSON.parse(text) : {};
}