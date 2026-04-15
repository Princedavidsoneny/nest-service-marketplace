import { getToken } from "../auth";

const API = (
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  "http://127.0.0.1:5000"
).replace(/\/+$/, "");

function authHeaders() {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
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

export async function fetchServiceImages(serviceId) {
  const res = await fetch(`${API}/services/${serviceId}/images`, {
    headers: {
      Accept: "application/json",
      ...authHeaders(),
    },
  });

  return toJson(res);
}

export async function uploadServiceImage(serviceId, file) {
  const formData = new FormData();
  formData.append("image", file);

  const res = await fetch(`${API}/services/${serviceId}/images`, {
    method: "POST",
    headers: {
      ...authHeaders(),
    },
    body: formData,
  });

  return toJson(res);
}

export async function deleteServiceImage(imageId) {
  const res = await fetch(`${API}/services/images/${imageId}`, {
    method: "DELETE",
    headers: {
      Accept: "application/json",
      ...authHeaders(),
    },
  });

  return toJson(res);
}