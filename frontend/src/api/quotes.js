// frontend/src/api/quotes.js

const API = import.meta.env.VITE_API_URL || "http://127.0.0.1:5000";

function authHeaders() {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

// Fetch quotes for logged-in customer
export async function fetchMyQuotes() {
  const res = await fetch(`${API}/quotes/my`, {
    headers: authHeaders(),
  });

  if (res.status === 401) {
    throw new Error("Unauthorized (401) — Please login again.");
  }

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Failed to load quotes.");
  }

  return res.json();
}