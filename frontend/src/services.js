 import { getToken } from "./auth";

const API = (import.meta.env.VITE_API_URL || "http://127.0.0.1:5000").replace(/\/+$/, "");

function authHeader() {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function parseResponse(res) {
  const text = await res.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
}

async function request(path, options = {}) {
  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      Accept: "application/json",
      ...(options.body && !(options.body instanceof FormData)
        ? { "Content-Type": "application/json" }
        : {}),
      ...(options.headers || {}),
    },
  });

  const data = await parseResponse(res);

  if (!res.ok) {
    throw new Error(data?.error || data?.message || "Request failed");
  }

  return data;
}

async function requestWithFallback(paths, options = {}) {
  let lastError = null;
  for (const path of paths) {
    try {
      return await request(path, options);
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError || new Error("Request failed");
}

export async function registerUser(payload) {
  return request("/auth/register", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function loginUser(payload) {
  return request("/auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function fetchServices(params = {}) {
  const clean = {};

  for (const [key, value] of Object.entries(params || {})) {
    if (value == null) continue;

    if (typeof value === "string") {
      const trimmed = value.trim();
      if (!trimmed) continue;
      if (["all", "all categories", "any"].includes(trimmed.toLowerCase())) continue;
      clean[key] = trimmed;
    } else {
      clean[key] = value;
    }
  }

  const qs = new URLSearchParams(clean).toString();
  return request(qs ? `/services?${qs}` : "/services");
}

export async function fetchMyServices() {
  return request("/services/mine", {
    headers: { ...authHeader() },
  });
}

export async function createService(payload) {
  return request("/services", {
    method: "POST",
    headers: { ...authHeader() },
    body: JSON.stringify(payload),
  });
}

export async function createBooking(payload) {
  return request("/bookings", {
    method: "POST",
    headers: { ...authHeader() },
    body: JSON.stringify(payload),
  });
}

export async function fetchMyBookings() {
  return requestWithFallback(
    ["/bookings/me", "/bookings/my"],
    { headers: { ...authHeader() } }
  );
}

export async function fetchProviderBookings() {
  return requestWithFallback(
    ["/bookings/provider", "/provider/bookings"],
    { headers: { ...authHeader() } }
  );
}

export async function updateBookingsStatus(id, status) {
  return request(`/bookings/${id}/status`, {
    method: "PATCH",
    headers: { ...authHeader() },
    body: JSON.stringify({ status }),
  });
}

export async function createQuote(payload) {
  return request("/quotes", {
    method: "POST",
    headers: { ...authHeader() },
    body: JSON.stringify(payload),
  });
}

export async function fetchMyQuotes() {
  return requestWithFallback(
    ["/quotes/my", "/quotes/me"],
    { headers: { ...authHeader() } }
  );
}

export async function fetchProviderQuotes() {
  return requestWithFallback(
    ["/provider/quotes", "/quotes/provider"],
    { headers: { ...authHeader() } }
  );
}

export async function createQuoteOffer(quoteId, payload) {
  return request(`/quotes/${quoteId}/offer`, {
    method: "POST",
    headers: { ...authHeader() },
    body: JSON.stringify(payload),
  });
}

export async function acceptOffer(offerId) {
  return request(`/offers/${offerId}/accept`, {
    method: "POST",
    headers: { ...authHeader() },
  });
}

export async function initPayment(bookingId) {
  const id = typeof bookingId === "object"
    ? bookingId?.bookingId || bookingId?.id
    : bookingId;

  return request("/payments/init", {
    method: "POST",
    headers: { ...authHeader() },
    body: JSON.stringify({ bookingId: id }),
  });
}

export async function verifyPayment(reference) {
  return request(`/payments/verify/${reference}`, {
    headers: { ...authHeader() },
  });
}

export async function createReview(payload) {
  return request("/reviews", {
    method: "POST",
    headers: { ...authHeader() },
    body: JSON.stringify(payload),
  });
}

export async function fetchProviderReviews() {
  return request("/reviews/provider", {
    headers: { ...authHeader() },
  });
}

export async function fetchReviewForBooking(bookingId) {
  return request(`/bookings/${bookingId}/review`, {
    headers: { ...authHeader() },
  });
}

export async function fetchServiceReviews(serviceId) {
  return request(`/reviews/service/${serviceId}`);
}

export async function fetchServiceReviewSummary(serviceId) {
  return request(`/reviews/service/${serviceId}/summary`);
}

export async function fetchProviderProfile(providerId) {
  return request(`/providers/${providerId}`);
}

export async function fetchMyProviderProfile() {
  return request("/providers/me", {
    headers: { ...authHeader() },
  });
}

export async function updateMyProviderProfile(payload) {
  return request("/providers/me", {
    method: "PATCH",
    headers: { ...authHeader() },
    body: JSON.stringify(payload),
  });
}

export async function uploadProviderProfileImage(file) {
  const formData = new FormData();
  formData.append("image", file);

  return request("/upload/profile-image", {
    method: "POST",
    headers: { ...authHeader() },
    body: formData,
  });
}