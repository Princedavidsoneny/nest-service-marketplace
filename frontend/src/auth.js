 const USER_KEY = "user";
const TOKEN_KEY = "token";

function safeParse(json) {
  try {
    if (!json || json === "undefined" || json === "null") return null;
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export function saveAuth(payload = {}) {
  const user = payload?.user || null;
  const token = payload?.token || null;

  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }

  if (user) {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(USER_KEY);
  }
}

export function getToken() {
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token || token === "undefined" || token === "null") return null;
  return token;
}

export function getUser() {
  return safeParse(localStorage.getItem(USER_KEY));
}

export function getRole() {
  return getUser()?.role || null;
}

export function isLoggedIn() {
  return !!getToken();
}

export function isProvider() {
  return getRole() === "provider";
}

export function isCustomer() {
  return getRole() === "customer";
}

export function isAdmin() {
  return getRole() === "admin";
}

export function clearAuth() {
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(TOKEN_KEY);
}

export function logout() {
  clearAuth();
}