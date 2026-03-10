 // frontend/src/services.js

import { getToken } from "./auth";

 const API = import.meta.env.VITE_API_URL || "http://127.0.0.1:5000";

function authHeader() {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request(path, options = {}) {
  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(options.headers || {}),
    },
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || "Request failed");
  return data;
}

// =====================
// AUTH
// =====================
export function getApiBase() {
  return API;
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

// =====================
// SERVICES
// =====================

// PUBLIC: SERVICES (search/list)
export async function fetchServices(params = {}) {
  const clean = {};

  for (const [k, v] of Object.entries(params || {})) {
    if (v === undefined || v === null) continue;

    if (typeof v === "string") {
      const t = v.trim();
      if (!t) continue;
      if (t.toLowerCase() === "undefined") continue;
      if (t.toLowerCase() === "all" || t.toLowerCase() === "all categories") continue;
      clean[k] = t;
      continue;
    }

    clean[k] = v;
  }

  const qs = new URLSearchParams(clean).toString();
  return request(qs ? `/services?${qs}` : "/services");
}

// PROVIDER: list my services
 export async function fetchMyServices() {
  return request("/services/mine", {
    headers: { ...authHeader() },
  });
}

// PROVIDER: create service
export async function createService(payload) {
  return request("/services", {
    method: "POST",
    headers: { ...authHeader() },
    body: JSON.stringify(payload),
  });
}

// =====================
// BOOKINGS
// =====================

export async function createBooking(payload) {
  return request("/bookings", {
    method: "POST",
    headers: { ...authHeader() },
    body: JSON.stringify(payload),
  });
}

export async function fetchMyBookings() {
  return request("/bookings/me", {
    headers: { ...authHeader() },
  });
}

export async function fetchProviderBookings() {
  return request("/bookings/provider", {
    headers: { ...authHeader() },
  });
}

 export async function updateBookingsStatus(id, status) {
  return request(`/bookings/${id}/status`, {
    method: "PATCH",
    headers: { ...authHeader(), "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
}

// =====================
// QUOTES
// =====================

// CUSTOMER: create quote
export async function createQuote(payload) {
  return request("/quotes", {
    method: "POST",
    headers: { ...authHeader() },
    body: JSON.stringify(payload),
  });
}

// CUSTOMER: list my quotes
export async function fetchMyQuotes() {
  return request("/quotes/my", {
    headers: { ...authHeader() },
  });
}

// PROVIDER: list quotes sent to me
export async function fetchProviderQuotes() {
  return request("/provider/quotes", {
    headers: { ...authHeader() },
  });
}

// PROVIDER: send offer
export async function createQuoteOffer(quoteId, payload) {
  return request(`/quotes/${quoteId}/offer`, {
    method: "POST",
    headers: { ...authHeader() },
    body: JSON.stringify(payload),
  });
}


   export async function initPayment(bookingId) {

  const id =
    typeof bookingId === "object"
      ? bookingId.bookingId || bookingId.id
      : bookingId;

  console.log("INIT PAYMENT ID =", id);

  return request("/payments/init", {
    method: "POST",
    headers: {
      ...authHeader(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      bookingId: Number(id),
    }),
  });
}

export async function verifyPayment(reference) {
  return request(`/payments/verify/${reference}`, {
    headers: {
      ...authHeader(),
    },
  });
}


// CUSTOMER: accept offer
export async function acceptOffer(offerId) {
  return request(`/offers/${offerId}/accept`, {
    method: "POST",
    headers: { ...authHeader() },
  });
}


 export async function createReview(payload) {
  return request("/reviews", {
    method: "POST",
    headers: { ...authHeader(), "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}


export async function fetchServiceReviews(serviceId) {
  return request(`/reviews/service/${serviceId}`);
}

export async function fetchServiceReviewSummary(serviceId) {
  return request(`/reviews/service/${serviceId}/summary`);
}