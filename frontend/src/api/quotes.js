 const API = import.meta.env.VITE_API_URL || "http://127.0.0.1:5000";

function authHeaders() {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

export async function fetchMyQuotes() {
  const res = await fetch(`${API}/quotes/my`, {
    headers: authHeaders(),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Failed to load quotes");
  }

  return res.json();
}

export async function fetchProviderQuotes() {
  const res = await fetch(`${API}/quotes/provider`, {
    headers: authHeaders(),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Failed to load provider quotes");
  }

  return res.json();
}

export async function sendQuoteOffer(quoteId, payload) {
  const res = await fetch(`${API}/quotes/${quoteId}/offer`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Failed to send offer");
  }

  return res.json();
}

export async function acceptOffer(offerId) {
  const res = await fetch(`${API}/quotes/offers/${offerId}/accept`, {
    method: "PATCH",
    headers: authHeaders(),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Failed to accept offer");
  }

  return res.json();
}