 import { getToken } from "./auth";

const API = (
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  "http://localhost:5000"
).replace(/\/+$/, "");

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
    const message = data?.error || data?.message || `Request failed (${res.status})`;

    if (
      res.status === 401 ||
      String(message).toLowerCase().includes("invalid token") ||
      String(message).toLowerCase().includes("missing token")
    ) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/login";
    }

    throw new Error(message);
  }

  return data;
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
  return request("/bookings/me", {
    headers: { ...authHeader() },
  });
}

export async function fetchProviderBookings() {
  return request("/bookings/provider", {
    headers: { ...authHeader() },
  });
}

export async function updateBookingStatus(id, status) {
  return request(`/bookings/${id}/status`, {
    method: "PATCH",
    headers: { ...authHeader() },
    body: JSON.stringify({ status }),
  });
}

 export async function confirmBookingCompleted(id) {
  return request(`/bookings/${id}/confirm-completed`, {
    method: "PATCH",
    headers: { ...authHeader() },
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
  return request("/quotes/my", {
    headers: { ...authHeader() },
  });
}

export async function fetchProviderQuotes() {
  return request("/provider/quotes", {
    headers: { ...authHeader() },
  });
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
  const id =
    typeof bookingId === "object"
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

export async function fetchProviderWallet() {
  return request("/wallet/me", {
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

export async function createDemandRequest(payload) {
  return request("/demands", {
    method: "POST",
    headers: { ...authHeader() },
    body: JSON.stringify(payload),
  });
}

export async function fetchMyDemandRequests() {
  return request("/demands/mine", {
    headers: { ...authHeader() },
  });
}

export async function fetchProviderDemandRequests() {
  return request("/demands/provider", {
    headers: { ...authHeader() },
  });
}

export async function createDemandOffer(demandId, payload) {
  return request(`/demands/${demandId}/offers`, {
    method: "POST",
    headers: { ...authHeader() },
    body: JSON.stringify(payload),
  });
}

export async function assignDemandProvider(demandId, providerId) {
  return request(`/demands/${demandId}/assign`, {
    method: "PATCH",
    headers: { ...authHeader() },
    body: JSON.stringify({ providerId }),
  });
}

export async function createWithdrawalRequest(payload) {
  return request("/withdrawals", {
    method: "POST",
    headers: { ...authHeader() },
    body: JSON.stringify(payload),
  });
}

export async function fetchMyWithdrawals() {
  return request("/withdrawals/mine", {
    headers: { ...authHeader() },
  });
}

export async function fetchAdminWithdrawals() {
  return request("/withdrawals/admin", {
    headers: { ...authHeader() },
  });
}

export async function approveWithdrawal(id) {
  return request(`/withdrawals/${id}/approve`, {
    method: "PATCH",
    headers: { ...authHeader() },
  });
}

export async function rejectWithdrawal(id) {
  return request(`/withdrawals/${id}/reject`, {
    method: "PATCH",
    headers: { ...authHeader() },
  });
}

 export async function fetchAdminUsers() {
  return request("/admin/users", {
    headers: { ...authHeader() },
  });
}

export async function updateAdminUserRole(userId, role) {
  return request(`/admin/users/${userId}/role`, {
    method: "PATCH",
    headers: { ...authHeader() },
    body: JSON.stringify({ role }),
  });
}

export async function suspendAdminUser(userId) {
  return request(`/admin/users/${userId}/suspend`, {
    method: "PATCH",
    headers: { ...authHeader() },
  });
}

export async function unsuspendAdminUser(userId) {
  return request(`/admin/users/${userId}/unsuspend`, {
    method: "PATCH",
    headers: { ...authHeader() },
  });
}